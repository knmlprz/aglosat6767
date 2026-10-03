// Zapis i odczyt pilot.json. W pliku pomijamy pola, które powtarzają się przy tysiącach dowodów
// (data pobrania OSM, rodzaj daty, stałe opisy); uzupełnia je rozwinPilot().

import type { Cecha, Dowod, Odcinek, Pilot } from "./types.ts";

export const OPIS_ZALOZENIA_KRAWEZNIKA =
  "krawężniki w OSM są opisywane na przejściach; dla tego typu odcinka przyjmujemy, że go nie ma";

export const OPIS_ISTNIENIA_W_OSM = "odcinek istnieje w OSM";

export type DowodZapisany = Omit<Dowod, "data" | "rodzajDaty"> & Partial<Pick<Dowod, "data" | "rodzajDaty">>;
export type OdcinekZapisany = Omit<Odcinek, "dowody"> & { dowody: Partial<Record<Cecha, DowodZapisany[]>> };
export type PilotZapisany = Omit<Pilot, "odcinki"> & { odcinki: OdcinekZapisany[] };

export function zwinDowod(d: Dowod, dataOsm: string): DowodZapisany {
  const z: DowodZapisany = { ...d };
  const domyslny = d.zrodlo === "osm" || d.zrodlo === "zalozenie";
  if (domyslny && d.data === dataOsm) delete z.data;
  if (domyslny && d.rodzajDaty === "pobrania") delete z.rodzajDaty;
  if (d.zrodlo === "zalozenie" && d.opis === OPIS_ZALOZENIA_KRAWEZNIKA) delete z.opis;
  if (d.zrodlo === "osm" && d.opis === OPIS_ISTNIENIA_W_OSM) delete z.opis;
  return z;
}

export function zwinPilot(p: Pilot): PilotZapisany {
  return {
    ...p,
    odcinki: p.odcinki.map((o) => ({
      ...o,
      dowody: Object.fromEntries(
        Object.entries(o.dowody).map(([c, ds]) => [c, ds!.map((d) => zwinDowod(d, p.meta.pobranoOsm))]),
      ),
    })),
  };
}

export function rozwinPilot(z: PilotZapisany): Pilot {
  const dataOsm = z.meta.pobranoOsm;
  return {
    ...z,
    odcinki: z.odcinki.map((o) => ({
      ...o,
      dowody: Object.fromEntries(
        Object.entries(o.dowody).map(([c, ds]) => [
          c,
          ds!.map((d) => ({
            ...(c === "ciaglosc" && d.zrodlo === "osm" && !d.opis ? { opis: OPIS_ISTNIENIA_W_OSM } : {}),
            ...d,
            data: d.data ?? dataOsm,
            rodzajDaty: d.rodzajDaty ?? "pobrania",
            ...(d.zrodlo === "zalozenie" && !d.opis ? { opis: OPIS_ZALOZENIA_KRAWEZNIKA } : {}),
          })),
        ]),
      ),
    })),
  };
}
