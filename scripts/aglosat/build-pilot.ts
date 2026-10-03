// Buduje public/aglosat/pilot.json z wycinka OSM.
// Uruchomienie: npm run aglosat:build
//
// Co jest prawdziwe: geometria sieci pieszej, tagi OSM (nawierzchnia, schody, krawężniki,
// szerokość, nachylenie), budynki, usługi, ranking i mianownik policzone na tym grafie.
// Co jest przykładowe (oznaczone polem przykladowe): obserwacje z obrazu, strefa zmian Sentinel-2.

import { readFileSync, writeFileSync } from "node:fs";
import { OBSZAR, ORTO, PRZYKLADOWE } from "./config.ts";
import type {
  Budynek, Dowod, KategoriaUslugi, LatLon, Obserwacja, Odcinek, Pilot, StrefaZmian, TypOdcinka, Usluga, Wycinek,
} from "../../lib/aglosat/types.ts";
import { PROFIL_DOMYSLNY } from "../../lib/aglosat/profile.ts";
import { ocenWszystkie } from "../../lib/aglosat/routing.ts";
import { policzAnalize } from "../../lib/aglosat/impact.ts";
import { OPIS_ISTNIENIA_W_OSM, OPIS_ZALOZENIA_KRAWEZNIKA, zwinPilot } from "../../lib/aglosat/data.ts";
import { osmDostepnoscZTagow } from "../../lib/aglosat/osm.ts";
import type { OsmDostepnosc } from "../../lib/aglosat/types.ts";

type N = { id: number; lat: number; lon: number; tags?: Record<string, string> };
type W = { id: number; nodes: number[]; tags: Record<string, string> } & Partial<OsmDostepnosc>;
const surowe = JSON.parse(readFileSync("data/aglosat/osm-extract.json", "utf8")) as {
  pobrano: string; nodes: N[]; ways: W[];
};
const DATA_OSM = surowe.pobrano;
const nodes = new Map(surowe.nodes.map((n) => [n.id, n]));

// --- geometria -------------------------------------------------------------------

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
function odl(a: LatLon, b: LatLon): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const ll = (n: N): LatLon => [Math.round(n.lat * 1e6) / 1e6, Math.round(n.lon * 1e6) / 1e6];
const [S, Wb, Nb, E] = OBSZAR.bboxGrafu;
const wGrafie = (n: N) => n.lat >= S && n.lat <= Nb && n.lon >= Wb && n.lon <= E;

function srodekIPole(ids: number[]): { lat: number; lon: number; pole: number } {
  const pts = ids.map((i) => nodes.get(i)).filter((n): n is N => !!n);
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon0 = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  const kx = R * Math.cos(rad(lat0)) * (Math.PI / 180);
  const ky = R * (Math.PI / 180);
  let pole = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = (pts[i].lon - lon0) * kx, y1 = (pts[i].lat - lat0) * ky;
    const x2 = (pts[i + 1].lon - lon0) * kx, y2 = (pts[i + 1].lat - lat0) * ky;
    pole += x1 * y2 - x2 * y1;
  }
  return { lat: lat0, lon: lon0, pole: Math.abs(pole) / 2 };
}

// --- losowanie z ziarnem (dane przykładowe) ----------------------------------------

