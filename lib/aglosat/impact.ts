// Priorytet weryfikacji: wpływ zamknięcia odcinka na dojścia z budynków mieszkalnych do usług.
// Liczony przez skrypt dla całego obszaru (analiza bazowa). Wynik mówi, że odcinek jest istotny,
// nie że jego sprawdzenie rozstrzygnie trasę.

import type { Budynek, KategoriaUslugi, Odcinek, Pilot, Profil, Usluga, WynikWplywu } from "./types.ts";
import type { OcenaOdcinka } from "./profile.ts";
import { dijkstra, sciezka, trasyRelacji, zbudujGraf, type Drzewo } from "./routing.ts";

/** Dalej niż tyle metrów nie liczymy relacji budynek–usługa. */
export const MAX_DOJSCIE_M = 1200;

type Relacja = {
  budynek: Budynek;
  kategoria: KategoriaUslugi;
  usluga: Usluga;
  dlugoscM: number;
  odcinki: string[];
};

function najblizsza(drzewo: Drzewo, uslugi: Usluga[]): { usluga: Usluga; dlugoscM: number } | null {
  let best: { usluga: Usluga; dlugoscM: number } | null = null;
  for (const u of uslugi) {
    const d = drzewo.dlugosc.get(u.wezel);
    if (d !== undefined && (!best || d < best.dlugoscM)) best = { usluga: u, dlugoscM: d };
  }
  return best;
}

export type Analiza = {
  ranking: WynikWplywu[];
  mianownik: Pilot["mianownik"];
  kandydaci: Pilot["kandydaci"];
};

