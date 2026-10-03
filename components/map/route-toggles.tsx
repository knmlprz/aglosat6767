"use client";

import { useMemo } from "react";
import { resolveAllRoutes, mzkNamedRoutes } from "@/lib/mzk-routes";
import { Switch } from "@/components/ui/switch";

type Props = {
  enabled: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
};

export function RouteToggles({ enabled, onToggle }: Props) {
  const routes = useMemo(() => resolveAllRoutes(), []);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        Trasy MZK — włącz / wyłącz
      </div>
      <div className="flex flex-col gap-2">
        {routes.map((r) => (
          <label
            key={r.id}
            className="flex items-center justify-between gap-3 cursor-pointer text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <span className="text-slate-800 truncate">{r.name}</span>
              <span className="text-slate-400 text-xs shrink-0">
                {r.matched.length}/{r.stops.length}
              </span>
            </div>
            <Switch
              checked={enabled[r.id] ?? true}
              onCheckedChange={(v) => onToggle(r.id, v)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function defaultRouteEnabled(): Record<string, boolean> {
  return Object.fromEntries(mzkNamedRoutes.map((r) => [r.id, true]));
}