let ziarno = PRZYKLADOWE.ziarno;
function los(): number {
  ziarno |= 0; ziarno = (ziarno + 0x6d2b79f5) | 0;
  let t = Math.imul(ziarno ^ (ziarno >>> 15), 1 | ziarno);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// --- wybór linii sieci pieszej -------------------------------------------------------

const PIESZE = new Set(["footway", "path", "pedestrian", "steps", "living_street", "cycleway", "track", "service", "residential"]);
function piesza(w: W): boolean {
  const t = w.tags;
  if (!PIESZE.has(t.highway)) return false;
  if (t.foot === "no" || t.area === "yes") return false;
  if ((t.access === "private" || t.access === "no") && t.foot !== "yes" && t.foot !== "designated") return false;
  if (t.service === "parking_aisle") return false;
  return w.nodes.some((id) => { const n = nodes.get(id); return n && wGrafie(n); });
}
const linie = surowe.ways.filter(piesza);

function typLinii(t: Record<string, string>): TypOdcinka {
  if (t.highway === "steps") return "schody";
  if (t.footway === "crossing") return "przejscie";
  if (t.footway === "sidewalk") return "chodnik";
  if (t.highway === "footway" || t.highway === "pedestrian") return "ciag_pieszy";
  if (t.highway === "path" || t.highway === "cycleway" || t.highway === "track") return "sciezka";
  return "droga_osiedlowa";
}

// --- budynki i usługi ------------------------------------------------------------------

const MIESZKALNE = new Set(["apartments", "residential", "house", "detached", "semidetached_house", "terrace"]);
const wezlySieci = new Map<number, N>();
for (const w of linie) for (const id of w.nodes) { const n = nodes.get(id); if (n && wGrafie(n)) wezlySieci.set(id, n); }
const listaWezlow = [...wezlySieci.values()];

function najblizszyWezel(lat: number, lon: number, maxM: number): N | null {
  let best: N | null = null, bd = Infinity;
  for (const n of listaWezlow) {
    const d = odl([lat, lon], [n.lat, n.lon]);
    if (d < bd) { bd = d; best = n; }
  }
  return bd <= maxM ? best : null;
}

type BudynekSurowy = Omit<Budynek, "wezel"> & { wezelOsm: number };
const budynkiSurowe: BudynekSurowy[] = [];
const kondygnacjeZnane: Record<string, number[]> = {};
for (const w of surowe.ways) {
  const b = w.tags.building;
  if (!b || !MIESZKALNE.has(b)) continue;
  const lv = Number(w.tags["building:levels"]);
  if (lv > 0) (kondygnacjeZnane[b] ??= []).push(lv);
}
const mediana = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const w of surowe.ways) {
  const b = w.tags.building;
  if (!b || !MIESZKALNE.has(b)) continue;
  const { lat, lon, pole } = srodekIPole(w.nodes);
  if (!wGrafie({ id: 0, lat, lon })) continue;
  const n = najblizszyWezel(lat, lon, 80);
  if (!n) continue;
  const lv = Number(w.tags["building:levels"]);
  const znane = lv > 0;
  const kondygnacje = znane ? lv : (mediana(kondygnacjeZnane[b] ?? []) ?? (b === "apartments" ? 4 : 2));
  const adres = w.tags["addr:street"] ? `${w.tags["addr:street"]} ${w.tags["addr:housenumber"] ?? ""}`.trim()
    : w.tags["addr:place"] ? `${w.tags["addr:place"]} ${w.tags["addr:housenumber"] ?? ""}`.trim() : undefined;
  budynkiSurowe.push({
    id: `b${w.id}`, osmWayId: w.id, lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6,
    wezelOsm: n.id, adres, powierzchniaM2: Math.round(pole), kondygnacje, kondygnacjePrzyblizone: !znane,
    waga: Math.round(pole * kondygnacje),
  });
}

function kategoria(t: Record<string, string>): KategoriaUslugi | null {
  if (t.amenity === "pharmacy") return "apteka";
  if ((t.amenity === "doctors" || t.amenity === "clinic") && !(t.name ?? "").startsWith("Budynek")) return "przychodnia";
  if (t.shop === "supermarket" || t.shop === "convenience") return "sklep";
  if (t.amenity === "post_office") return "poczta";
  if (t.amenity === "library") return "biblioteka";
  return null;
}
type UslugaSurowa = Omit<Usluga, "wezel"> & { wezelOsm: number };
const uslugiSurowe: UslugaSurowa[] = [];
for (const el of [...surowe.nodes.map((n) => ({ ...n, typ: "node" as const })), ...surowe.ways.map((w) => ({ ...w, typ: "way" as const }))]) {
  const t = el.tags;
  if (!t) continue;
  const k = kategoria(t);
  if (!k) continue;
  const pos = el.typ === "node" ? { lat: (el as N).lat, lon: (el as N).lon } : srodekIPole((el as W).nodes);
  if (!wGrafie({ id: 0, ...pos })) continue;
  const n = najblizszyWezel(pos.lat, pos.lon, 120);
  if (!n) continue;
  uslugiSurowe.push({
    id: `u${el.typ[0]}${el.id}`, osmRef: `${el.typ}/${el.id}`, kategoria: k,
    nazwa: t.name ?? `${k} (bez nazwy w OSM)`, lat: Math.round(pos.lat * 1e6) / 1e6, lon: Math.round(pos.lon * 1e6) / 1e6,
    wezelOsm: n.id, wejscie: t.wheelchair ? { wheelchair: t.wheelchair } : undefined,
  });
}