export function policzAnalize(
  odcinki: Odcinek[],
  budynki: Budynek[],
  uslugi: Usluga[],
  oceny: Map<string, OcenaOdcinka>,
  profil: Profil,
  wagi: "zabudowa" | "rowne" = "zabudowa",
): Analiza {
  const graf = zbudujGraf(odcinki);
  const p = (id: string) => oceny.get(id)?.przejezdnosc;
  const dopuscWer = (id: string) => p(id) !== "nieprzejezdny";
  const dopuscDok = (id: string) => p(id) === "przejezdny";

  const kategorie = [...new Set(uslugi.map((u) => u.kategoria))];
  const wgKategorii = new Map(kategorie.map((k) => [k, uslugi.filter((u) => u.kategoria === k)]));
  const sredniaWaga = budynki.reduce((s, b) => s + b.waga, 0) / Math.max(budynki.length, 1);
  const waga = (b: Budynek) => (wagi === "rowne" ? 1 : b.waga / sredniaWaga);

  const relacje: Relacja[] = [];
  const mianownik = { profilId: profil.id, relacje: 0, udokumentowane: 0, wymagajaceWeryfikacji: 0, bezPrzejscia: 0 };
  const kandydaci: Pilot["kandydaci"] = [];

  for (const b of budynki) {
    const piesze = dijkstra(graf, b.wezel, { dopusc: () => true, maxM: MAX_DOJSCIE_M });
    const wer = dijkstra(graf, b.wezel, { dopusc: dopuscWer, maxM: MAX_DOJSCIE_M });
    const dok = dijkstra(graf, b.wezel, { dopusc: dopuscDok, maxM: MAX_DOJSCIE_M });

    for (const k of kategorie) {
      const lista = wgKategorii.get(k)!;
      const pieszo = najblizsza(piesze, lista);
      if (!pieszo) continue; // poza zasięgiem nawet bez profilu: relacja poza obszarem analizy
      mianownik.relacje++;
      const w = najblizsza(wer, lista);
      if (najblizsza(dok, lista)) mianownik.udokumentowane++;
      else if (w) mianownik.wymagajaceWeryfikacji++;
      else mianownik.bezPrzejscia++;
      if (w) {
        relacje.push({ budynek: b, kategoria: k, usluga: w.usluga, dlugoscM: w.dlugoscM, odcinki: sciezka(wer, w.usluga.wezel) });
      }
    }

    // Kandydaci na skrajny przypadek: blisko pieszo, a trasy udokumentowanej brak albo jest dużo dłuższa.
    for (const u of uslugi) {
      if (u.kategoria !== "przychodnia" && u.kategoria !== "apteka") continue;
      const dp = piesze.dlugosc.get(u.wezel);
      if (dp === undefined || dp < 80 || dp > 400) continue;
      const dd = dok.dlugosc.get(u.wezel);
      if (dd !== undefined && dd < 2 * dp) continue;
      const t = trasyRelacji(graf, oceny, b.wezel, u.wezel);
      if (!t.weryfikacji || t.weryfikacji.niewiadome.length === 0 || t.weryfikacji.niewiadome.length > 2) continue;
      kandydaci.push({
        budynekId: b.id,
        uslugaId: u.id,
        pieszoM: Math.round(dp),
        weryfikacjiM: Math.round(t.weryfikacji.dlugoscM),
        udokumentowanaM: t.udokumentowana ? Math.round(t.udokumentowana.dlugoscM) : null,
        niewiadome: t.weryfikacji.niewiadome,
      });
    }
  }

  // Które relacje przechodzą przez który nieznany odcinek.
  const przezOdcinek = new Map<string, Relacja[]>();
  for (const r of relacje) {
    for (const id of r.odcinki) {
      if (p(id) !== "nieznany") continue;
      let l = przezOdcinek.get(id);
      if (!l) przezOdcinek.set(id, (l = []));
      l.push(r);
    }
  }

  const ranking: WynikWplywu[] = [];
  for (const [odcinekId, rel] of przezOdcinek) {
    const wgBudynku = new Map<Budynek, Relacja[]>();
    for (const r of rel) {
      const l = wgBudynku.get(r.budynek) ?? [];
      l.push(r);
      wgBudynku.set(r.budynek, l);
    }
    let wynik = 0;
    let utracone = 0;
    let wydluzone = 0;
    let sumaDodatkowej = 0;
    let dotknieta = 0;
    const dotknieteUslugi = new Set<string>();

    for (const [b, lista] of wgBudynku) {
      const bez = dijkstra(graf, b.wezel, { dopusc: (id) => id !== odcinekId && dopuscWer(id), maxM: MAX_DOJSCIE_M });
      for (const r of lista) {
        const nowa = najblizsza(bez, wgKategorii.get(r.kategoria)!);
        dotknieteUslugi.add(r.usluga.nazwa);
        if (!nowa) {
          utracone++;
          wynik += waga(b);
          dotknieta += waga(b);
          continue;
        }
        const extra = nowa.dlugoscM - r.dlugoscM;
        if (extra > 1) {
          wydluzone++;
          sumaDodatkowej += extra;
          wynik += waga(b) * Math.min(1, extra / Math.max(r.dlugoscM, 1));
          dotknieta += waga(b);
        }
      }
    }
    if (wynik <= 0) continue;
    ranking.push({
      odcinekId,
      profilId: profil.id,
      wynik: Math.round(wynik * 1000) / 1000,
      utraconeRelacje: utracone,
      wydluzoneRelacje: wydluzone,
      dodatkowaDrogaM: wydluzone ? Math.round(sumaDodatkowej / wydluzone) : 0,
      dotknietaWaga: Math.round(dotknieta * 100) / 100,
      uslugi: [...dotknieteUslugi].sort(),
      brakujaceCechy: oceny.get(odcinekId)?.nieznane ?? [],
    });
  }
  ranking.sort((x, y) => y.wynik - x.wynik);

  const wagaBud = new Map(budynki.map((b) => [b.id, b.waga]));
  kandydaci.sort((x, y) => (wagaBud.get(y.budynekId)! - wagaBud.get(x.budynekId)!) || x.pieszoM - y.pieszoM);

  return { ranking, mianownik, kandydaci: kandydaci.slice(0, 20) };
}
