// Słownik: te same słowa w aplikacji, na slajdach i w odpowiedziach na pytania.
// Nie używamy „bariera” dla niepotwierdzonych, „trasa dostępna”, „mapa barier”.

import type { Cecha, KategoriaUslugi, OsmDostepnosc, RodzajDaty, RodzajZrodla, Status, Wartosc } from "./types.ts";

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

export const OSM_DOSTEPNOSC_LABEL: Record<keyof OsmDostepnosc, string> = {
  highway: "typ drogi (highway)",
  wheelchair: "dostępność (wheelchair)",
  incline: "nachylenie (incline)",
  surface: "nawierzchnia (surface)",
  smoothness: "gładkość (smoothness)",
  kerb: "krawężnik (kerb)",
  width: "szerokość (width)",
  tactile_paving: "oznaczenia dotykowe (tactile_paving)",
  traffic_signals: "sygnalizacja (traffic_signals:sound / :vibration)",
};

export const OSM_DOSTEPNOSC_POLA = Object.keys(OSM_DOSTEPNOSC_LABEL) as (keyof OsmDostepnosc)[];

const WHEELCHAIR: Record<string, string> = {
  yes: "przystosowane",
  designated: "przystosowane (wyznaczone)",
  limited: "częściowo przystosowane",
  no: "nieprzystosowane",
};

/** Tag wheelchair z OSM w języku interfejsu. Brak tagu to „brak danych”, nigdy „przystosowane”. */
export function opisWheelchair(w: string | null | undefined): string {
  if (!w) return "brak danych w OSM";
  return WHEELCHAIR[w] ?? w;
}

const INCLINE: Record<string, string> = {
  up: "pod górę",
  down: "z górki",
  yes: "jest",
  no: "płasko",
};

/** Tag incline z OSM w języku interfejsu, np. „5%”, „pod górę”. */
export function opisIncline(i: string | null | undefined): string {
  if (!i) return "brak danych w OSM";
  const t = i.trim();
  if (INCLINE[t]) return INCLINE[t];
  const proc = t.match(/^(-?\d+(?:[.,]\d+)?)\s*%$/);
  if (proc) return `${proc[1].replace(".", ",").replace(/^-/, "")}%${proc[1].startsWith("-") ? " (w dół)" : ""}`;
  const st = t.match(/^(-?\d+(?:[.,]\d+)?)\s*°$/);
  if (st) return `${st[1].replace(".", ",").replace(/^-/, "")}°${st[1].startsWith("-") ? " (w dół)" : ""}`;
  return t;
}

const HIGHWAY: Record<string, string> = {
  footway: "droga dla pieszych",
  path: "ścieżka",
  pedestrian: "deptak",
  steps: "schody",
  living_street: "strefa zamieszkania",
  cycleway: "droga rowerowa",
  track: "droga gruntowa",
  service: "droga serwisowa",
  residential: "ulica osiedlowa",
};

/** Tag highway z OSM w języku interfejsu. */
export function opisHighway(h: string | null | undefined): string {
  if (!h) return "brak danych w OSM";
  return HIGHWAY[h] ?? h;
}

const TACTILE: Record<string, string> = {
  yes: "są",
  no: "brak",
  partial: "częściowo",
  incorrect: "nieprawidłowe",
};

/** Tag tactile_paving z OSM w języku interfejsu. */
export function opisTactile(t: string | null | undefined): string {
  if (!t) return "brak danych w OSM";
  return TACTILE[t] ?? t;
}

const SYGNALIZACJA: Record<string, string> = {
  none: "brak",
  sound: "dźwiękowa",
  vibration: "wibracyjna",
  "sound;vibration": "dźwiękowa i wibracyjna",
  unknown: "brak danych w OSM",
};

/** Sygnalizacja dla niewidomych na światłach (pole traffic_signals odcinka). */
export function opisSygnalizacji(s: string | null | undefined): string {
  if (!s) return "brak danych w OSM";
  return SYGNALIZACJA[s] ?? s;
}

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

/** Czytelna nazwa modelu z identyfikatora dostawcy, np. „anthropic/claude-sonnet-5.5” → „Claude Sonnet 5.5”. */
export function nazwaModelu(id: string): string {
  const nazwa = id.replace(/^.*\//, "");
  return nazwa
    .split("-")
    .map((c) => (/^\d/.test(c) ? c : c.charAt(0).toUpperCase() + c.slice(1)))
    .join(" ");
}
