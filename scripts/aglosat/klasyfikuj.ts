// Klasyfikacja wycinków ortofotomapy modelem wizyjnym przez Groq (API zgodne z OpenAI).
// Uruchomienie: npm run aglosat:klasyfikuj            (pomija już sklasyfikowane)
//               npm run aglosat:klasyfikuj -- --modele   (lista modeli dostępnych dla klucza)
//               npm run aglosat:klasyfikuj -- --od-nowa  (klasyfikuje wszystko jeszcze raz)
//               npm run aglosat:klasyfikuj -- --podglad  (zapisuje wejście modelu dla 3 wycinków, bez API)
// Klucz: zmienna GROQ_API_KEY albo plik .env.local (nie trafia do repo).
// Wyniki: data/aglosat/klasyfikacje-modelu.json; demo działa bez klucza.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { ORTO } from "./config.ts";
import { KLASY_OBRAZU } from "../../lib/aglosat/etykiety.ts";
import type { PilotZapisany } from "../../lib/aglosat/data.ts";
import type { KlasaObrazu, LatLon, Wycinek } from "../../lib/aglosat/types.ts";

const API = "https://api.groq.com/openai/v1";
const MODEL = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
const WERSJA_PROMPTU = 1;
const PLIK = "data/aglosat/klasyfikacje-modelu.json";
const PRZERWA_MS = 2500;

export type WynikModelu = { klasa: KlasaObrazu; ocena: number; uzasadnienie: string };
export type PlikKlasyfikacji = {
  model: string;
  wersjaPromptu: number;
  data: string;
  wyniki: Record<string, WynikModelu>;
};

function klucz(): string {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(/^GROQ_API_KEY\s*=\s*"?([^"\n]+)"?/m);
    if (m) return m[1].trim();
  }
  throw new Error("Brak GROQ_API_KEY (zmienna środowiskowa albo .env.local).");
}

async function zapytaj(sciezka: string, body?: unknown): Promise<Response> {
  return fetch(`${API}${sciezka}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${klucz()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const PROMPT = `You are reviewing an aerial orthophoto (north up, ${ORTO.rozmiarPx}x${ORTO.rozmiarPx} px).
A pedestrian path segment from OpenStreetMap is drawn on it as a dashed cyan line with a dark outline.
Judge ONLY the pedestrian surface along the drawn line, and choose exactly one class:
${KLASY_OBRAZU.map((k) => `- "${k.klasa}": ${k.definicja}`).join("\n")}
(The class definitions are in Polish: "ciagly" = continuous, "przerwany" = interrupted, "niewidoczny" = not visible.)
Answer with JSON only: {"klasa": "ciagly" | "przerwany" | "niewidoczny", "ocena": number from 0 to 1 (your confidence), "uzasadnienie": "one short sentence in Polish describing what you see along the line"}`;

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

async function klasyfikuj(obraz: string): Promise<WynikModelu> {
  for (let proba = 1; proba <= 4; proba++) {
    const res = await zapytaj("/chat/completions", {
      model: MODEL,
      temperature: 0,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: obraz } }] }],
    });
    if (res.status === 429) {
      const czekaj = Number(res.headers.get("retry-after") ?? 10) * 1000;
      console.warn(`  limit zapytań, czekam ${Math.round(czekaj / 1000)} s`);
      await new Promise((r) => setTimeout(r, czekaj));
      continue;
    }
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const dane = (await res.json()) as { choices: { message: { content: string } }[] };
    try {
      return sprawdzOdpowiedz(dane.choices[0].message.content);
    } catch (e) {
      console.warn(`  niepoprawna odpowiedź (${String(e)}), próba ${proba}`);
    }
  }
  throw new Error("nie udało się uzyskać poprawnej odpowiedzi");
}

if (process.argv.includes("--modele")) {
  const res = await zapytaj("/models");
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  const { data } = (await res.json()) as { data: { id: string; owned_by: string }[] };
  console.log(data.map((m) => `${m.id}  (${m.owned_by})`).sort().join("\n"));
  process.exit(0);
}

const pilot = JSON.parse(readFileSync("public/aglosat/pilot.json", "utf8")) as PilotZapisany;
const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
const miejsca = new Map(pilot.ranking.map((r) => [r.odcinekId, r.odcinki]));
const plik: PlikKlasyfikacji =
  existsSync(PLIK) && !process.argv.includes("--od-nowa")
    ? (JSON.parse(readFileSync(PLIK, "utf8")) as PlikKlasyfikacji)
    : { model: MODEL, wersjaPromptu: WERSJA_PROMPTU, data: "", wyniki: {} };
if (plik.model !== MODEL || plik.wersjaPromptu !== WERSJA_PROMPTU) {
  console.log(`Zmiana modelu lub promptu (${plik.model} v${plik.wersjaPromptu} → ${MODEL} v${WERSJA_PROMPTU}): klasyfikuję od nowa.`);
  plik.wyniki = {};
}
plik.model = MODEL;
plik.wersjaPromptu = WERSJA_PROMPTU;

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

const doZrobienia = pilot.wycinki.filter((w) => !plik.wyniki[w.id]);
console.log(`model: ${MODEL}; wycinki: ${pilot.wycinki.length}, do klasyfikacji: ${doZrobienia.length}`);
for (const [i, w] of doZrobienia.entries()) {
  const przebiegi = (miejsca.get(w.odcinekId) ?? [w.odcinekId]).map((id) => odcinki.get(id)!.geometria);
  try {
    plik.wyniki[w.id] = await klasyfikuj(await obrazZPrzebiegiem(w, przebiegi));
    const r = plik.wyniki[w.id];
    console.log(`  ${i + 1}/${doZrobienia.length} ${w.id}: ${r.klasa} (${r.ocena}) ${r.uzasadnienie}`);
  } catch (e) {
    console.error(`  ${w.id}: ${String(e)}`);
  }
  // Zapis po każdym wycinku: przerwane uruchomienie nie traci wyników.
  plik.data = new Date().toISOString().slice(0, 10);
  plik.wyniki = Object.fromEntries(Object.entries(plik.wyniki).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(PLIK, JSON.stringify(plik, null, 2) + "\n");
  await new Promise((r) => setTimeout(r, PRZERWA_MS));
}
const liczby = Object.values(plik.wyniki).reduce<Record<string, number>>((a, r) => ({ ...a, [r.klasa]: (a[r.klasa] ?? 0) + 1 }), {});
console.log(`gotowe: ${Object.keys(plik.wyniki).length}/${pilot.wycinki.length}`, liczby);
