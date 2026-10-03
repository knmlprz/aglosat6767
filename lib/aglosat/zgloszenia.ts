// Zgłoszenia mieszkańców: co ktoś zastał na odcinku, najlepiej ze zdjęciem.
// Zgłoszenie samo w sobie nie rozstrzyga cechy. Rozstrzyga dopiero decyzja urzędu,
// bo za „udokumentowane” musi odpowiadać człowiek, nie formularz.
// W prototypie zgłoszenia żyją w pamięci strony, tak jak kontrole; trwały zapis i konto
// zgłaszającego to krok po hackathonie.

import type { Cecha, StanZgloszenia, Wartosc, Zgloszenie } from "./types.ts";
import { dzisiaj } from "./weryfikacja.ts";

/** Dłuższy bok zdjęcia po zmniejszeniu. Tyle wystarczy, żeby zobaczyć krawężnik albo schody. */
const MAX_BOK_PX = 1280;
const JAKOSC_JPEG = 0.72;

let licznik = 0;

export function noweZgloszenie(
  odcinekId: string,
  cecha: Cecha,
  wartosc: Wartosc,
  opcje: { zdjecie?: string | null; opis?: string } = {},
): Zgloszenie {
  return {
    id: `z${Date.now().toString(36)}${(licznik++).toString(36)}`,
    odcinekId,
    cecha,
    wartosc,
    zdjecie: opcje.zdjecie ?? null,
    ...(opcje.opis ? { opis: opcje.opis } : {}),
    dataZgloszenia: dzisiaj(),
    stan: "oczekuje",
  };
}

export function rozpatrzone(z: Zgloszenie, stan: StanZgloszenia, uzasadnienie?: string): Zgloszenie {
  const nowe: Zgloszenie = { ...z, stan };
  if (uzasadnienie?.trim()) nowe.uzasadnienie = uzasadnienie.trim();
  else delete nowe.uzasadnienie;
  return nowe;
}

export const ETYKIETA_STANU: Record<StanZgloszenia, string> = {
  oczekuje: "czeka na decyzję urzędu",
  przyjete: "przyjęte przez urząd",
  odrzucone: "odrzucone przez urząd",
};

/**
 * Zdjęcie z telefonu bywa wielkości kilku megabajtów, a do oceny krawężnika tyle nie trzeba.
 * Zmniejszamy je w przeglądarce, żeby zgłoszenie dało się unieść w pamięci strony.
 * `imageOrientation` bierze obrót z EXIF, inaczej zdjęcia z telefonu leżą bokiem.
 */
export async function zmniejszZdjecie(plik: File): Promise<string> {
  const obraz = await createImageBitmap(plik, { imageOrientation: "from-image" });
  try {
    const skala = Math.min(1, MAX_BOK_PX / Math.max(obraz.width, obraz.height));
    const plotno = document.createElement("canvas");
    plotno.width = Math.round(obraz.width * skala);
    plotno.height = Math.round(obraz.height * skala);
    const ctx = plotno.getContext("2d");
    if (!ctx) throw new Error("brak kontekstu 2d");
    ctx.drawImage(obraz, 0, 0, plotno.width, plotno.height);
    return plotno.toDataURL("image/jpeg", JAKOSC_JPEG);
  } finally {
    obraz.close();
  }
}
