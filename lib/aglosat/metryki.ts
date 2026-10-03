// Jak często model się myli: porównanie klas modelu z etykietami człowieka na tych samych wycinkach.
// Zgodność z obrazem to nie potwierdzenie stanu w terenie; to mówimy wprost w interfejsie.

import type { KlasaObrazu } from "./types.ts";

export const KLASY: KlasaObrazu[] = ["ciagly", "przerwany", "niewidoczny"];

export type OcenaModelu = {
  model: string;
  wersjaPromptu?: number;
  /** Na którym zbiorze liczone: testowy sprawdzamy raz i raportujemy; roboczy służy do poprawiania promptu. */
  zbior?: "wszystkie" | "roboczy" | "testowy";
  /** Zgodność między ludźmi na wycinkach opisanych przez co najmniej dwie osoby: punkt odniesienia dla modelu. */
  zgodnoscLudzi?: { n: number; zgodnosc: number | null };
  /** Liczba wycinków z etykietą człowieka i wynikiem modelu. */
  n: number;
  /** macierz[człowiek][model] */
  macierz: Record<KlasaObrazu, Record<KlasaObrazu, number>>;
  trafnosc: number | null;
  /** Ile wskazań „przerwany” modelu człowiek potwierdził. */
  precyzjaPrzerwany: number | null;
  /** Ile przerw widzianych przez człowieka model wskazał. */
  czuloscPrzerwany: number | null;
  /** Ile wycinków „niewidoczny” według człowieka model też uznał za niewidoczne. */
  poprawneNiewidoczny: number | null;
  /** Ile wskazań „ciągły” modelu człowiek potwierdził: jedyna odpowiedź, która może uspokoić planistę. */
  precyzjaCiagly?: number | null;
  /**
   * Groźne pomyłki: model mówi „ciągły”, a człowiek widzi przerwę albo nic nie widzi.
   * Pozostałe pomyłki („przerwany” albo „niewidoczny” zamiast „ciągły”) kosztują tylko dodatkową kontrolę.
   */
  grozne?: number;
};

const iloraz = (a: number, b: number) => (b > 0 ? Math.round((1000 * a) / b) / 1000 : null);

export function policzOcene(model: string, pary: { czlowiek: KlasaObrazu; model: KlasaObrazu }[]): OcenaModelu {
  const macierz = Object.fromEntries(KLASY.map((c) => [c, Object.fromEntries(KLASY.map((m) => [m, 0]))])) as OcenaModelu["macierz"];
  for (const p of pary) macierz[p.czlowiek][p.model]++;
  const trafne = KLASY.reduce((s, k) => s + macierz[k][k], 0);
  const modelPrzerwany = KLASY.reduce((s, c) => s + macierz[c].przerwany, 0);
  const czlowiekPrzerwany = KLASY.reduce((s, m) => s + macierz.przerwany[m], 0);
  const czlowiekNiewidoczny = KLASY.reduce((s, m) => s + macierz.niewidoczny[m], 0);
  return {
    model,
    n: pary.length,
    macierz,
    trafnosc: iloraz(trafne, pary.length),
    precyzjaPrzerwany: iloraz(macierz.przerwany.przerwany, modelPrzerwany),
    czuloscPrzerwany: iloraz(macierz.przerwany.przerwany, czlowiekPrzerwany),
    poprawneNiewidoczny: iloraz(macierz.niewidoczny.niewidoczny, czlowiekNiewidoczny),
    precyzjaCiagly: iloraz(macierz.ciagly.ciagly, KLASY.reduce((s, c) => s + macierz[c].ciagly, 0)),
    grozne: macierz.przerwany.ciagly + macierz.niewidoczny.ciagly,
  };
}

export const procent = (x: number | null) => (x === null ? "brak danych" : `${Math.round(100 * x)}%`);
