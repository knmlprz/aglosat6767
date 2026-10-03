import type { OsmDostepnosc } from "./types.ts";

export const OSM_DOSTEPNOSC_PUSTE: OsmDostepnosc = {
  highway: null,
  wheelchair: null,
  incline: null,
  surface: null,
  smoothness: null,
  kerb: null,
  width: null,
};

export function osmDostepnoscZTagow(tags?: Record<string, string> | null): OsmDostepnosc {
  return {
    highway: tags?.highway ?? null,
    wheelchair: tags?.wheelchair ?? null,
    incline: tags?.incline ?? null,
    surface: tags?.surface ?? null,
    smoothness: tags?.smoothness ?? null,
    kerb: tags?.kerb ?? null,
    width: tags?.width ?? null,
  };
}
