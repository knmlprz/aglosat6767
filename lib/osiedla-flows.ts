import {
  distanceKm,
  osiedlaStats,
  type OsiedloStats,
} from "@/lib/osiedla";

export type FlowTimeSlot = "morning" | "afternoon" | "all";

export type OsiedloFlow = {
  from: string;
  to: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  passengers: number;
};

/** Ułamek dziennego ruchu osiedla przypisany do połączeń z innymi osiedlami */
const INTER_OSIEDLO_SHARE: Record<FlowTimeSlot, number> = {
  morning: 0.07,
  afternoon: 0.06,
  all: 0.14,
};

function flowWeight(
  from: OsiedloStats,
  to: OsiedloStats,
  slot: FlowTimeSlot
): number {
  const dist = distanceKm(from.lat, from.lon, to.lat, to.lon);
  let w = Math.sqrt(to.dailyPassengers + 1) / (0.35 + dist);
  if (slot === "morning" && to.dailyPassengers > from.dailyPassengers) {
    w *= 1.25;
  }
  if (slot === "afternoon" && from.dailyPassengers > to.dailyPassengers) {
    w *= 1.2;
  }
  return w;
}

function distributeBudget(
  budget: number,
  weights: { to: OsiedloStats; w: number }[]
): number[] {
  if (budget <= 0 || !weights.length) return weights.map(() => 0);
  const sumW = weights.reduce((s, x) => s + x.w, 0);
  if (sumW <= 0) return weights.map(() => 0);

  const raw = weights.map(({ w }) => (budget * w) / sumW);
  const floors = raw.map((v) => Math.floor(v));
  let left = budget - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

const flowCache = new Map<FlowTimeSlot, OsiedloFlow[]>();

export function getOsiedloFlows(slot: FlowTimeSlot): OsiedloFlow[] {
  const cached = flowCache.get(slot);
  if (cached) return cached;

  const share = INTER_OSIEDLO_SHARE[slot];
  const flows: OsiedloFlow[] = [];

  for (const from of osiedlaStats) {
    const budget = Math.round(from.dailyPassengers * share);
    if (budget <= 0) continue;

    const targets = osiedlaStats.filter((t) => t.id !== from.id);
    const weights = targets.map((to) => ({
      to,
      w: flowWeight(from, to, slot),
    }));
    const amounts = distributeBudget(budget, weights);

    for (let i = 0; i < targets.length; i++) {
      const p = amounts[i];
      if (p <= 0) continue;
      const to = targets[i];
      flows.push({
        from: from.shortName,
        to: to.shortName,
        fromLat: from.lat,
        fromLon: from.lon,
        toLat: to.lat,
        toLon: to.lon,
        passengers: p,
      });
    }
  }

  flows.sort((a, b) => b.passengers - a.passengers);
  flowCache.set(slot, flows);
  return flows;
}

export function getFlowMax(slot: FlowTimeSlot): number {
  const flows = getOsiedloFlows(slot);
  return Math.max(...flows.map((f) => f.passengers), 1);
}

/** Kolor linii przepływu — niebieski (mało) → czerwony (dużo) */
export function flowTrafficColor(passengers: number, max: number): string {
  const t = passengers / Math.max(max, 1);
  if (t >= 0.75) return "#dc2626";
  if (t >= 0.5) return "#f97316";
  if (t >= 0.3) return "#eab308";
  if (t >= 0.15) return "#84cc16";
  return "#3b82f6";
}

export function getOsiedlaStatsForSlot(slot: FlowTimeSlot): OsiedloStats[] {
  const outbound = new Map<string, number>();
  const inbound = new Map<string, number>();
  for (const f of getOsiedloFlows(slot)) {
    outbound.set(f.from, (outbound.get(f.from) ?? 0) + f.passengers);
    inbound.set(f.to, (inbound.get(f.to) ?? 0) + f.passengers);
  }

  const peakLocalShare = slot === "morning" ? 0.22 : slot === "afternoon" ? 0.2 : 1;

  return osiedlaStats.map((o) => {
    if (slot === "all") {
      return o;
    }
    const local = Math.round(o.dailyPassengers * peakLocalShare);
    const through = Math.max(
      outbound.get(o.shortName) ?? 0,
      inbound.get(o.shortName) ?? 0
    );
    return { ...o, dailyPassengers: local + through };
  });
}

export const FLOW_SLOT_LABELS: Record<FlowTimeSlot, string> = {
  morning: "Szczyt poranny (6–9)",
  afternoon: "Popołudnie (14–17)",
  all: "Cała doba",
};

export const FLOW_COLOR_LEGEND = [
  { color: "#3b82f6", label: "Niskie" },
  { color: "#84cc16", label: "" },
  { color: "#eab308", label: "" },
  { color: "#f97316", label: "" },
  { color: "#dc2626", label: "Wysokie" },
] as const;
