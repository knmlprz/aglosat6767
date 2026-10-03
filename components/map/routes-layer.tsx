"use client";

import { useMemo } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import drogiPociagowRaw from "@/data/drogi_pociagow.json";
import { NamedRoutesLayer } from "./named-routes-layer";

type OsmWay = {
  id: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

function wayToPositions(way: OsmWay): [number, number][] | null {
  if (!way.geometry?.length) return null;
  return way.geometry.map((g) => [g.lat, g.lon]);
}

export function RoutesLayer({
  enabledRouteIds,
}: {
  enabledRouteIds?: Set<string>;
}) {
  const trainWays = useMemo(
    () =>
      (drogiPociagowRaw.elements as OsmWay[]).filter(
        (w) => w.tags?.railway === "rail" && w.geometry
      ),
    []
  );

  return (
    <>
      {trainWays.map((way) => {
        const positions = wayToPositions(way);
        if (!positions) return null;
        return (
          <Polyline
            key={`train-${way.id}`}
            positions={positions}
            pathOptions={{
              color: "#e11d48",
              weight: 3,
              opacity: 0.85,
              dashArray: "6 4",
            }}
          >
            <Tooltip sticky>Linia kolejowa</Tooltip>
          </Polyline>
        );
      })}

      <NamedRoutesLayer enabledRouteIds={enabledRouteIds} />
    </>
  );
}
