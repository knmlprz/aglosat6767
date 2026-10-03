// Model danych AgloSat. Ten sam kształt czyta potok (scripts/aglosat) i frontend.
// Reguły, których kod nie może złamać:
// - brak danych nigdy nie staje się „przejezdne”,
// - data obrazu, data pobrania i data kontroli to osobne pola,
// - dwa sprzeczne źródła dają status „sprzeczne” i pokazują oba.

export type LatLon = [number, number];

/** Cechy odcinka, które może wymagać profil. */
export type Cecha = "ciaglosc" | "schody" | "nawierzchnia" | "kraweznik" | "szerokosc" | "nachylenie";

/** Status cechy widoczny dla użytkownika (słownik w vocabulary.ts). */
export type Status =
  | "potwierdzone"
  | "otwarte_zrodlo"
  | "zgloszone"
  | "podejrzenie_obraz"
  | "nieznane"
  | "sprzeczne";

export type RodzajZrodla = "osm" | "zalozenie" | "model" | "teren" | "zgloszenie";

/** Która data stoi przy dowodzie. Trzy rodzaje nigdy się nie mieszają. */
export type RodzajDaty = "pobrania" | "obrazu" | "kontroli" | "zgloszenia";

/**
 * Wartości cech:
 * ciaglosc: "ciagly" | "przerwany" (klasa „niewidoczny” nie niesie wartości),
 * schody: boolean, nawierzchnia: tag surface z OSM,
 * kraweznik: "obnizony" | "zrownany" | "wysoki" | "nie_dotyczy" | liczba cm,
 * szerokosc: cm, nachylenie: %.
 */
export type Wartosc = string | number | boolean;

export type Dowod = {
  zrodlo: RodzajZrodla;
  wartosc: Wartosc;
  data: string; // ISO yyyy-mm-dd
  rodzajDaty: RodzajDaty;
  opis?: string;
  /** Tag OSM albo identyfikator obserwacji, z którego pochodzi dowód. */
  ref?: string;
  /** Dane przykładowe, nie z prawdziwego źródła. Interfejs musi to oznaczyć. */
  przykladowe?: boolean;
};

export type StanCechy = {
  cecha: Cecha;
  status: Status;
  /** Wartość rozstrzygnięta; null przy „nieznane” i „sprzeczne”. */
  wartosc: Wartosc | null;
  dowody: Dowod[];
};

export type TypOdcinka = "chodnik" | "przejscie" | "schody" | "sciezka" | "ciag_pieszy" | "droga_osiedlowa";

export type Odcinek = {
  id: string;
  a: string; // węzeł początkowy
  b: string; // węzeł końcowy
  geometria: LatLon[];
  dlugoscM: number;
  osmWayId: number;
  typ: TypOdcinka;
  nazwa?: string;
  /** Dowody z OSM i jawnych założeń. Obserwacje i weryfikacje dochodzą osobno. */
  dowody: Partial<Record<Cecha, Dowod[]>>;
  /** Odcinek w strefie zmian Sentinel-2: dane mogą być nieaktualne. */
  strefaZmian?: string;
};

export type KlasaObrazu = "ciagly" | "przerwany" | "niewidoczny";

export type Obserwacja = {
  id: string;
  odcinekId: string;
  cecha: "ciaglosc";
  klasa: KlasaObrazu;
  ocena: number; // 0–1, pewność modelu
  dataObrazu: string;
  zrodloObrazu: string;
  uzasadnienie: string;
  /** Ścieżka do wycinka w public/; null, dopóki nie ma wycinka. */
  wycinek: string | null;
  przykladowe: boolean;
};

export type Weryfikacja = {
  id: string;
  odcinekId: string;
  cecha: Cecha;
  wartosc: Wartosc;
  dataKontroli: string;
  notatka?: string;
  /** Odrzucenie obserwacji modelu, np. „w terenie był cień”. */
  odrzucaObserwacje?: string;
  przykladowe: boolean;
};

export type KategoriaUslugi = "przychodnia" | "apteka" | "sklep" | "poczta" | "biblioteka";

export type Usluga = {
  id: string;
  osmRef: string;
  kategoria: KategoriaUslugi;
  nazwa: string;
  lat: number;
  lon: number;
  wezel: string;
  wejscie?: { wheelchair?: string };
};

export type Budynek = {
  id: string;
  osmWayId: number;
  lat: number;
  lon: number;
  wezel: string;
  adres?: string;
  powierzchniaM2: number;
  kondygnacje: number;
  /** true, gdy liczby kondygnacji nie ma w OSM i przyjęto przybliżenie. */
  kondygnacjePrzyblizone: boolean;
  /** Skala zabudowy mieszkalnej: powierzchnia × kondygnacje. To przybliżenie, nie liczba mieszkańców. */
  waga: number;
};

export type Profil = {
  id: string;
  nazwa: string;
  opis: string;
  wymagane: Cecha[];
  dopuszczalneNawierzchnie: string[];
  /** Nawierzchnie przejezdne, ale utrudniające, np. kostka granitowa (sett). */
  utrudnioneNawierzchnie: string[];
  maxKraweznikCm: number;
  minSzerokoscCm: number;
  maxNachylenieProc: number;
};

export type StrefaZmian = {
  id: string;
  wielokat: LatLon[];
  scenaPrzed: string;
  scenaPo: string;
  opis: string;
  /** Ilustracja: przygotowana para scen, nie wynik pełnej analizy. */
  ilustracja: boolean;
};

export type WynikWplywu = {
  odcinekId: string;
  profilId: string;
  wynik: number;
  utraconeRelacje: number;
  wydluzoneRelacje: number;
  /** Średnia dodatkowa droga dla wydłużonych relacji, w metrach. */
  dodatkowaDrogaM: number;
  /** Ważona skala zabudowy dotkniętych relacji. */
  dotknietaWaga: number;
  uslugi: string[];
  brakujaceCechy: Cecha[];
};

export type Pilot = {
  meta: {
    obszar: { nazwa: string; bbox: [number, number, number, number]; srodek: LatLon };
    pobranoOsm: string;
    wygenerowano: string;
    uwagi: string[];
  };
  wezly: Record<string, LatLon>;
  odcinki: Odcinek[];
  obserwacje: Obserwacja[];
  budynki: Budynek[];
  uslugi: Usluga[];
  strefyZmian: StrefaZmian[];
  /** Analiza bazowa: policzona przez skrypt, nie przeliczana na żywo. */
  ranking: WynikWplywu[];
  mianownik: {
    profilId: string;
    relacje: number;
    udokumentowane: number;
    wymagajaceWeryfikacji: number;
    bezPrzejscia: number;
  };
  kandydaci: {
    budynekId: string;
    uslugaId: string;
    pieszoM: number;
    weryfikacjiM: number | null;
    udokumentowanaM: number | null;
    niewiadome: string[];
  }[];
};
