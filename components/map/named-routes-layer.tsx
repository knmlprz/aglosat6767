"use client";

import { useEffect, useMemo, useState } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import {
  fetchOsrmGeometry,
  resolveAllRoutes,
  type ResolvedRoute,
} from "@/lib/mzk-routes";

function numIcon(n: number, color: string) {
  return L.divIcon({
    className: "route-num-icon",
    html: `<div style="background:${color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35)">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function RouteLines({
  route,
  geometry,
}: {
  route: ResolvedRoute;
  geometry: [number, number][] | null;
}) {
  const line = geometry ?? route.positions;
  if (line.length < 2) return null;

  return (
    <>
      <Polyline
        positions={line}
        pathOptions={{
          color: route.color,
          weight: 5,
          opacity: 0.9,
        }}
      >
        <Tooltip sticky>
          {route.name} ({route.matched.length}/{route.stops.length} przystanków)
        </Tooltip>
      </Polyline>
      {route.matched.map((stop, idx) => (
        <Marker
          key={`${route.id}-${idx}`}
          position={[stop.lat, stop.lon]}
          icon={numIcon(idx + 1, route.color)}
        >
          <Tooltip direction="right">
            <strong>{idx + 1}.</strong> {stop.name}
            <br />
            <span className="text-xs text-gray-500">{stop.query}</span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

export function NamedRoutesLayer({
  enabledRouteIds,
}: {
  enabledRouteIds?: Set<string>;
}) {
  const routes = useMemo(() => resolveAllRoutes(), []);
  const visible = enabledRouteIds
    ? routes.filter((r) => enabledRouteIds.has(r.id))
    : routes;
  const [geometries, setGeometries] = useState<
    Record<string, [number, number][] | null>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, [number, number][] | null> = {};
      for (const route of visible) {
        if (route.positions.length >= 2) {
          next[route.id] = await fetchOsrmGeometry(route.positions);
        }
      }
      if (!cancelled) setGeometries(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <>
      {visible.map((route) => (
        <RouteLines
          key={route.id}
          route={route}
          geometry={geometries[route.id] ?? null}
        />
      ))}
    </>
  );
}
