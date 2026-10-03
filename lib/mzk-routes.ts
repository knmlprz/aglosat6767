import stopsRaw from "@/data/przystanki_dworce_kolejowe.json";
import namedRoutesRaw from "@/data/mzk-named-routes.json";

export type MatchedStop = {
  query: string;
  name: string;
  lat: number;
  lon: number;
  score: number;
};

export type NamedRoute = {
  id: string;
  name: string;
  color: string;
  stops: string[];
};

export type ResolvedRoute = NamedRoute & {
  matched: MatchedStop[];
  positions: [number, number][];
  matchRate: number;
};

const namedRoutes = namedRoutesRaw as { routes: NamedRoute[] };

export const mzkNamedRoutes = namedRoutes.routes;

function normalizeWords(s: string): string[] {
  if (!s) return [];
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/\s*-\s*/g, " ")
    .replace(/[-_.,/0-9]/g, " ")
    .replace(/\bPKP\b/g, "")
    .replace(/\bZOZ\b/g, "")
    .replace(/\bKUL\b/g, "")
    .replace(/\bHSW\b/g, "")
    .replace(/\bS\.A\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

type OsmStop = {
  original: string;
  norm: string[];
  lat: number;
  lon: number;
};

function buildOsmIndex(): OsmStop[] {
  const seen = new Set<string>();
  const result: OsmStop[] = [];

  for (const el of stopsRaw.elements) {
    const name = el.tags?.name;
    if (!name || seen.has(name)) continue;
    const lat =
      el.lat ??
      el.geometry?.[0]?.lat ??
      (el.bounds ? (el.bounds.minlat + el.bounds.maxlat) / 2 : undefined);
    const lon =
      el.lon ??
      el.geometry?.[0]?.lon ??
      (el.bounds ? (el.bounds.minlon + el.bounds.maxlon) / 2 : undefined);
    if (lat == null || lon == null) continue;
    seen.add(name);
    result.push({
      original: name,
      norm: normalizeWords(name + " " + (el.tags?.alt_name || "")),
      lat,
      lon,
    });
  }
  return result;
}

const osmIndex = buildOsmIndex();

export function matchStopName(targetName: string): MatchedStop | null {
  const normT = normalizeWords(targetName);
  if (normT.length === 0) return null;

  let best: OsmStop | null = null;
  let bestScore = 0;

  for (const osm of osmIndex) {
    let score = 0;
    for (const tw of normT) {
      if (
        osm.norm.some(
          (nw) =>
            nw === tw ||
            (nw.length > 3 && (nw.includes(tw) || tw.includes(nw)))
        )
      ) {
        score += 1;
      }
    }
    const lengthDiff = Math.abs(osm.norm.length - normT.length);
    const finalScore = score - lengthDiff * 0.4;
    if (finalScore > bestScore && score >= 1 && finalScore >= 0.8) {
      bestScore = finalScore;
      best = osm;
    }
  }

  if (!best) return null;
  return {
    query: targetName,
    name: best.original,
    lat: best.lat,
    lon: best.lon,
    score: bestScore,
  };
}

export function resolveRoute(route: NamedRoute): ResolvedRoute {
  const matched: MatchedStop[] = [];
  for (const q of route.stops) {
    const m = matchStopName(q);
    if (m) matched.push(m);
  }
  const positions: [number, number][] = matched.map((m) => [m.lat, m.lon]);
  return {
    ...route,
    matched,
    positions,
    matchRate: route.stops.length
      ? matched.length / route.stops.length
      : 0,
  };
}

export function resolveAllRoutes(): ResolvedRoute[] {
  return mzkNamedRoutes.map(resolveRoute);
}

export async function fetchOsrmGeometry(
  positions: [number, number][]
): Promise<[number, number][] | null> {
  if (positions.length < 2) return null;
  const coords = positions.map(([lat, lon]) => `${lon},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
      return null;
    }
    return data.routes[0].geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
    );
  } catch {
    return null;
  }
}
