"use client";

import { useMemo } from "react";
import { resolveAllRoutes } from "@/lib/mzk-routes";

export function NamedRoutesLegend() {
  const routes = useMemo(() => resolveAllRoutes(), []);
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {routes.map((r) => (
        <div key={r.id} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: r.color }}
          />
          <span className="text-slate-700">
            {r.name}{" "}
            <span className="text-slate-400">
              ({r.matched.length}/{r.stops.length} przyst. OSM)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
