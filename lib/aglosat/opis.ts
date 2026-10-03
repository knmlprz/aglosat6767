// Opisy miejsc dla ludzi: „przejście przy Osiedle Ogrodowe 10”.
// Chodniki w OSM rzadko mają nazwę, więc punktem odniesienia jest najbliższy adres.

import type { Odcinek, Pilot } from "./types.ts";
import { TYP_LABEL } from "./vocabulary.ts";

function odlegloscM(a: [number, number], b: [number, number]): number {
  const kx = 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * kx);
}

export function srodekOdcinka(o: Odcinek): [number, number] {
  return o.geometria[Math.floor(o.geometria.length / 2)];
}

export function lokalizacja(o: Odcinek, pilot: Pilot): string {
  const typ = TYP_LABEL[o.typ] ?? o.typ;
  if (o.nazwa) return `${typ}, ${o.nazwa}`;
  const s = srodekOdcinka(o);
  let best: { adres: string; d: number } | null = null;
  for (const b of pilot.budynki) {
    if (!b.adres) continue;
    const d = odlegloscM(s, [b.lat, b.lon]);
    if (!best || d < best.d) best = { adres: b.adres, d };
  }
  return best && best.d < 150 ? `${typ} przy ${best.adres}` : typ;
}