// --- podział linii na odcinki ------------------------------------------------------------

const uzycia = new Map<number, number>();
for (const w of linie) for (const id of w.nodes) uzycia.set(id, (uzycia.get(id) ?? 0) + 1);
const kotwice = new Set<number>([...budynkiSurowe.map((b) => b.wezelOsm), ...uslugiSurowe.map((u) => u.wezelOsm)]);
const podzial = (id: number, i: number, w: W) =>
  i === 0 || i === w.nodes.length - 1 || (uzycia.get(id) ?? 0) > 1 || kotwice.has(id);

const KRAWEZNIK: Record<string, string> = { lowered: "obnizony", flush: "zrownany", no: "zrownany", raised: "wysoki" };
const PORZADEK_KRAWEZNIKA = ["nie_dotyczy", "zrownany", "obnizony", "wysoki"];

function dowodOsm(wartosc: Dowod["wartosc"], ref: string, opis?: string): Dowod {
  return { zrodlo: "osm", wartosc, data: DATA_OSM, rodzajDaty: "pobrania", ref, ...(opis ? { opis } : {}) };
}

function dowodyOdcinka(w: W, ids: number[], typ: TypOdcinka): Odcinek["dowody"] {
  const t = w.tags;
  const d: Odcinek["dowody"] = {};
  d.ciaglosc = [dowodOsm("ciagly", `highway=${t.highway}`, OPIS_ISTNIENIA_W_OSM)];

  const stopien = ids.slice(1, -1).some((id) => nodes.get(id)?.tags?.barrier === "step");
  d.schody = [t.highway === "steps" ? dowodOsm(true, "highway=steps")
    : stopien ? dowodOsm(true, "barrier=step", "stopień na odcinku") : dowodOsm(false, `highway=${t.highway}`)];

  const surface = t.surface ?? t["footway:surface"];
  if (surface) d.nawierzchnia = [dowodOsm(surface, `surface=${surface}`)];

  // Krawężniki w OSM leżą na węzłach. Przejście bierze także węzły końcowe (styk z chodnikiem).
  const doSprawdzenia = typ === "przejscie" ? ids : ids.slice(1, -1);
  const krawezniki: Dowod[] = [];
  for (const id of doSprawdzenia) {
    const nt = nodes.get(id)?.tags;
    if (!nt) continue;
    const h = Number(nt["kerb:height"]?.replace(/[^\d.]/g, ""));
    // kerb:height bez jednostki jest w metrach
    if (h > 0) krawezniki.push(dowodOsm(Math.round(nt["kerb:height"].includes("cm") ? h : h * 100), `node/${id} kerb:height=${nt["kerb:height"]}`));
    else if (nt.kerb && KRAWEZNIK[nt.kerb]) krawezniki.push(dowodOsm(KRAWEZNIK[nt.kerb], `node/${id} kerb=${nt.kerb}`));
  }
  if (t.kerb && KRAWEZNIK[t.kerb]) krawezniki.push(dowodOsm(KRAWEZNIK[t.kerb], `kerb=${t.kerb}`));
  if (krawezniki.length > 0) {
    // Odcinek jest tak dobry, jak jego najgorszy krawężnik: jeden dowód z najgorszą wartością.
    const najgorszy = krawezniki.sort((x, y) => {
      const v = (q: Dowod) => (typeof q.wartosc === "number" ? q.wartosc : PORZADEK_KRAWEZNIKA.indexOf(String(q.wartosc)) * 4);
      return v(y) - v(x);
    })[0];
    d.kraweznik = [{ ...najgorszy, opis: `najwyższy z ${krawezniki.length} krawężników na odcinku` }];
  } else if (typ !== "przejscie") {
    d.kraweznik = [{
      zrodlo: "zalozenie", wartosc: "nie_dotyczy", data: DATA_OSM, rodzajDaty: "pobrania",
      opis: OPIS_ZALOZENIA_KRAWEZNIKA,
    }];
  }

  const width = t.width ?? t["footway:width"];
  const wM = Number(width?.replace(",", ".").replace(/[^\d.]/g, ""));
  if (wM > 0) d.szerokosc = [dowodOsm(Math.round(wM * 100), `width=${width}`)];

  const inc = t.incline?.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (inc) d.nachylenie = [dowodOsm(Number(inc[1]), `incline=${t.incline}`)];
  return d;
}

