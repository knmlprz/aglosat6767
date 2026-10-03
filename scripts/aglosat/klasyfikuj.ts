// Klasyfikacja wycinków ortofotomapy modelem wizyjnym (Groq albo OpenRouter, API zgodne z OpenAI).
// Uruchomienie: npm run aglosat:klasyfikuj -- [--dostawca groq|openrouter] [--model ID] [--prompt 1|2]
//   --modele    lista modeli z obsługą obrazów dla klucza
//   --podglad   zapisuje wejście modelu dla 3 wycinków, bez API
//   --limit N   tylko pierwsze N wycinków (próba modelu)
//   --od-nowa   klasyfikuje wszystko jeszcze raz
// Klucze: GROQ_API_KEY / OPENROUTER_API_KEY w zmiennej środowiskowej albo w .env.local (nie trafia do repo).
// Wyniki: data/aglosat/klasyfikacje/<dostawca>__<model>__v<prompt>.json; demo działa bez klucza.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { ORTO } from "./config.ts";
import { KLASY_OBRAZU, PRZYPADKI, ZASADA } from "../../lib/aglosat/etykiety.ts";
import type { PilotZapisany } from "../../lib/aglosat/data.ts";
import type { KlasaObrazu, LatLon, Wycinek } from "../../lib/aglosat/types.ts";

const DOSTAWCY = {
  groq: { api: "https://api.groq.com/openai/v1", klucz: "GROQ_API_KEY", model: "qwen/qwen3.8-27b", przerwaMs: 2500, rownolegle: 1 },
  openrouter: { api: "https://openrouter.ai/api/v1", klucz: "OPENROUTER_API_KEY", model: "", przerwaMs: 0, rownolegle: 4 },
} as const;
type Dostawca = keyof typeof DOSTAWCY;

const arg = (nazwa: string) => {
  const i = process.argv.indexOf(nazwa);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DOSTAWCA = (arg("--dostawca") ?? "groq") as Dostawca;
if (!DOSTAWCY[DOSTAWCA]) throw new Error(`Nieznany dostawca: ${DOSTAWCA}`);
const D = DOSTAWCY[DOSTAWCA];
const MODEL = arg("--model") ?? D.model;
const WERSJA_PROMPTU = Number(arg("--prompt") ?? 2);
export const KATALOG = "data/aglosat/klasyfikacje";
export const plikWynikow = (dostawca: string, model: string, wersja: number) =>
  `${KATALOG}/${dostawca}__${model.replace(/[^\w.-]+/g, "-")}__v${wersja}.json`;

export type WynikModelu = { klasa: KlasaObrazu; ocena: number; uzasadnienie: string };
export type PlikKlasyfikacji = {
  dostawca?: string;
  model: string;
  wersjaPromptu: number;
  data: string;
  wyniki: Record<string, WynikModelu>;
};

function klucz(): string {
  const nazwa = D.klucz;
  if (process.env[nazwa]) return process.env[nazwa]!;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${nazwa}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
    if (m) return m[1].trim();
  }
  throw new Error(`Brak ${nazwa} (zmienna środowiskowa albo .env.local).`);
}

