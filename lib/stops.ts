import stopsRaw from "@/data/przystanki_dworce_kolejowe.json";

export type StopPoint = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  isTrain: boolean;
  network?: string;
  ref?: string;
  dailyPassengers: number;
};

function hashPassengers(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.max(1, Math.round((5 + (Math.abs(h) % 180)) / 10));
}

function extractCoords(stop: {
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  bounds?: { minlat: number; maxlat: number; minlon: number; maxlon: number };
}): { lat: number; lon: number } | null {
  const lat =
    stop.lat ??
    stop.geometry?.[0]?.lat ??
    (stop.bounds ? (stop.bounds.minlat + stop.bounds.maxlat) / 2 : undefined);
  const lon =
    stop.lon ??
    stop.geometry?.[0]?.lon ??
    (stop.bounds ? (stop.bounds.minlon + stop.bounds.maxlon) / 2 : undefined);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

export function parseStops(): StopPoint[] {
  const seen = new Set<number>();
  const result: StopPoint[] = [];

  for (const stop of stopsRaw.elements) {
    if (!stop.tags?.name || seen.has(stop.id)) continue;
    const coords = extractCoords(stop);
    if (!coords) continue;
    seen.add(stop.id);

    const tagsString = JSON.stringify(stop.tags || {}).toUpperCase();
    const isTrain =
      tagsString.includes("PKP") ||
      stop.tags?.railway === "station" ||
      stop.tags?.railway === "halt";
    const isBus =
      tagsString.includes("MZK") ||
      stop.tags?.highway === "bus_stop" ||
      stop.tags?.amenity === "bus_station";

    const finalIsTrain = isTrain && (!isBus || tagsString.includes("PKP"));
    const name = stop.tags.name;

    result.push({
      id: stop.id,
      name,
      lat: coords.lat,
      lon: coords.lon,
      isTrain: finalIsTrain,
      network: stop.tags?.network,
      ref: stop.tags?.ref,
      dailyPassengers: hashPassengers(name + String(stop.id)),
    });
  }

  return result;
}

export const allStops = parseStops();
export const busStops = allStops.filter((s) => !s.isTrain);
export const trainStops = allStops.filter((s) => s.isTrain);
