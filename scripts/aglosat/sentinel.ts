// Strefy zmian z Sentinel-2: sygnał możliwej zmiany między dwiema datami, nie wykrywanie chodników.
// Klasyczna teledetekcja: zmiana wskaźnika roślinności (NDVI) w dwóch parach scen z tej samej pory roku.
// Strefa zostaje tylko wtedy, gdy zmiana pojawia się w obu parach i w tym samym kierunku
// (kryterium z koncepcji: powtarzalność między parami, odrzucenie cieni i chmur maską SCL).
// Uruchomienie: npm run aglosat:sentinel   (źródło: Sentinel-2 L2A, archiwum AWS / Element84, bez logowania)

import { writeFileSync } from "node:fs";
import { fromUrl } from "geotiff";
import proj4 from "proj4";
import { OBSZAR } from "./config.ts";

const STAC = "https://earth-search.aws.element84.com/v1/search";
const KAFEL = "34UDA";
const UTM = "+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs";
/** Pary scen z tej samej pory roku: przed (2025) i po (2026). */
const PARY: [string, string][] = [
  ["2025-08-13", "2026-08-14"],
  ["2025-09-20", "2026-09-08"],
];
/** Minimalna zmiana NDVI w obu parach. */
const PROG_DNDVI = 0.2;
/** Najmniejsza strefa w pikselach 10 m (300 m²). */
const MIN_PIKSELI = 3;
/** SCL: 4 roślinność, 5 grunt i zabudowa, 6 woda. Odrzucamy chmury, cienie chmur i ciemne obszary. */
const SCL_OK = new Set([4, 5, 6]);
const ZAPAS_M = 150;

type Scena = { id: string; data: string; red: string; nir: string; scl: string; skala: number; przesuniecie: number };

async function znajdzScene(data: string): Promise<Scena> {
  const res = await fetch(STAC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      bbox: [OBSZAR.bboxGrafu[1], OBSZAR.bboxGrafu[0], OBSZAR.bboxGrafu[3], OBSZAR.bboxGrafu[2]],
      datetime: `${data}T00:00:00Z/${data}T23:59:59Z`,
      limit: 10,
    }),
  });
  const { features } = (await res.json()) as {
    features: {
      id: string;
      properties: { "eo:cloud_cover": number; "s2:mgrs_tile"?: string; "grid:code"?: string; "earthsearch:boa_offset_applied"?: boolean };
      assets: Record<string, { href: string; "raster:bands"?: { scale?: number; offset?: number }[] }>;
    }[];
  };
  const f = features
    .filter((x) => (x.properties["grid:code"] ?? x.properties["s2:mgrs_tile"] ?? "").includes(KAFEL))
    .sort((a, b) => a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"])[0];
  if (!f) throw new Error(`Brak sceny ${KAFEL} z dnia ${data}`);
  const rb = f.assets.red["raster:bands"]?.[0];
  // Archiwum Element84 ma już zharmonizowane wartości (boa_offset_applied): drugie odjęcie 0,1 dałoby ujemne odbicie.
  const przesuniecie = f.properties["earthsearch:boa_offset_applied"] ? 0 : (rb?.offset ?? 0);
  return { id: f.id, data, red: f.assets.red.href, nir: f.assets.nir.href, scl: f.assets.scl.href, skala: rb?.scale ?? 1e-4, przesuniecie };
}

// Okno w układzie UTM 34N wokół obszaru grafu.
const [s, w, n, e] = OBSZAR.bboxGrafu;
const naroza = [proj4("WGS84", UTM, [w, s]), proj4("WGS84", UTM, [e, n]), proj4("WGS84", UTM, [w, n]), proj4("WGS84", UTM, [e, s])];
const xMin = Math.min(...naroza.map((p) => p[0])) - ZAPAS_M;
const xMax = Math.max(...naroza.map((p) => p[0])) + ZAPAS_M;
const yMin = Math.min(...naroza.map((p) => p[1])) - ZAPAS_M;
const yMax = Math.max(...naroza.map((p) => p[1])) + ZAPAS_M;

