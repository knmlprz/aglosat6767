export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [50.36, 21.84],
  [50.83, 22.27],
];

export const ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

export type MapMode =
  | "localities"
  | "districts"
  | "routes"
  | "stops"
  | "destinations"
  | "mini";

export const BUS_ROUTE_COLORS = [
  "#e11d48",
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#9333ea",
  "#ea580c",
  "#4f46e5",
  "#be123c",
];

export function gapRatioColor(ratio: number): string {
  if (ratio >= 3.5) return "#ef4444";
  if (ratio >= 3.0) return "#f97316";
  if (ratio >= 2.0) return "#eab308";
  if (ratio >= 1.5) return "#84cc16";
  return "#22c55e";
}

export function gapRatioFillOpacity(ratio: number): number {
  return ratio >= 3 ? 0.55 : 0.4;
}
