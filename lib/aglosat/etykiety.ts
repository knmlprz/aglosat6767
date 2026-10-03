// Ręczne etykiety wycinków: próbka referencyjna do oceny modelu wizyjnego.
// Ta sama definicja klas trafia do instrukcji dla ludzi i do zapytania dla modelu.

import type { KlasaObrazu } from "./types.ts";

export const KLASY_OBRAZU: { klasa: KlasaObrazu; klawisz: string; etykieta: string; definicja: string }[] = [
  {
    klasa: "ciagly",
    klawisz: "1",
    etykieta: "ciągły",
    definicja: "Pas nawierzchni pieszej jest widoczny wzdłuż całej zaznaczonej linii, bez przerw.",
  },
  {
    klasa: "przerwany",
    klawisz: "2",
    etykieta: "przerwany",
    definicja:
      "Na zaznaczonej linii widać przerwę w nawierzchni: trawę, ziemię, ogrodzenie, rozkop albo koniec chodnika.",
  },
  {
    klasa: "niewidoczny",
    klawisz: "3",
    etykieta: "niewidoczny",
    definicja: "Większości przebiegu nie widać: zasłaniają go drzewa, cień albo dach budynku. Nie da się ocenić.",
  },
];

export type EtykietaReczna = {
  klasa: KlasaObrazu;
  /** Kto opisał (opcjonalnie, do porównania zgodności między osobami). */
  kto?: string;
  kiedy: string;
};

export type PlikEtykiet = {
  opis: string;
  etykiety: Record<string, EtykietaReczna>;
};

export const PUSTY_PLIK_ETYKIET: PlikEtykiet = {
  opis: "Ręczne etykiety wycinków ortofotomapy (próbka referencyjna). Klucz: identyfikator wycinka.",
  etykiety: {},
};
