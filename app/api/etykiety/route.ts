// Zapis ręcznych etykiet do pliku w repozytorium. Działa tylko w trybie deweloperskim:
// opisujemy próbkę lokalnie, a plik trafia do repo zwykłym commitem.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { KLASY_OBRAZU, PUSTY_PLIK_ETYKIET, type PlikEtykiet } from "@/lib/aglosat/etykiety.ts";

const PLIK = path.join(process.cwd(), "data/aglosat/etykiety-reczne.json");
const DOZWOLONE = new Set(KLASY_OBRAZU.map((k) => k.klasa as string));

async function wczytaj(): Promise<PlikEtykiet> {
  try {
    return JSON.parse(await readFile(PLIK, "utf8")) as PlikEtykiet;
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
  const plik = await wczytaj();
  if (klasa === null) {
    delete plik.etykiety[wycinekId];
  } else if (klasa && DOZWOLONE.has(klasa)) {
    plik.etykiety[wycinekId] = {
      klasa: klasa as PlikEtykiet["etykiety"][string]["klasa"],
      ...(kto ? { kto: kto.slice(0, 40) } : {}),
      kiedy: new Date().toISOString(),
    };
  } else {
    return Response.json({ blad: "niepoprawna klasa" }, { status: 400 });
  }
  // Stała kolejność kluczy: czytelny diff w repo.
  plik.etykiety = Object.fromEntries(Object.entries(plik.etykiety).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(PLIK, JSON.stringify(plik, null, 2) + "\n");
  return Response.json({ ok: true, liczba: Object.keys(plik.etykiety).length });
}
