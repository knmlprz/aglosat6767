// Trasy po grafie pieszym. Działa w przeglądarce i w skryptach, bez zależności.
// Trzy rodzaje trasy:
// - piesza: wszystkie odcinki, bez profilu (mianownik współczynnika objazdu),
// - udokumentowana: tylko odcinki przejezdne dla profilu,
// - wymagająca weryfikacji: przejezdne + nieznane; najpierw najmniej niewiadomych,
//   potem najkrótsza, z limitem objazdu.

import type { Odcinek, Profil, Obserwacja, Weryfikacja } from "./types.ts";
import { ocenOdcinek, type OcenaOdcinka } from "./profile.ts";
import { stanOdcinka } from "./status.ts";

export type Graf = {
  odcinki: Map<string, Odcinek>;
  sasiedzi: Map<string, { odcinekId: string; do: string }[]>;
};

export function zbudujGraf(odcinki: Odcinek[]): Graf {
  const mapa = new Map<string, Odcinek>();
  const sasiedzi = new Map<string, { odcinekId: string; do: string }[]>();
  const dodaj = (z: string, odcinekId: string, doW: string) => {
    let lista = sasiedzi.get(z);
    if (!lista) sasiedzi.set(z, (lista = []));
    lista.push({ odcinekId, do: doW });
  };
  for (const o of odcinki) {
    mapa.set(o.id, o);
    dodaj(o.a, o.id, o.b);
    dodaj(o.b, o.id, o.a);
  }
  return { odcinki: mapa, sasiedzi };
}

export function ocenWszystkie(
  odcinki: Odcinek[],
  obserwacje: Obserwacja[],
  weryfikacje: Weryfikacja[],
  profil: Profil,
): Map<string, OcenaOdcinka> {
  const wynik = new Map<string, OcenaOdcinka>();
  for (const o of odcinki) wynik.set(o.id, ocenOdcinek(stanOdcinka(o, obserwacje, weryfikacje), profil));
  return wynik;
}

// --- kopiec binarny ---------------------------------------------------------

