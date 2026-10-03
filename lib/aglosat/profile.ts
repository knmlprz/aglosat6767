// Profile i ocena przejezdności. Status dotyczy cechy, nie całego odcinka:
// przejezdny = każda wymagana cecha udokumentowana i spełnia profil.

import type { Cecha, Profil, StanCechy, Wartosc } from "./types.ts";

export const PROFILE: Profil[] = [
  {
    id: "wozek",
    nazwa: "Bez schodów, niski krawężnik",
    opis: "Wózek inwalidzki albo dziecięcy: bez schodów, krawężnik do 3 cm, utwardzona nawierzchnia; kostka granitowa to utrudnienie.",
    wymagane: ["ciaglosc", "schody", "nawierzchnia", "kraweznik"],
    dopuszczalneNawierzchnie: ["asphalt", "paving_stones", "concrete", "concrete:plates", "paved"],
    utrudnioneNawierzchnie: ["sett"],
    maxKraweznikCm: 3,
    minSzerokoscCm: 0,
    maxNachylenieProc: 100,
  },
  {
    id: "wozek_szeroki",
    nazwa: "Jak wyżej + szerokość i nachylenie",
    opis: "Dodatkowo szerokość co najmniej 90 cm i nachylenie do 6%. Profil konfiguracyjny, poza demo.",
    wymagane: ["ciaglosc", "schody", "nawierzchnia", "kraweznik", "szerokosc", "nachylenie"],
    dopuszczalneNawierzchnie: ["asphalt", "paving_stones", "concrete", "concrete:plates", "paved"],
    utrudnioneNawierzchnie: ["sett"],
    maxKraweznikCm: 3,
    minSzerokoscCm: 90,
    maxNachylenieProc: 6,
  },
];

export const PROFIL_DOMYSLNY = PROFILE[0];

/** „utrudnienie”: cecha pozwala przejechać, ale trasa jest trudniejsza (np. kostka granitowa). */
export type OcenaCechy = "spelnia" | "utrudnienie" | "nie_spelnia" | "nieznane";
export type Przejezdnosc = "przejezdny" | "nieprzejezdny" | "nieznany";

export type OcenaOdcinka = {
  przejezdnosc: Przejezdnosc;
  /** Wymagane cechy bez rozstrzygnięcia: lista do sprawdzenia w terenie. */
  nieznane: Cecha[];
  niespelnione: Cecha[];
  /** Cechy przejezdne, ale utrudniające; pokazujemy je przy trasie, nie blokują jej. */
  utrudnienia: Cecha[];
  /** Wymagane cechy ze sprzecznymi źródłami (zawierają się w „nieznane”). */
  sprzeczne: Cecha[];
};

const KRAWEZNIK_CM: Record<string, number> = { nie_dotyczy: 0, zrownany: 0, obnizony: 2, wysoki: 12 };

function spelnia(cecha: Cecha, w: Wartosc, p: Profil): boolean {
  switch (cecha) {
    case "ciaglosc":
      return w === "ciagly";
    case "schody":
      return w === false;
    case "nawierzchnia":
      return p.dopuszczalneNawierzchnie.includes(String(w)) || p.utrudnioneNawierzchnie.includes(String(w));
    case "kraweznik":
      return (typeof w === "number" ? w : (KRAWEZNIK_CM[String(w)] ?? Infinity)) <= p.maxKraweznikCm;
    case "szerokosc":
      return Number(w) >= p.minSzerokoscCm;
    case "nachylenie":
      return Math.abs(Number(w)) <= p.maxNachylenieProc;
  }
}

export function ocenCeche(stan: StanCechy, p: Profil): OcenaCechy {
  // Tylko potwierdzone i otwarte źródło są udokumentowane. Podejrzenie, zgłoszenie,
  // sprzeczność i brak danych to niewiadoma, nigdy „spełnia”.
  if (stan.status !== "potwierdzone" && stan.status !== "otwarte_zrodlo") return "nieznane";
  if (stan.wartosc === null) return "nieznane";
  if (!spelnia(stan.cecha, stan.wartosc, p)) return "nie_spelnia";
  if (stan.cecha === "nawierzchnia" && p.utrudnioneNawierzchnie.includes(String(stan.wartosc))) return "utrudnienie";
  return "spelnia";
}

export function ocenOdcinek(stany: Record<Cecha, StanCechy>, p: Profil): OcenaOdcinka {
  const nieznane: Cecha[] = [];
  const niespelnione: Cecha[] = [];
  const utrudnienia: Cecha[] = [];
  const sprzeczne: Cecha[] = [];
  for (const cecha of p.wymagane) {
    if (stany[cecha].status === "sprzeczne") sprzeczne.push(cecha);
    const o = ocenCeche(stany[cecha], p);
    if (o === "nieznane") nieznane.push(cecha);
    else if (o === "nie_spelnia") niespelnione.push(cecha);
    else if (o === "utrudnienie") utrudnienia.push(cecha);
  }
  const przejezdnosc: Przejezdnosc =
    niespelnione.length > 0 ? "nieprzejezdny" : nieznane.length > 0 ? "nieznany" : "przejezdny";
  return { przejezdnosc, nieznane, niespelnione, utrudnienia, sprzeczne };
}
