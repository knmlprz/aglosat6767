"use client";

import { GeoJSON } from "react-leaflet";
import sanRaw from "@/data/san.json";
import type { FeatureCollection } from "geojson";

const sanData = sanRaw as FeatureCollection;

export function SanLayer() {
  if (!sanData.features.length) return null;

  return (
    <GeoJSON
      data={sanData}
      style={{
        color: "#0ea5e9",
        weight: 4,
        opacity: 0.85,
        fillOpacity: 0,
      }}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip("Rzeka San", { sticky: true });
      }}
    />
  );
}