async function zapytaj(sciezka: string, body?: unknown): Promise<Response> {
  return fetch(`${D.api}${sciezka}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${klucz()}`,
      "Content-Type": "application/json",
      ...(DOSTAWCA === "openrouter" ? { "X-Title": "AgloSat (hackathon)" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const WSTEP = `You are reviewing an aerial orthophoto (north up, ${ORTO.rozmiarPx}x${ORTO.rozmiarPx} px).
A pedestrian path segment from OpenStreetMap is drawn on it as a dashed cyan line with a dark outline.`;
const FORMAT = `Answer with JSON only: {"klasa": "ciagly" | "przerwany" | "niewidoczny", "ocena": number from 0 to 1 (your confidence), "uzasadnienie": "one short sentence in Polish describing what you see along the line"}`;

/** Prompty zamrożone: tekst v1 jest dokładnie tym, który dał pierwszy przebieg. */
const PROMPTY: Record<number, string> = {
  1: `${WSTEP}
Judge ONLY the pedestrian surface along the drawn line, and choose exactly one class:
- "ciagly": Pas nawierzchni pieszej jest widoczny wzdłuż całej zaznaczonej linii, bez przerw.
- "przerwany": Na zaznaczonej linii widać przerwę w nawierzchni: trawę, ziemię, ogrodzenie, rozkop albo koniec chodnika.
- "niewidoczny": Większości przebiegu nie widać: zasłaniają go drzewa, cień albo dach budynku. Nie da się ocenić.
(The class definitions are in Polish: "ciagly" = continuous, "przerwany" = interrupted, "niewidoczny" = not visible.)
${FORMAT}`,
  // v2: zasada i tabela przypadków spornych uzgodnione w zespole, te same co w instrukcji dla ludzi.
  2: `${WSTEP}
Question: is there one uninterrupted walkable strip along the drawn line, without a permanent obstacle?
Rule (in Polish): ${ZASADA}
Choose exactly one class:
${KLASY_OBRAZU.map((k) => `- "${k.klasa}": ${k.definicja}`).join("\n")}
Agreed rules for difficult cases (case → class, reason):
${PRZYPADKI.map((p) => `- ${p.przypadek} → ${p.klasa === "zalezy" ? "zależy" : p.klasa}${p.dlaczego ? ` (${p.dlaczego})` : ""}`).join("\n")}
Important: an asphalt road or a pedestrian crossing along the line counts as continuous. Green colour may be tree crowns above a sidewalk, not a lawn; if you cannot tell, answer "niewidoczny".
(Classes: "ciagly" = continuous, "przerwany" = interrupted, "niewidoczny" = not visible.)
${FORMAT}`,
};
const PROMPT = PROMPTY[WERSJA_PROMPTU];
if (!PROMPT) throw new Error(`Nieznana wersja promptu: ${WERSJA_PROMPTU}`);

/** Wycinek z narysowanym przebiegiem odcinków (jak nakładka w interfejsie). */
async function obrazZPrzebiegiem(w: Wycinek, przebiegi: LatLon[][]): Promise<string> {
  const [s, zach, n, wsch] = w.bbox;
  const px = ORTO.rozmiarPx;
  const xy = ([lat, lon]: LatLon) => `${(((lon - zach) / (wsch - zach)) * px).toFixed(1)},${(((n - lat) / (n - s)) * px).toFixed(1)}`;
  const linie = przebiegi
    .map(
      (g) => `<polyline points="${g.map(xy).join(" ")}" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" opacity="0.75"/>
<polyline points="${g.map(xy).join(" ")}" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 8"/>`,
    )
    .join("\n");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">${linie}</svg>`);
  const jpg = await sharp(`public${w.plik}`).composite([{ input: svg }]).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

function sprawdzOdpowiedz(tekst: string): WynikModelu {
  const j = JSON.parse(tekst.slice(tekst.indexOf("{"), tekst.lastIndexOf("}") + 1)) as Partial<WynikModelu>;
  if (!KLASY_OBRAZU.some((k) => k.klasa === j.klasa)) throw new Error(`niepoprawna klasa: ${j.klasa}`);
  const ocena = Math.min(1, Math.max(0, Number(j.ocena)));
  if (!Number.isFinite(ocena)) throw new Error("brak oceny");
  return { klasa: j.klasa!, ocena: Math.round(ocena * 100) / 100, uzasadnienie: String(j.uzasadnienie ?? "").slice(0, 300) };
}

let trybJson = true;

async function klasyfikuj(obraz: string): Promise<WynikModelu> {
  for (let proba = 1; proba <= 4; proba++) {
    const res = await zapytaj("/chat/completions", {
      model: MODEL,
      temperature: 0,
      // Modele z rozumowaniem zużywają część limitu na myślenie, więc zapas jest większy.
      max_tokens: DOSTAWCA === "openrouter" ? 2000 : 300,
      ...(trybJson ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: obraz } }] }],
    });
    if (res.status === 400 && trybJson) {
      // Nie każdy model obsługuje tryb JSON; odpowiedź i tak sprawdzamy sami.
      trybJson = false;
      continue;
    }
    if (res.status === 429) {
      const czekaj = Number(res.headers.get("retry-after") ?? 10) * 1000;
      console.warn(`  limit zapytań, czekam ${Math.round(czekaj / 1000)} s`);
      await new Promise((r) => setTimeout(r, czekaj));
      continue;
    }
    if (!res.ok) throw new Error(`${DOSTAWCA} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const dane = (await res.json()) as { choices?: { message: { content: string | null } }[]; error?: { message: string } };
    if (!dane.choices?.[0]?.message.content) {
      console.warn(`  pusta odpowiedź (${dane.error?.message ?? "brak treści"}), próba ${proba}`);
      continue;
    }
    try {
      return sprawdzOdpowiedz(dane.choices[0].message.content!);
    } catch (e) {
      console.warn(`  niepoprawna odpowiedź (${String(e)}), próba ${proba}`);
    }
  }
  throw new Error("nie udało się uzyskać poprawnej odpowiedzi");
}

if (process.argv.includes("--modele")) {
  const res = await zapytaj("/models");
  if (!res.ok) throw new Error(`${DOSTAWCA} HTTP ${res.status}: ${await res.text()}`);
  const { data } = (await res.json()) as {
    data: { id: string; owned_by?: string; architecture?: { input_modalities?: string[] }; pricing?: { prompt?: string; completion?: string } }[];
  };
  // OpenRouter podaje modalności i ceny; Groq tylko identyfikatory.
  const obrazowe = DOSTAWCA === "openrouter" ? data.filter((m) => m.architecture?.input_modalities?.includes("image")) : data;
  const cena = (x?: string) => (x ? `$${(Number(x) * 1e6).toFixed(2)}/1M` : "");
  console.log(
    obrazowe
      .map((m) => `${m.id}  ${m.owned_by ?? ""} ${cena(m.pricing?.prompt)} ${cena(m.pricing?.completion)}`.trim())
      .sort()
      .join("\n"),
  );
  console.log(`(${obrazowe.length} modeli${DOSTAWCA === "openrouter" ? " z wejściem obrazowym" : ""})`);
  process.exit(0);
}

const pilot = JSON.parse(readFileSync("public/aglosat/pilot.json", "utf8")) as PilotZapisany;
const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
const miejsca = new Map(pilot.ranking.map((r) => [r.odcinekId, r.odcinki]));
if (!MODEL && !process.argv.includes("--podglad")) throw new Error(`Podaj --model dla dostawcy ${DOSTAWCA} (lista: --modele).`);
const PLIK = plikWynikow(DOSTAWCA, MODEL, WERSJA_PROMPTU);
const plik: PlikKlasyfikacji =
  existsSync(PLIK) && !process.argv.includes("--od-nowa")
    ? (JSON.parse(readFileSync(PLIK, "utf8")) as PlikKlasyfikacji)
    : { dostawca: DOSTAWCA, model: MODEL, wersjaPromptu: WERSJA_PROMPTU, data: "", wyniki: {} };

if (process.argv.includes("--podglad")) {
  for (const w of pilot.wycinki.slice(0, 3)) {
    const przebiegi = (miejsca.get(w.odcinekId) ?? [w.odcinekId]).map((id) => odcinki.get(id)!.geometria);
    const obraz = await obrazZPrzebiegiem(w, przebiegi);
    const cel = `/tmp/claude-501/podglad-${w.id}.jpg`;
    writeFileSync(cel, Buffer.from(obraz.split(",")[1], "base64"));
    console.log(cel);
  }
  console.log(PROMPT);
  process.exit(0);
}

const limit = Number(arg("--limit"));
const doZrobienia = pilot.wycinki.filter((w) => !plik.wyniki[w.id]).slice(0, limit > 0 ? limit : undefined);
console.log(`${DOSTAWCA} / ${MODEL} / prompt v${WERSJA_PROMPTU}; wycinki: ${pilot.wycinki.length}, do klasyfikacji: ${doZrobienia.length}`);
mkdirSync(KATALOG, { recursive: true });
const zapisz = () => {
  // Zapis po każdym wycinku: przerwane uruchomienie nie traci wyników.
  plik.data = new Date().toISOString().slice(0, 10);
  plik.wyniki = Object.fromEntries(Object.entries(plik.wyniki).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(PLIK, JSON.stringify(plik, null, 2) + "\n");
};
const kolejka = [...doZrobienia];
let gotowe = 0;
await Promise.all(
  Array.from({ length: D.rownolegle }, async () => {
    for (let w = kolejka.shift(); w; w = kolejka.shift()) {
      const przebiegi = (miejsca.get(w.odcinekId) ?? [w.odcinekId]).map((id) => odcinki.get(id)!.geometria);
      try {
        const r = await klasyfikuj(await obrazZPrzebiegiem(w, przebiegi));
        plik.wyniki[w.id] = r;
        console.log(`  ${++gotowe}/${doZrobienia.length} ${w.id}: ${r.klasa} (${r.ocena}) ${r.uzasadnienie}`);
      } catch (e) {
        console.error(`  ${w.id}: ${String(e)}`);
      }
      zapisz();
      if (D.przerwaMs) await new Promise((r) => setTimeout(r, D.przerwaMs));
    }
  }),
);
const liczby = Object.values(plik.wyniki).reduce<Record<string, number>>((a, r) => ({ ...a, [r.klasa]: (a[r.klasa] ?? 0) + 1 }), {});
console.log(`gotowe: ${Object.keys(plik.wyniki).length}/${pilot.wycinki.length}`, liczby);
