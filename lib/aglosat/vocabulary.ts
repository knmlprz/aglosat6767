// Słownik: te same słowa w aplikacji, na slajdach i w odpowiedziach na pytania.
// Nie używamy „bariera” dla niepotwierdzonych, „trasa dostępna”, „mapa barier”.

import type { Cecha, KategoriaUslugi, RodzajDaty, RodzajZrodla, Status, Wartosc } from "./types.ts";

export const STATUS_LABEL: Record<Status, string> = {
  potwierdzone: "potwierdzone",
  otwarte_zrodlo: "z otwartego źródła",
  przyjete_zgloszenie: "zgłoszenie przyjęte przez urząd",
  zgloszone: "zgłoszone, czeka na urząd",
  podejrzenie_obraz: "podejrzenie z obrazu",
  nieznane: "nieznane",
  sprzeczne: "sprzeczne",
};

export const CECHA_LABEL: Record<Cecha, string> = {
  ciaglosc: "ciągłość",
  schody: "schody",
  nawierzchnia: "nawierzchnia",
  kraweznik: "krawężnik",
  szerokosc: "szerokość",
  nachylenie: "nachylenie",
};

export const ZRODLO_LABEL: Record<RodzajZrodla, string> = {
  osm: "OpenStreetMap",
  zalozenie: "założenie",
  model: "model wizyjny",
  teren: "kontrola w terenie",
  zgloszenie: "zgłoszenie",
};

export const DATA_LABEL: Record<RodzajDaty, string> = {
  pobrania: "data pobrania",
  obrazu: "data obrazu",
  kontroli: "data kontroli",
  zgloszenia: "data zgłoszenia",
};

export const KATEGORIA_LABEL: Record<KategoriaUslugi, string> = {
  przychodnia: "przychodnia",
  apteka: "apteka",
  sklep: "sklep",
  poczta: "poczta",
  biblioteka: "biblioteka",
};

export const TRASA_LABEL = {
  udokumentowana: "trasa udokumentowana",
  weryfikacji: "trasa wymagająca weryfikacji",
  piesza: "trasa piesza bez profilu",
} as const;

export const ETYKIETA_PRZYKLADOWE = "dane przykładowe";
export const ETYKIETA_ANALIZA_BAZOWA = "analiza bazowa, policzona wcześniej";

export const TYP_LABEL: Record<string, string> = {
  chodnik: "chodnik",
  przejscie: "przejście",
  schody: "schody",
  sciezka: "ścieżka",
  ciag_pieszy: "ciąg pieszy",
  droga_osiedlowa: "droga osiedlowa",
};

const NAWIERZCHNIA: Record<string, string> = {
  asphalt: "asfalt",
  paving_stones: "kostka betonowa",
  sett: "kostka granitowa",
  concrete: "beton",
  "concrete:plates": "płyty betonowe",
  paved: "utwardzona",
  compacted: "ubita",
  gravel: "żwir",
  fine_gravel: "drobny żwir",
  grass: "trawa",
  ground: "grunt",
  dirt: "ziemia",
  sand: "piasek",
  metal: "metal",
  wood: "drewno",
  unpaved: "nieutwardzona",
};

const KRAWEZNIK: Record<string, string> = {
  nie_dotyczy: "nie dotyczy",
  zrownany: "zrównany",
  obnizony: "obniżony",
  wysoki: "wysoki",
};

const CIAGLOSC: Record<string, string> = {
  ciagly: "ciągły",
  przerwany: "przerwany",
  niewidoczny: "niewidoczny na obrazie",
};

/** Wartość cechy w języku interfejsu. */
export function formatujWartosc(cecha: Cecha, w: Wartosc | null): string {
  if (w === null) return "brak rozstrzygnięcia";
  switch (cecha) {
    case "schody":
      return w === true ? "są" : "brak";
    case "nawierzchnia":
      return NAWIERZCHNIA[String(w)] ?? String(w);
    case "kraweznik":
      return typeof w === "number" ? `${w} cm` : (KRAWEZNIK[String(w)] ?? String(w));
    case "ciaglosc":
      return CIAGLOSC[String(w)] ?? String(w);
    case "szerokosc":
      return `${w} cm`;
    case "nachylenie":
      return `${w}%`;
  }
}

/** Polska odmiana po liczebniku: odmiana(4, ["relacja", "relacje", "relacji"]) → "relacje". */
export function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  if (n === 1) return jeden;
  const d = n % 10;
  const s = n % 100;
  return d >= 2 && d <= 4 && (s < 12 || s > 14) ? kilka : wiele;
}
