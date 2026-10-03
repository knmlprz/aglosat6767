import analyticsRaw from "@/data/localities-analytics.json";
import gminyRaw from "@/data/stalowa-wola-gminy.json";
import { gapRatioColor } from "@/lib/map-config";

export type DestinationGap = {
  id: string;
  carMin: number;
  transitMin: number;
  ratio: number;
};

export type Locality = {
  slug: string;
  name: string;
  powiat: string;
  gmina: string;
  hasPolygon: boolean;
  lat?: number;
  lon?: number;
  gapRatio: number;
  dailyCourses: number;
  lastReturn: string;
  sasScore: number;
  noNightService: boolean;
  destinations: DestinationGap[];
  recommendation: string;
};

export type AnalyticsSummary = {
  totalAnalyzed: number;
  gapAbove3: number;
  noNightService: number;
  hswPeakPassengers: number;
};

const analytics = analyticsRaw as {
  summary: AnalyticsSummary;
  topDeserts: { slug: string; name: string; gapRatio: number }[];
  localities: Locality[];
};

export const summary = analytics.summary;
export const topDeserts = analytics.topDeserts;
export const localities = analytics.localities;

export function getLocalityBySlug(slug: string): Locality | undefined {
  return localities.find((l) => l.slug === slug);
}

export function getLocalityByName(name: string): Locality | undefined {
  return localities.find(
    (l) => l.name.toLowerCase() === name.toLowerCase()
  );
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Map gmina name → gap ratio from analytics */
export function getGminaGapRatio(gminaName: string): number {
  const loc = localities.find(
    (l) => l.gmina === gminaName || l.name === gminaName
  );
  return loc?.gapRatio ?? 2.0;
}

export function getGminaStyle(gminaName: string) {
  const ratio = getGminaGapRatio(gminaName);
  const isCity = gminaName === "Stalowa Wola";
  return {
    fillColor: isCity ? "#3b82f6" : gapRatioColor(ratio),
    weight: isCity ? 2.5 : 1.5,
    opacity: 0.85,
    color: "#ffffff",
    fillOpacity: isCity ? 0.35 : ratio >= 3 ? 0.55 : 0.42,
  };
}

export const gminyGeojson = gminyRaw;

export const pointOnlyLocalities = localities.filter(
  (l) => !l.hasPolygon && l.lat != null && l.lon != null
);
