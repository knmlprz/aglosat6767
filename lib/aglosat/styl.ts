// Jak odcinek wygląda na mapie niewiedzy. Kategorie różnią się kolorem i kształtem linii
// (grubość, przerywanie), żeby mapa była czytelna także bez rozróżniania barw.

import type { OcenaOdcinka } from "./profile.ts";

export type KategoriaMapy = "udokumentowany" | "utrudnienie" | "niewiadoma" | "sprzeczne" | "nieprzejezdny";

export function kategoriaMapy(o: OcenaOdcinka): KategoriaMapy {
  if (o.przejezdnosc === "nieprzejezdny") return "nieprzejezdny";
  if (o.sprzeczne.length > 0) return "sprzeczne";
  if (o.przejezdnosc === "nieznany") return "niewiadoma";
  if (o.utrudnienia.length > 0) return "utrudnienie";
  return "udokumentowany";
}

export type StylLinii = { color: string; weight: number; opacity: number; dashArray?: string };

export const STYL_MAPY: Record<
  KategoriaMapy,
  { etykieta: string; opis: string; linia: StylLinii; mgla?: StylLinii }
> = {
  udokumentowany: {
    etykieta: "udokumentowany dla profilu",
    opis: "każda wymagana cecha ma źródło i spełnia profil",
    linia: { color: "#34d399", weight: 1.5, opacity: 0.55 },
  },
  utrudnienie: {
    etykieta: "przejezdny z utrudnieniem",
    opis: "np. kostka granitowa",
    linia: { color: "#fcd34d", weight: 2.5, opacity: 0.9, dashArray: "8 3" },
  },
  niewiadoma: {
    etykieta: "niewiadoma",
    opis: "brakuje informacji o co najmniej jednej wymaganej cesze",
    linia: { color: "#ffffff", weight: 3, opacity: 1, dashArray: "3 4" },
    mgla: { color: "#ffffff", weight: 22, opacity: 0.4 },
  },
  sprzeczne: {
    etykieta: "sprzeczne źródła",
    opis: "np. OSM: ciągły, obraz: przerwany",
    linia: { color: "#e879f9", weight: 3.5, opacity: 1, dashArray: "6 4" },
    mgla: { color: "#ffffff", weight: 22, opacity: 0.4 },
  },
  nieprzejezdny: {
    etykieta: "nieprzejezdny dla profilu",
    opis: "udokumentowana cecha wyklucza przejazd, np. schody",
    linia: { color: "#fb7185", weight: 3, opacity: 0.95 },
  },
};

export const KOLEJNOSC_KATEGORII: KategoriaMapy[] = [
  "niewiadoma",
  "sprzeczne",
  "nieprzejezdny",
  "utrudnienie",
  "udokumentowany",
];
