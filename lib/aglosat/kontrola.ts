// Trasa kontroli: spacer przez miejsca z czoła rankingu w zadanym czasie.
// Algorytm zachłanny: kolejne miejsca według priorytetu, każde wstawione tam, gdzie najmniej
// wydłuża spacer; miejsce, które nie mieści się w budżecie, pomijamy i bierzemy następne.
// Budżet obejmuje przejście, sprawdzanie i powrót do punktu startu.

import type { Cecha, Pilot, WynikWplywu } from "./types.ts";
import { dijkstra, sciezka, type Drzewo, type Graf } from "./routing.ts";

export type ParametryKontroli = {
  budzetMin: number;
  minutNaMiejsce: number;
  tempoKmH: number;
  /** Ile pozycji z czoła rankingu rozważamy. */
  zCzola: number;
};

export const DOMYSLNE_PARAMETRY: ParametryKontroli = { budzetMin: 60, minutNaMiejsce: 5, tempoKmH: 4, zCzola: 30 };

export type Przystanek = {
  nr: number;
  pozycjaWRankingu: number;
  odcinekId: string;
  odcinki: string[];
  wezel: string;
  cechy: Cecha[];
  /** Minuta od startu, w której kontroler dociera do miejsca. */
  dotarcieMin: number;
};

export type TrasaKontroli = {
  przystanki: Przystanek[];
  /** Odcinki całego spaceru w kolejności przejścia (z powrotem do startu). */
  odcinki: string[];
  dystansM: number;
  marszMin: number;
  kontrolaMin: number;
  razemMin: number;
  pominiete: number;
};

export function ulozTraseKontroli(
  graf: Graf,
  pilot: Pilot,
  start: string,
  p: ParametryKontroli,
  /** Miejsca już sprawdzone w tej sesji pomijamy. */
  sprawdzone: Set<string> = new Set(),
): TrasaKontroli {
  const mNaMin = (p.tempoKmH * 1000) / 60;
  const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
  const drzewa = new Map<string, Drzewo>();
  const drzewo = (w: string) => {
    let d = drzewa.get(w);
    if (!d) drzewa.set(w, (d = dijkstra(graf, w, { dopusc: () => true })));
    return d;
  };
  const odl = (a: string, b: string) => (a === b ? 0 : (drzewo(a).dlugosc.get(b) ?? Infinity));

  type Kandydat = { r: WynikWplywu; pozycja: number; wezel: string };
  const kandydaci: Kandydat[] = pilot.ranking
    .slice(0, p.zCzola)
    .map((r, i) => ({ r, pozycja: i + 1, wezel: odcinki.get(r.odcinekId)!.a }))
    .filter((k) => !k.r.odcinki.some((id) => sprawdzone.has(id)));

  // Kolejność odwiedzin jako lista węzłów: start, ...miejsca, start.
  let trasa: Kandydat[] = [];
  const dlugosc = (t: Kandydat[]) => {
    let s = 0;
    let poprz = start;
    for (const k of t) {
      s += odl(poprz, k.wezel);
      poprz = k.wezel;
    }
    return s + odl(poprz, start);
  };
  const czas = (t: Kandydat[]) => dlugosc(t) / mNaMin + t.length * p.minutNaMiejsce;

  let pominiete = 0;
  for (const k of kandydaci) {
    let najlepsza: Kandydat[] | null = null;
    let najlepszyCzas = Infinity;
    for (let i = 0; i <= trasa.length; i++) {
      const nowa = [...trasa.slice(0, i), k, ...trasa.slice(i)];
      const c = czas(nowa);
      if (c < najlepszyCzas) {
        najlepszyCzas = c;
        najlepsza = nowa;
      }
    }
    if (najlepsza && najlepszyCzas <= p.budzetMin) trasa = najlepsza;
    else pominiete++;
  }

  // Złożenie spaceru z odcinków i czasy dotarcia.
  const wszystkie: string[] = [];
  const przystanki: Przystanek[] = [];
  let poprz = start;
  let minuta = 0;
  trasa.forEach((k, i) => {
    wszystkie.push(...(k.wezel === poprz ? [] : sciezka(drzewo(poprz), k.wezel)));
    minuta += odl(poprz, k.wezel) / mNaMin;
    przystanki.push({
      nr: i + 1,
      pozycjaWRankingu: k.pozycja,
      odcinekId: k.r.odcinekId,
      odcinki: k.r.odcinki,
      wezel: k.wezel,
      cechy: k.r.brakujaceCechy,
      dotarcieMin: Math.round(minuta),
    });
    minuta += p.minutNaMiejsce;
    poprz = k.wezel;
  });
  if (poprz !== start) wszystkie.push(...sciezka(drzewo(poprz), start));

  const dystansM = dlugosc(trasa);
  const marszMin = dystansM / mNaMin;
  const kontrolaMin = trasa.length * p.minutNaMiejsce;
  return {
    przystanki,
    odcinki: wszystkie,
    dystansM: Math.round(dystansM),
    marszMin: Math.round(marszMin),
    kontrolaMin,
    razemMin: Math.round(marszMin + kontrolaMin),
    pominiete,
  };
}
