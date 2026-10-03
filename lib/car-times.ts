import carTimesRaw from "@/data/car-travel-times.json";

export type CarTravelEntry = {
  name: string;
  durationCarSec: number;
  staticDurationCarSec: number;
  localitySlug?: string;
};

const data = carTimesRaw as {
  destination: string;
  source: string;
  entries: CarTravelEntry[];
};

export const carTravelDestination = data.destination;
export const carTravelEntries = data.entries;

export function secToMin(sec: number): number {
  return Math.round(sec / 60);
}

export function formatCarMin(sec: number): string {
  const m = sec / 60;
  return m < 10 ? `${m.toFixed(1)} min` : `${Math.round(m)} min`;
}

/** Opóźnienie przez ruch drogowy vs free-flow (%) */
export function trafficDelayPct(entry: CarTravelEntry): number {
  if (!entry.staticDurationCarSec) return 0;
  return (
    ((entry.durationCarSec - entry.staticDurationCarSec) /
      entry.staticDurationCarSec) *
    100
  );
}

export function getCarTimeBySlug(slug: string): CarTravelEntry | undefined {
  return carTravelEntries.find((e) => e.localitySlug === slug);
}

export function getCarTimeByName(name: string): CarTravelEntry | undefined {
  const n = name.toLowerCase();
  return carTravelEntries.find(
    (e) =>
      e.name.toLowerCase() === n ||
      e.name.toLowerCase().startsWith(n) ||
      n.startsWith(e.name.toLowerCase())
  );
}

/** Gap ratio HSW z prawdziwym czasem autem (jeśli mamy oba) */
export function verifiedHswGap(
  carSec: number,
  transitMin: number
): number {
  const carMin = carSec / 60;
  if (carMin <= 0) return 0;
  return transitMin / carMin;
}

export const carTimesSorted = [...carTravelEntries].sort(
  (a, b) => b.durationCarSec - a.durationCarSec
);