class Kopiec {
  private k: [number, string][] = [];
  get rozmiar() {
    return this.k.length;
  }
  dodaj(p: number, w: string) {
    const k = this.k;
    k.push([p, w]);
    let i = k.length - 1;
    while (i > 0) {
      const r = (i - 1) >> 1;
      if (k[r][0] <= k[i][0]) break;
      [k[r], k[i]] = [k[i], k[r]];
      i = r;
    }
  }
  zdejmij(): [number, string] {
    const k = this.k;
    const top = k[0];
    const last = k.pop()!;
    if (k.length > 0) {
      k[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const p = l + 1;
        let m = i;
        if (l < k.length && k[l][0] < k[m][0]) m = l;
        if (p < k.length && k[p][0] < k[m][0]) m = p;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return top;
  }
}

// --- Dijkstra ----------------------------------------------------------------

export type Drzewo = {
  koszt: Map<string, number>;
  dlugosc: Map<string, number>;
  poprzedni: Map<string, { odcinekId: string; z: string }>;
};

export type OpcjeDijkstry = {
  /** Czy wolno przejść odcinkiem. */
  dopusc: (odcinekId: string) => boolean;
  /** Dodatkowy koszt odcinka ponad długość, np. kara za niewiadomą. */
  kara?: (odcinekId: string) => number;
  /** Nie szukaj dalej niż tyle metrów długości. */
  maxM?: number;
};

export function dijkstra(graf: Graf, start: string, opcje: OpcjeDijkstry): Drzewo {
  const koszt = new Map<string, number>([[start, 0]]);
  const dlugosc = new Map<string, number>([[start, 0]]);
  const poprzedni = new Map<string, { odcinekId: string; z: string }>();
  const zamkniete = new Set<string>();
  const kopiec = new Kopiec();
  kopiec.dodaj(0, start);
  const maxM = opcje.maxM ?? Infinity;

  while (kopiec.rozmiar > 0) {
    const [k, w] = kopiec.zdejmij();
    if (zamkniete.has(w)) continue;
    zamkniete.add(w);
    for (const { odcinekId, do: nast } of graf.sasiedzi.get(w) ?? []) {
      if (zamkniete.has(nast) || !opcje.dopusc(odcinekId)) continue;
      const odc = graf.odcinki.get(odcinekId)!;
      const nowaDl = dlugosc.get(w)! + odc.dlugoscM;
      if (nowaDl > maxM) continue;
      const nowyK = k + odc.dlugoscM + (opcje.kara?.(odcinekId) ?? 0);
      if (nowyK < (koszt.get(nast) ?? Infinity)) {
        koszt.set(nast, nowyK);
        dlugosc.set(nast, nowaDl);
        poprzedni.set(nast, { odcinekId, z: w });
        kopiec.dodaj(nowyK, nast);
      }
    }
  }
  return { koszt, dlugosc, poprzedni };
}

export function sciezka(drzewo: Drzewo, cel: string): string[] {
  const wynik: string[] = [];
  let w = cel;
  for (let p = drzewo.poprzedni.get(w); p; p = drzewo.poprzedni.get(w)) {
    wynik.push(p.odcinekId);
    w = p.z;
  }
  return wynik.reverse();
}

// --- trasy dla relacji start–cel ----------------------------------------------

export type Trasa = {
  odcinki: string[];
  dlugoscM: number;
  /** Odcinki, których przejezdność dla profilu jest nieznana. */
  niewiadome: string[];
};

export type TrasyRelacji = {
  piesza: Trasa | null;
  udokumentowana: Trasa | null;
  weryfikacji: Trasa | null;
  /** Długość trasy udokumentowanej / długość pieszej. Tylko gdy obie istnieją. */
  wspolczynnikObjazdu: number | null;
};

/** Trasa wymagająca weryfikacji może być co najwyżej o tyle dłuższa od najkrótszej z niewiadomymi. */
export const LIMIT_OBJAZDU = 1.5;
const KARY_ZA_NIEWIADOMA = [1e6, 400, 150, 50, 0];

function trasaDo(drzewo: Drzewo, cel: string, oceny: Map<string, OcenaOdcinka>): Trasa | null {
  if (!drzewo.dlugosc.has(cel)) return null;
  const odc = sciezka(drzewo, cel);
  return {
    odcinki: odc,
    dlugoscM: drzewo.dlugosc.get(cel)!,
    niewiadome: odc.filter((id) => oceny.get(id)?.przejezdnosc === "nieznany"),
  };
}

export function trasyRelacji(
  graf: Graf,
  oceny: Map<string, OcenaOdcinka>,
  start: string,
  cel: string,
): TrasyRelacji {
  const p = (id: string) => oceny.get(id)?.przejezdnosc;

  const piesza = trasaDo(dijkstra(graf, start, { dopusc: () => true }), cel, oceny);
  const udokumentowana = trasaDo(
    dijkstra(graf, start, { dopusc: (id) => p(id) === "przejezdny" }),
    cel,
    oceny,
  );

  const dopuscWer = (id: string) => p(id) !== "nieprzejezdny";
  const najkrotszaWer = trasaDo(dijkstra(graf, start, { dopusc: dopuscWer }), cel, oceny);
  let weryfikacji: Trasa | null = null;
  if (najkrotszaWer) {
    const limit = najkrotszaWer.dlugoscM * LIMIT_OBJAZDU;
    for (const kara of KARY_ZA_NIEWIADOMA) {
      const t = trasaDo(
        dijkstra(graf, start, { dopusc: dopuscWer, kara: (id) => (p(id) === "nieznany" ? kara : 0) }),
        cel,
        oceny,
      );
      if (t && t.dlugoscM <= limit) {
        weryfikacji = t;
        break;
      }
    }
    weryfikacji ??= najkrotszaWer;
  }

  return {
    piesza,
    udokumentowana,
    weryfikacji,
    wspolczynnikObjazdu: piesza && udokumentowana ? udokumentowana.dlugoscM / Math.max(piesza.dlugoscM, 1) : null,
  };
}
