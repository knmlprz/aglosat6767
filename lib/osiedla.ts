import osiedlaRaw from "@/data/osiedla.json";
import { allStops, type StopPoint } from "@/lib/stops";

export type Osiedlo = {
  id: number;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  place?: string;
  city?: string;
};

export type OsiedloStats = Osiedlo & {
  stopCount: number;
  dailyPassengers: number;
  busStopCount: number;
  trainStopCount: number;
};

export type StopWithOsiedlo = StopPoint & {
  osiedlo: string;
  osiedloShort: string;
  distanceToOsiedloKm: number;
};

function parseOsiedla(): Osiedlo[] {
  return osiedlaRaw.elements
    .filter((el: { type: string; tags?: { name?: string } }) => el.type === "node" && el.tags?.name)
    .map((el: { id: number; lat: number; lon: number; tags: Record<string, string> }) => ({
      id: el.id,
      name: el.tags.name,
      shortName: el.tags.name.replace(/^Osiedle\s+/i, ""),
      lat: el.lat,
      lon: el.lon,
      place: el.tags.place,
      city: el.tags["is_in:city"] || el.tags.is_in,
    }))
    .filter((o) => !o.city || o.city.includes("Stalowa Wola") || o.city === "Stalowa Wola");
}

/** Haversine — odległość w km */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const osiedla = parseOsiedla();

export function findNearestOsiedlo(
  lat: number,
  lon: number
): { osiedlo: Osiedlo; distanceKm: number } | null {
  if (!osiedla.length) return null;
  let best = osiedla[0];
  let bestD = distanceKm(lat, lon, best.lat, best.lon);
  for (let i = 1; i < osiedla.length; i++) {
    const o = osiedla[i];
    const d = distanceKm(lat, lon, o.lat, o.lon);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return { osiedlo: best, distanceKm: bestD };
}

function assignStops(): StopWithOsiedlo[] {
  return allStops.map((stop) => {
    const nearest = findNearestOsiedlo(stop.lat, stop.lon);
    if (!nearest) {
      return {
        ...stop,
        osiedlo: "Nieprzypisane",
        osiedloShort: "—",
        distanceToOsiedloKm: 0,
      };
    }
    return {
      ...stop,
      osiedlo: nearest.osiedlo.name,
      osiedloShort: nearest.osiedlo.shortName,
      distanceToOsiedloKm: nearest.distanceKm,
    };
  });
}

export const stopsWithOsiedlo = assignStops();

function buildOsiedloStats(): OsiedloStats[] {
  const map = new Map<number, OsiedloStats>();

  for (const o of osiedla) {
    map.set(o.id, {
      ...o,
      stopCount: 0,
      dailyPassengers: 0,
      busStopCount: 0,
      trainStopCount: 0,
    });
  }

  for (const stop of stopsWithOsiedlo) {
    const o = osiedla.find((x) => x.name === stop.osiedlo);
    if (!o) continue;
    const stat = map.get(o.id)!;
    stat.stopCount += 1;
    stat.dailyPassengers += stop.dailyPassengers;
    if (stop.isTrain) stat.trainStopCount += 1;
    else stat.busStopCount += 1;
  }

  return [...map.values()].sort((a, b) => b.dailyPassengers - a.dailyPassengers);
}

export const osiedlaStats = buildOsiedloStats();

export function getOsiedloStats(name: string): OsiedloStats | undefined {
  return osiedlaStats.find((o) => o.name === name || o.shortName === name);
}

/** Kolor wg natężenia ruchu (min–max z danych) */
export function osiedloTrafficColor(
  passengers: number,
  maxOverride?: number
): string {
  const max =
    maxOverride ??
    Math.max(...osiedlaStats.map((o) => o.dailyPassengers), 1);
  const t = passengers / max;
  if (t >= 0.75) return "#dc2626";
  if (t >= 0.5) return "#f97316";
  if (t >= 0.3) return "#eab308";
  if (t >= 0.15) return "#84cc16";
  return "#3b82f6";
}