type Okno = { dane: ArrayLike<number>; szer: number; wys: number; x0: number; y0: number; res: number };

async function czytaj(href: string): Promise<Okno> {
  const tiff = await fromUrl(href);
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  const px0 = Math.floor((xMin - ox) / rx);
  const px1 = Math.ceil((xMax - ox) / rx);
  const py0 = Math.floor((yMax - oy) / ry); // ry < 0
  const py1 = Math.ceil((yMin - oy) / ry);
  const [dane] = (await img.readRasters({ window: [px0, py0, px1, py1], samples: [0] })) as unknown as ArrayLike<number>[];
  return { dane, szer: px1 - px0, wys: py1 - py0, x0: ox + px0 * rx, y0: oy + py0 * ry, res: rx };
}

async function ndvi(sc: Scena) {
  const [red, nir, scl] = await Promise.all([czytaj(sc.red), czytaj(sc.nir), czytaj(sc.scl)]);
  const wynik = new Float32Array(red.szer * red.wys).fill(NaN);
  for (let j = 0; j < red.wys; j++) {
    for (let i = 0; i < red.szer; i++) {
      const k = j * red.szer + i;
      // SCL ma 20 m: piksel 10 m odpowiada pikselowi SCL o połowie indeksu (siatki tego samego kafla są wyrównane).
      const x = red.x0 + (i + 0.5) * red.res;
      const y = red.y0 - (j + 0.5) * red.res;
      const si = Math.floor((x - scl.x0) / scl.res);
      const sj = Math.floor((scl.y0 - y) / scl.res);
      const klasa = scl.dane[sj * scl.szer + si];
      if (!SCL_OK.has(klasa) || !red.dane[k] || !nir.dane[k]) continue;
      const r = red.dane[k] * sc.skala + sc.przesuniecie;
      const ir = nir.dane[k] * sc.skala + sc.przesuniecie;
      if (r > 0 && ir > 0) wynik[k] = (ir - r) / (ir + r);
    }
  }
  return { ndvi: wynik, okno: red };
}

console.log(`okno UTM: ${Math.round(xMax - xMin)} × ${Math.round(yMax - yMin)} m`);
const zmianyPar: Float32Array[] = [];
const sceny: { przed: string; po: string }[] = [];
let okno: Okno | null = null;
for (const [przed, po] of PARY) {
  const [a, b] = await Promise.all([znajdzScene(przed), znajdzScene(po)]);
  console.log(`para: ${a.id} → ${b.id}`);
  const [na, nb] = await Promise.all([ndvi(a), ndvi(b)]);
  okno = na.okno;
  zmianyPar.push(nb.ndvi.map((v, i) => v - na.ndvi[i]));
  sceny.push({ przed: a.id, po: b.id });
}
const o = okno!;
const wazne = zmianyPar[0].reduce((s2, _, i) => s2 + (zmianyPar.every((z) => Number.isFinite(z[i])) ? 1 : 0), 0);

// Rozkład zmian w pierwszej parze: uzasadnienie progu.
const wartosci = [...zmianyPar[0]].filter(Number.isFinite).sort((x, y) => x - y);
const kwantyl = (q: number) => wartosci[Math.floor(q * (wartosci.length - 1))].toFixed(3);
console.log(`piksele: ${o.szer * o.wys}, ważne we wszystkich scenach: ${wazne}`);
console.log(`ΔNDVI (para 1): 1% ${kwantyl(0.01)}, 5% ${kwantyl(0.05)}, mediana ${kwantyl(0.5)}, 95% ${kwantyl(0.95)}, 99% ${kwantyl(0.99)}`);

// Zmiana: |ΔNDVI| ≥ próg w obu parach i ten sam kierunek.
const kierunek = new Int8Array(o.szer * o.wys);
for (let i = 0; i < kierunek.length; i++) {
  const z = zmianyPar.map((zp) => zp[i]);
  if (z.every((v) => Number.isFinite(v) && v <= -PROG_DNDVI)) kierunek[i] = -1;
  else if (z.every((v) => Number.isFinite(v) && v >= PROG_DNDVI)) kierunek[i] = 1;
}

