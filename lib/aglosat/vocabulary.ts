// Słownik: te same słowa w aplikacji, na slajdach i w odpowiedziach na pytania.
// Nie używamy „bariera” dla niepotwierdzonych, „trasa dostępna”, „mapa barier”.

import type { Cecha, KategoriaUslugi, RodzajDaty, RodzajZrodla, Status } from "./types.ts";

export const STATUS_LABEL: Record<Status, string> = {
  potwierdzone: "potwierdzone",
  otwarte_zrodlo: "z otwartego źródła",
  zgloszone: "zgłoszone",
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
