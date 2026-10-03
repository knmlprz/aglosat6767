// Priorytet weryfikacji: wpływ zamknięcia odcinka na dojścia z budynków mieszkalnych do usług.
// Liczony przez skrypt dla całego obszaru (analiza bazowa). Wynik mówi, że odcinek jest istotny,
// nie że jego sprawdzenie rozstrzygnie trasę.

import type { Budynek, KategoriaUslugi, Odcinek, Pilot, Profil, Usluga, WynikWplywu } from "./types.ts";
import type { OcenaOdcinka } from "./profile.ts";
import { dijkstra, sciezka, trasyRelacji, zbudujGraf, type Drzewo } from "./routing.ts";

/** Dalej niż tyle metrów nie liczymy relacji budynek–usługa. */
export const MAX_DOJSCIE_M = 1200;
/** Skrajny przypadek ma być krótkim dojściem pieszo. */
const MAX_PIESZO_KANDYDATA_M = 500;

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

    // Kandydaci na skrajny przypadek: blisko pieszo, trasy udokumentowanej brak albo jest dużo dłuższa,
    // a niewiadoma po drodze rozstrzyga o dojściu (jako bariera odbiera trasę albo wydłuża ją o 30%+).
    for (const u of uslugi) {
      if (u.kategoria !== "przychodnia" && u.kategoria !== "apteka") continue;
      const dp = piesze.dlugosc.get(u.wezel);
      if (dp === undefined || dp < 80 || dp > MAX_PIESZO_KANDYDATA_M) continue;
      const dd = dok.dlugosc.get(u.wezel);
      if (dd !== undefined && dd < 2 * dp) continue;
      const t = trasyRelacji(graf, oceny, b.wezel, u.wezel);
      if (!t.weryfikacji || t.weryfikacji.niewiadome.length === 0 || t.weryfikacji.niewiadome.length > 2) continue;
      const bariery = new Set(t.weryfikacji.niewiadome);
      const gdyBariera = dijkstra(graf, b.wezel, { dopusc: (id) => !bariery.has(id) && dopuscWer(id) }).dlugosc.get(u.wezel);
      if (gdyBariera !== undefined && gdyBariera < 1.3 * t.weryfikacji.dlugoscM) continue;
      kandydaci.push({
        budynekId: b.id,
        uslugaId: u.id,
        pieszoM: Math.round(dp),
        weryfikacjiM: Math.round(t.weryfikacji.dlugoscM),
        udokumentowanaM: t.udokumentowana ? Math.round(t.udokumentowana.dlugoscM) : null,
        gdyBarieraM: gdyBariera === undefined ? null : Math.round(gdyBariera),
        niewiadome: t.weryfikacji.niewiadome,
      });
    }
  }

  // Miejsca do kontroli: sąsiednie nieznane odcinki z tymi samymi brakującymi cechami to jedna
  // wizyta w terenie. Podział linii w punktach podpięcia budynków tego nie zmienia.
  const miejsca = miejscaDoKontroli(odcinki, oceny);
  const miejsceOdcinka = new Map<string, string[]>();
  for (const m of miejsca) for (const id of m) miejsceOdcinka.set(id, m);

  // Które relacje przechodzą przez które miejsce (relacja liczona raz na miejsce).
  const przezMiejsce = new Map<string[], Set<Relacja>>();
  for (const r of relacje) {
    for (const id of r.odcinki) {
      const m = miejsceOdcinka.get(id);
      if (!m) continue;
      let l = przezMiejsce.get(m);
      if (!l) przezMiejsce.set(m, (l = new Set()));
      l.add(r);
    }
  }

  const ranking: WynikWplywu[] = [];
  for (const [miejsce, rel] of przezMiejsce) {
    const zamkniete = new Set(miejsce);
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
      const bez = dijkstra(graf, b.wezel, { dopusc: (id) => !zamkniete.has(id) && dopuscWer(id), maxM: MAX_DOJSCIE_M });
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
      odcinekId: miejsce[0],
      odcinki: miejsce,
      profilId: profil.id,
      wynik: Math.round(wynik * 1000) / 1000,
      utraconeRelacje: utracone,
      wydluzoneRelacje: wydluzone,
      dodatkowaDrogaM: wydluzone ? Math.round(sumaDodatkowej / wydluzone) : 0,
      dotknietaWaga: Math.round(dotknieta * 100) / 100,
      uslugi: [...dotknieteUslugi].sort(),
      brakujaceCechy: oceny.get(miejsce[0])?.nieznane ?? [],
    });
  }
  ranking.sort((x, y) => y.wynik - x.wynik);

  // Najpierw usługi z wejściem dostępnym według OSM, potem bez danych, na końcu wheelchair=no:
  // dojście do drzwi, przez które nie da się wjechać, nie jest dobrym przykładem. Potem przypadki,
  // w których bariera odbiera trasę całkowicie, potem skala budynku.
  const wagaBud = new Map(budynki.map((b) => [b.id, b.waga]));
  const wejscie = new Map(uslugi.map((u) => [u.id, u.wejscie?.wheelchair]));
  const rangaWejscia = (id: string) => ({ yes: 0, limited: 1, no: 3 })[wejscie.get(id) ?? ""] ?? 2;
  kandydaci.sort(
    (x, y) =>
      rangaWejscia(x.uslugaId) - rangaWejscia(y.uslugaId) ||
      Number(x.gdyBarieraM !== null) - Number(y.gdyBarieraM !== null) ||
      wagaBud.get(y.budynekId)! - wagaBud.get(x.budynekId)! ||
      x.pieszoM - y.pieszoM,
  );

  return { ranking, mianownik, kandydaci: kandydaci.slice(0, 20) };
}

/**
 * Grupuje nieznane odcinki w miejsca do kontroli: wspólny węzeł, te same brakujące cechy
 * i ta sama linia OSM (przejścia także między liniami).
 */
export function miejscaDoKontroli(odcinki: Odcinek[], oceny: Map<string, OcenaOdcinka>): string[][] {
  const nieznane = odcinki.filter((o) => oceny.get(o.id)?.przejezdnosc === "nieznany");
  // Przejście z wysepką to w OSM dwie linie ze wspólnym węzłem, ale w terenie jedna wizyta.
  const linia = (o: Odcinek) => (o.typ === "przejscie" ? "przejscie" : String(o.osmWayId));
  const klucz = (o: Odcinek) => `${linia(o)}|${[...oceny.get(o.id)!.nieznane].sort().join(",")}`;
  const rodzic = new Map(nieznane.map((o) => [o.id, o.id]));
  const znajdz = (x: string): string => {
    while (rodzic.get(x) !== x) {
      rodzic.set(x, rodzic.get(rodzic.get(x)!)!);
      x = rodzic.get(x)!;
    }
    return x;
  };
  const wgWezla = new Map<string, Odcinek[]>();
  for (const o of nieznane) {
    for (const w of [o.a, o.b]) wgWezla.set(`${w}|${klucz(o)}`, [...(wgWezla.get(`${w}|${klucz(o)}`) ?? []), o]);
  }
  for (const grupa of wgWezla.values()) {
    for (let i = 1; i < grupa.length; i++) rodzic.set(znajdz(grupa[i].id), znajdz(grupa[0].id));
  }
  const miejsca = new Map<string, string[]>();
  for (const o of nieznane) {
    const r = znajdz(o.id);
    miejsca.set(r, [...(miejsca.get(r) ?? []), o.id]);
  }
  return [...miejsca.values()].map((m) => m.sort());
}
