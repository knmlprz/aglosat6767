// Zapis ręcznych etykiet do pliku w repozytorium. Działa tylko w trybie deweloperskim:
// opisujemy próbkę lokalnie, a plik trafia do repo zwykłym commitem.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { KLASY_OBRAZU, PUSTY_PLIK_ETYKIET, WERSJA_INSTRUKCJI, wczytajEtykiety, type PlikEtykiet } from "@/lib/aglosat/etykiety.ts";
import type { KlasaObrazu } from "@/lib/aglosat/types.ts";

const PLIK = path.join(process.cwd(), "data/aglosat/etykiety-reczne.json");
const DOZWOLONE = new Set<string>(KLASY_OBRAZU.map((k) => k.klasa));

async function wczytaj(): Promise<PlikEtykiet> {
  try {
    return wczytajEtykiety(JSON.parse(await readFile(PLIK, "utf8")));
  } catch {
    return structuredClone(PUSTY_PLIK_ETYKIET);
  }
}

export async function GET() {
  return Response.json(await wczytaj());
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ blad: "zapis etykiet działa tylko w trybie deweloperskim" }, { status: 403 });
  }
  const { wycinekId, klasa, kto } = (await req.json()) as { wycinekId?: string; klasa?: string | null; kto?: string };
  if (!wycinekId || !/^w_[\w-]+$/.test(wycinekId)) {
    return Response.json({ blad: "niepoprawny identyfikator wycinka" }, { status: 400 });
  }
  const osoba = (kto ?? "").trim().slice(0, 40);
  if (!osoba) return Response.json({ blad: "podaj, kto opisuje" }, { status: 400 });
  const plik = await wczytaj();
  const etykiety = (plik.osoby[osoba] ??= {});
  if (klasa === null) {
    delete etykiety[wycinekId];
  } else if (klasa && DOZWOLONE.has(klasa)) {
    etykiety[wycinekId] = { klasa: klasa as KlasaObrazu, kiedy: new Date().toISOString(), wersjaInstrukcji: WERSJA_INSTRUKCJI };
  } else {
    return Response.json({ blad: "niepoprawna klasa" }, { status: 400 });
  }
  // Stała kolejność kluczy: czytelny diff w repo.
  plik.osoby[osoba] = Object.fromEntries(Object.entries(etykiety).sort(([a], [b]) => a.localeCompare(b)));
  if (Object.keys(plik.osoby[osoba]).length === 0) delete plik.osoby[osoba];
  await writeFile(PLIK, JSON.stringify(plik, null, 2) + "\n");
  return Response.json({ ok: true });
}