// Oznaczenia dotykowe leżą zwykle na węzłach przejść, rzadziej na way.
// Przejście bierze też węzły końcowe (jak przy krawężnikach); inne odcinki tylko węzły wewnętrzne.
function tactileOdcinka(w: W, ids: number[], typ: TypOdcinka): string | null {
  if (w.tags.tactile_paving) return w.tags.tactile_paving;
  const doSprawdzenia = typ === "przejscie" ? ids : ids.slice(1, -1);
  const wartosci = new Set(doSprawdzenia.map((id) => nodes.get(id)?.tags?.tactile_paving).filter((v): v is string => !!v));
  if (wartosci.size === 0) return null;
  if (wartosci.size === 1) return [...wartosci][0];
  return wartosci.has("yes") ? "partial" : [...wartosci].join(";");
}

// Światła i ich sygnalizacja dla niewidomych leżą na węzłach (highway=traffic_signals, crossing=traffic_signals).
// Wynik: "none" | "sound" | "vibration" | "sound;vibration" | "unknown"; null, gdy odcinek nie ma świateł.
function sygnalizacjaOdcinka(w: W, ids: number[], typ: TypOdcinka): string | null {
  const zrodla: Record<string, string>[] = [w.tags];
  const doSprawdzenia = typ === "przejscie" ? ids : ids.slice(1, -1);
  for (const id of doSprawdzenia) { const t = nodes.get(id)?.tags; if (t) zrodla.push(t); }
  const swiatla = zrodla.filter((t) =>
    t.highway === "traffic_signals" || t.crossing === "traffic_signals" ||
    t["traffic_signals:sound"] !== undefined || t["traffic_signals:vibration"] !== undefined);
  if (swiatla.length === 0) return null;
  const tak = (k: string) => swiatla.some((t) => t[k] === "yes");
  const nie = (k: string) => swiatla.some((t) => t[k] === "no");
  const rodzaje = [tak("traffic_signals:sound") && "sound", tak("traffic_signals:vibration") && "vibration"].filter(Boolean);
  if (rodzaje.length > 0) return rodzaje.join(";");
  return nie("traffic_signals:sound") && nie("traffic_signals:vibration") ? "none" : "unknown";
}

const odcinki: Odcinek[] = [];
const wezly: Record<string, LatLon> = {};
for (const w of linie) {
  const typ = typLinii(w.tags);
  let poczatek = 0;
  for (let i = 1; i < w.nodes.length; i++) {
    if (!podzial(w.nodes[i], i, w)) continue;
    const ids = w.nodes.slice(poczatek, i + 1);
    poczatek = i;
    const pts = ids.map((id) => nodes.get(id)).filter((n): n is N => !!n);
    if (pts.length < 2 || !pts.some(wGrafie)) continue;
    const geometria = pts.map(ll);
    let dl = 0;
    for (let j = 1; j < geometria.length; j++) dl += odl(geometria[j - 1], geometria[j]);
    if (dl < 0.5) continue;
    const a = `n${ids[0]}`, b = `n${ids[ids.length - 1]}`;
    wezly[a] = geometria[0];
    wezly[b] = geometria[geometria.length - 1];
    odcinki.push({
      id: `s${w.id}_${odcinki.length}`, a, b, geometria, dlugoscM: Math.round(dl * 10) / 10, osmWayId: w.id, typ,
      ...(w.tags.name ? { nazwa: w.tags.name } : {}),
      dowody: dowodyOdcinka(w, ids, typ),
      osm: { ...osmDostepnoscZTagow(w.tags), tactile_paving: tactileOdcinka(w, ids, typ), traffic_signals: sygnalizacjaOdcinka(w, ids, typ) },
    });
  }
}

// Tylko największa spójna składowa: wyspy bez połączenia nie wnoszą tras.
{
  const sas = new Map<string, string[]>();
  for (const o of odcinki) { (sas.get(o.a) ?? sas.set(o.a, []).get(o.a)!).push(o.b); (sas.get(o.b) ?? sas.set(o.b, []).get(o.b)!).push(o.a); }
  const skladowa = new Map<string, number>();
  let nr = 0; const rozmiary: number[] = [];
  for (const start of sas.keys()) {
    if (skladowa.has(start)) continue;
    const stos = [start]; skladowa.set(start, nr); let r = 0;
    while (stos.length) { const v = stos.pop()!; r++; for (const u of sas.get(v)!) if (!skladowa.has(u)) { skladowa.set(u, nr); stos.push(u); } }
    rozmiary.push(r); nr++;
  }
  const glowna = rozmiary.indexOf(Math.max(...rozmiary));
  for (let i = odcinki.length - 1; i >= 0; i--) if (skladowa.get(odcinki[i].a) !== glowna) odcinki.splice(i, 1);
  for (const k of Object.keys(wezly)) if (skladowa.get(k) !== glowna) delete wezly[k];
}

