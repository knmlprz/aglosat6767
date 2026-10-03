"use client";

import { GeoJSON, CircleMarker } from "react-leaflet";
import type { Layer } from "leaflet";
import {
  getGminaStyle,
  getLocalityByName,
  gminyGeojson,
  pointOnlyLocalities,
  slugify,
} from "@/lib/localities";
import { getCarTimeByName, formatCarMin } from "@/lib/car-times";
import { gapRatioColor } from "@/lib/map-config";
import type { FeatureCollection } from "geojson";

const geojsonData = gminyGeojson as FeatureCollection;

type Props = {
  selectedSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  compact?: boolean;
};

export function LocalityLayer({ selectedSlug, onSelect, compact }: Props) {
  return (
    <>
      <GeoJSON
        key={`gminy-${selectedSlug ?? "none"}`}
        data={geojsonData}
        style={(feature) => {
          const nazwa = feature?.properties?.nazwa as string;
          const loc = getLocalityByName(nazwa);
          const selected = loc && selectedSlug === loc.slug;
          const base = getGminaStyle(nazwa);
          return {
            ...base,
            weight: selected ? 3 : base.weight,
            color: selected ? "#1e293b" : base.color,
          };
        }}
        onEachFeature={(feature, layer: Layer) => {
          const nazwa = feature?.properties?.nazwa as string;
          if (!nazwa) return;
          const loc = getLocalityByName(nazwa);
          const ratio = loc?.gapRatio ?? "—";
          const car = getCarTimeByName(nazwa);
          const carLine = car
            ? `<br/>Autem → SW: ${formatCarMin(car.durationCarSec)}`
            : "";
          layer.bindTooltip(
            `<strong>${nazwa}</strong><br/>Gap ratio: ${typeof ratio === "number" ? ratio.toFixed(1) + "×" : ratio}${carLine}`,
            {
              direction: "center",
              permanent: false,
              className: "font-semibold drop-shadow-md bg-white/90",
            }
          );
          layer.on({
            click: () => {
              const slug = loc?.slug ?? slugify(nazwa);
              onSelect?.(slug);
            },
          });
        }}
      />

      {pointOnlyLocalities.map((loc) => {
        const selected = selectedSlug === loc.slug;
        const radius = compact ? 10 : 14;
        return (
          <CircleMarker
            key={loc.slug}
            center={[loc.lat!, loc.lon!]}
            radius={selected ? radius + 4 : radius}
            pathOptions={{
              fillColor: gapRatioColor(loc.gapRatio),
              color: selected ? "#1e293b" : "#ffffff",
              weight: selected ? 3 : 2,
              fillOpacity: 0.75,
            }}
            eventHandlers={{
              click: () => onSelect?.(loc.slug),
              mouseover: (e) => {
                e.target.bindTooltip(
                  `<b>${loc.name}</b><br/>Gap: ${loc.gapRatio.toFixed(1)}×`,
                  { direction: "top" }
                ).openTooltip();
              },
            }}
          />
        );
      })}
    </>
  );
}