// Spójne strefy (sąsiedztwo 8) tego samego kierunku.
const odwiedzone = new Uint8Array(kierunek.length);
type Strefa = { piksele: number[]; kierunek: number };
const strefy: Strefa[] = [];
for (let start = 0; start < kierunek.length; start++) {
  if (!kierunek[start] || odwiedzone[start]) continue;
  const kier = kierunek[start];
  const stos = [start];
  const piksele: number[] = [];
  odwiedzone[start] = 1;
  while (stos.length) {
    const k = stos.pop()!;
    piksele.push(k);
    const i = k % o.szer, j = Math.floor(k / o.szer);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= o.szer || nj >= o.wys) continue;
        const nk = nj * o.szer + ni;
        if (!odwiedzone[nk] && kierunek[nk] === kier) {
          odwiedzone[nk] = 1;
          stos.push(nk);
        }
      }
  }
  if (piksele.length >= MIN_PIKSELI) strefy.push({ piksele, kierunek: kier });
}

/** Otoczka wypukła narożników pikseli strefy, z powrotem do WGS84. */
function wielokat(piksele: number[]): [number, number][] {
  const pkt: [number, number][] = [];
  for (const k of piksele) {
    const i = k % o.szer, j = Math.floor(k / o.szer);
    const x = o.x0 + i * o.res, y = o.y0 - j * o.res;
    pkt.push([x, y], [x + o.res, y], [x, y - o.res], [x + o.res, y - o.res]);
  }
  pkt.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const krzyz = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const dol: [number, number][] = [];
  for (const p of pkt) {
    while (dol.length >= 2 && krzyz(dol[dol.length - 2], dol[dol.length - 1], p) <= 0) dol.pop();
    dol.push(p);
  }
  const gora: [number, number][] = [];
  for (const p of [...pkt].reverse()) {
    while (gora.length >= 2 && krzyz(gora[gora.length - 2], gora[gora.length - 1], p) <= 0) gora.pop();
    gora.push(p);
  }
  return [...dol.slice(0, -1), ...gora.slice(0, -1)].map(([x, y]) => {
    const [lon, lat] = proj4(UTM, "WGS84", [x, y]);
    return [Math.round(lat * 1e6) / 1e6, Math.round(lon * 1e6) / 1e6];
  });
}

const wynik = {
  opis: "Strefy zmian Sentinel-2 L2A: |ΔNDVI| ≥ próg w obu parach scen z tej samej pory roku, ten sam kierunek; maska SCL (chmury, cienie, ciemne obszary odrzucone).",
  metoda: { prog: PROG_DNDVI, minPikseli: MIN_PIKSELI, rozdzielczoscM: 10, kafel: KAFEL },
  pary: sceny,
  statystyka: { piksele: o.szer * o.wys, wazne, zmienione: strefy.reduce((s2, st) => s2 + st.piksele.length, 0) },
  strefy: strefy
    .sort((a, b) => b.piksele.length - a.piksele.length)
    .map((st, i) => ({
      id: `s2_${i + 1}`,
      kierunek: st.kierunek < 0 ? "utrata roślinności" : "przyrost roślinności",
      poleM2: st.piksele.length * o.res * o.res,
      srednieDNDVI: zmianyPar.map((z) => Math.round((1000 * st.piksele.reduce((s2, k) => s2 + z[k], 0)) / st.piksele.length) / 1000),
      wielokat: wielokat(st.piksele),
    })),
};
writeFileSync("data/aglosat/sentinel-zmiany.json", JSON.stringify(wynik, null, 2) + "\n");
console.log(`strefy: ${wynik.strefy.length}`);
for (const st of wynik.strefy) console.log(`  ${st.id}: ${st.kierunek}, ${st.poleM2} m², ΔNDVI ${st.srednieDNDVI.join(" / ")}`);