const budynki: Budynek[] = budynkiSurowe
  .map(({ wezelOsm, ...b }) => ({ ...b, wezel: `n${wezelOsm}` }))
  .filter((b) => wezly[b.wezel]);
const uslugi: Usluga[] = uslugiSurowe
  .map(({ wezelOsm, ...u }) => ({ ...u, wezel: `n${wezelOsm}` }))
  .filter((u) => wezly[u.wezel]);

// --- dane przykładowe: obserwacje z obrazu -------------------------------------------------

const UZASADNIENIA = {
  ciagly: ["nawierzchnia widoczna na całej długości odcinka", "jednolity pas nawierzchni wzdłuż przebiegu"],
  przerwany: ["pas nawierzchni urywa się w połowie odcinka", "na przebiegu widoczny pas trawy lub ziemi"],
  niewidoczny: ["odcinek zasłonięty koronami drzew", "cień budynku zasłania przebieg"],
};
const doObserwacji = odcinki.filter((o) => (o.typ === "chodnik" || o.typ === "ciag_pieszy") && o.dlugoscM > 15);
const obserwacje: Obserwacja[] = [];
const wybrane = new Set<string>();
const KLASY: [keyof typeof UZASADNIENIA, number, [number, number]][] = [
  ["ciagly", 18, [0.72, 0.96]], ["niewidoczny", 6, [0.4, 0.6]], ["przerwany", 6, [0.55, 0.86]],
];
for (const [klasa, ile, [min, max]] of KLASY) {
  for (let i = 0; i < ile; i++) {
    let o: Odcinek;
    do o = doObserwacji[Math.floor(los() * doObserwacji.length)]; while (wybrane.has(o.id));
    wybrane.add(o.id);
    obserwacje.push({
      id: `obs${obserwacje.length + 1}`, odcinekId: o.id, cecha: "ciaglosc", klasa,
      ocena: Math.round((min + los() * (max - min)) * 100) / 100,
      dataObrazu: PRZYKLADOWE.dataObrazu, zrodloObrazu: PRZYKLADOWE.zrodloObrazu,
      uzasadnienie: UZASADNIENIA[klasa][Math.floor(los() * 2)], wycinek: null, przykladowe: true,
    });
  }
}

// --- dane przykładowe: strefa zmian Sentinel-2 wokół budowy z OSM ----------------------------

const strefyZmian: StrefaZmian[] = [];
const budowa = surowe.ways.find((w) => w.tags.highway === "construction" && w.nodes.some((id) => { const n = nodes.get(id); return n && wGrafie(n); }));
if (budowa) {
  const { lat, lon } = srodekIPole(budowa.nodes);
  const dLat = 60 / 111320, dLon = 60 / (111320 * Math.cos(rad(lat)));
  const wielokat: LatLon[] = [[lat - dLat, lon - dLon], [lat - dLat, lon + dLon], [lat + dLat, lon + dLon], [lat + dLat, lon - dLon]];
  strefyZmian.push({
    id: "sz1", wielokat, scenaPrzed: PRZYKLADOWE.scenaPrzed, scenaPo: PRZYKLADOWE.scenaPo, ilustracja: true,
    opis: `Ilustracja: strefa wokół budowy oznaczonej w OSM (way/${budowa.id}); para scen przykładowa.`,
  });
  for (const o of odcinki) {
    if (o.geometria.some(([y, x]) => Math.abs(y - lat) <= dLat && Math.abs(x - lon) <= dLon)) o.strefaZmian = "sz1";
  }
}

// --- analiza bazowa ----------------------------------------------------------------------

const oceny = ocenWszystkie(odcinki, obserwacje, [], PROFIL_DOMYSLNY);
const t0 = Date.now();
const analiza = policzAnalize(odcinki, budynki, uslugi, oceny, PROFIL_DOMYSLNY);

// --- wycinki ortofotomapy: obserwacje modelu, miejsca z rankingu, niewiadome kandydatów ----------

