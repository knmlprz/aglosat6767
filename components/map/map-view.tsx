"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  ESRI_ATTRIBUTION,
  ESRI_TILE_URL,
  MAP_BOUNDS,
  type MapMode,
} from "@/lib/map-config";
import { LocalityLayer } from "./locality-layer";
import { SanLayer } from "./san-layer";
import { StopsLayer } from "./stops-layer";
import { DestinationsLayer } from "./destinations-layer";
import { RoutesLayer } from "./routes-layer";
import { DistrictLayer } from "./district-layer";
import { OsiedlaFlowLayer } from "./osiedla-flow-layer";
import type { FlowTimeSlot } from "@/lib/osiedla-flows";

const HEIGHT: Record<MapMode, string> = {
  localities: "h-[600px] lg:h-[800px]",
  districts: "h-[600px] lg:h-[750px]",
  routes: "h-[600px] lg:h-[750px]",
  stops: "h-[600px] lg:h-[750px]",
  destinations: "h-[550px] lg:h-[650px]",
  mini: "h-[280px] lg:h-[320px]",
};

const COMPACT_HEIGHT: Record<MapMode, string> = {
  localities: "h-[420px] lg:h-[520px]",
  districts: "h-[420px] lg:h-[500px]",
  routes: "h-[420px] lg:h-[500px]",
  stops: "h-[420px] lg:h-[500px]",
  destinations: "h-[400px] lg:h-[480px]",
  mini: "h-[240px] lg:h-[280px]",
};

export type MapViewProps = {
  mode: MapMode;
  selectedSlug?: string | null;
  onSelectLocality?: (slug: string | null) => void;
  showSan?: boolean;
  compact?: boolean;
  enabledRouteIds?: Set<string>;
  flowTimeSlot?: FlowTimeSlot;
  showOsiedlaFlows?: boolean;
};

export function MapView({
  mode,
  selectedSlug,
  onSelectLocality,
  showSan = mode === "localities" || mode === "routes" || mode === "districts",
  compact = false,
  enabledRouteIds,
  flowTimeSlot = "all",
  showOsiedlaFlows = true,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showLocalities = mode === "localities" || mode === "mini";
  const showDistricts = mode === "districts";
  const showRoutes = mode === "routes" || mode === "mini";
  const showStops = mode === "stops" || mode === "mini";
  const showDestinations = mode === "destinations" || mode === "mini";
  const heightClass = compact ? COMPACT_HEIGHT[mode] : HEIGHT[mode];

  if (!mounted) {
    return (
      <div
        className={`relative w-full ${heightClass} overflow-hidden rounded-2xl bg-sky-100 border border-slate-200 animate-pulse`}
      />
    );
  }

  return (
    <div
      className={`relative w-full ${heightClass} overflow-hidden rounded-2xl bg-sky-50 shadow-lg border border-slate-200`}
    >
      <MapContainer
        key={`map-${mode}`}
        bounds={MAP_BOUNDS}
        zoom={10}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", minHeight: 280 }}
        scrollWheelZoom
      >
        <TileLayer attribution={ESRI_ATTRIBUTION} url={ESRI_TILE_URL} />

        {showSan && <SanLayer />}
        {showLocalities && (
          <LocalityLayer
            selectedSlug={selectedSlug}
            onSelect={onSelectLocality}
            compact={mode === "mini"}
          />
        )}
        {showDistricts && (
          <>
            <DistrictLayer timeSlot={flowTimeSlot} />
            {showOsiedlaFlows && <OsiedlaFlowLayer slot={flowTimeSlot} />}
          </>
        )}
        {showRoutes && <RoutesLayer enabledRouteIds={enabledRouteIds} />}
        {showStops && <StopsLayer />}
        {showDestinations && <DestinationsLayer />}
      </MapContainer>
    </div>
  );
}