const odcinekPoId = new Map(odcinki.map((o) => [o.id, o]));
function bboxWycinka(geometrie: LatLon[]): [number, number, number, number] {
  const lat = geometrie.map((p) => p[0]), lon = geometrie.map((p) => p[1]);
  const sLat = (Math.min(...lat) + Math.max(...lat)) / 2, sLon = (Math.min(...lon) + Math.max(...lon)) / 2;
  const kLon = 111320 * Math.cos(rad(sLat));
  const zasieg = Math.max((Math.max(...lat) - Math.min(...lat)) * 111320, (Math.max(...lon) - Math.min(...lon)) * kLon);
  const bok = Math.min(120, Math.max(50, zasieg + 30));
  const dLat = bok / 2 / 111320, dLon = bok / 2 / kLon;
  const r = (x: number) => Math.round(x * 1e7) / 1e7;
  return [r(sLat - dLat), r(sLon - dLon), r(sLat + dLat), r(sLon + dLon)];
}
const wycinki: Wycinek[] = [];
const dodajWycinek = (odcinekId: string, odcinkiMiejsca: string[]) => {
  if (wycinki.some((w) => w.odcinekId === odcinekId)) return;
  const geometrie = odcinkiMiejsca.flatMap((id) => odcinekPoId.get(id)?.geometria ?? []);
  if (geometrie.length === 0) return;
  wycinki.push({
    id: `w_${odcinekId}`, odcinekId, plik: `/aglosat/wycinki/w_${odcinekId}.jpg`,
    bbox: bboxWycinka(geometrie), dataObrazu: ORTO.dataNalotu, zrodlo: ORTO.zrodlo,
  });
};
for (const r of analiza.ranking) dodajWycinek(r.odcinekId, r.odcinki);
for (const k of analiza.kandydaci) for (const id of k.niewiadome) dodajWycinek(id, [id]);
for (const o of obserwacje) {
  dodajWycinek(o.odcinekId, [o.odcinekId]);
  o.wycinek = `/aglosat/wycinki/w_${o.odcinekId}.jpg`;
}

const pilot: Pilot = {
  meta: {
    obszar: { nazwa: OBSZAR.nazwa, bbox: OBSZAR.bboxGrafu, srodek: OBSZAR.srodek },
    pobranoOsm: DATA_OSM,
    wygenerowano: new Date().toISOString().slice(0, 10),
    uwagi: [
      "Geometria, tagi, budynki i usługi: OpenStreetMap (© współtwórcy OSM, ODbL).",
      `Wycinki: ${ORTO.zrodlo}, nalot ${ORTO.dataNalotu} (skorowidz GUGiK, arkusz ${ORTO.arkusz}).`,
      "Klasy modelu dla wycinków i strefa zmian Sentinel-2: dane przykładowe.",
      "Waga budynku: powierzchnia zabudowy × kondygnacje; przybliżenie, nie liczba mieszkańców.",
      "Ranking: analiza bazowa, policzona wcześniej dla profilu domyślnego.",
    ],
  },
  wezly, odcinki, obserwacje, budynki, uslugi, strefyZmian, wycinki,
  ranking: analiza.ranking.slice(0, 200),
  mianownik: analiza.mianownik,
  kandydaci: analiza.kandydaci,
};
writeFileSync("public/aglosat/pilot.json", JSON.stringify(zwinPilot(pilot)));

const licz = (f: (s: string) => boolean) => [...oceny.values()].filter((o) => f(o.przejezdnosc)).length;
console.log(`odcinki: ${odcinki.length}, węzły: ${Object.keys(wezly).length}`);
console.log(`przejezdne: ${licz((s) => s === "przejezdny")}, nieznane: ${licz((s) => s === "nieznany")}, nieprzejezdne: ${licz((s) => s === "nieprzejezdny")}`);
console.log(`budynki: ${budynki.length} (kondygnacje przybliżone: ${budynki.filter((b) => b.kondygnacjePrzyblizone).length}), usługi: ${uslugi.length}`);
console.log(`wycinki: ${wycinki.length}`);
console.log(`obserwacje: ${obserwacje.length}, strefy zmian: ${strefyZmian.length}, odcinki w strefie: ${odcinki.filter((o) => o.strefaZmian).length}`);
console.log(`ranking: ${analiza.ranking.length} miejsc do kontroli z wpływem, kandydaci: ${analiza.kandydaci.length}, analiza ${Date.now() - t0} ms`);
console.log("mianownik:", analiza.mianownik);
