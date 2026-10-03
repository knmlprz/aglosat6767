"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MapMode } from "@/lib/map-config";
import { allStops } from "@/lib/stops";
import { cn } from "@/lib/utils";
import type { FlowTimeSlot } from "@/lib/osiedla-flows";
import {
  RouteToggles,
  defaultRouteEnabled,
} from "./route-toggles";
import { FlowToggles } from "./flow-toggles";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] lg:h-[560px] animate-pulse rounded-2xl bg-sky-100 border border-slate-200" />
    ),
  }
);

const LocalityPanel = dynamic(
  () =>
    import("@/components/map/locality-panel").then((m) => m.LocalityPanel),
  { ssr: false }
);

export const MAP_LAYERS: {
  id: MapMode;
  param: string;
  label: string;
  hint: string;
}[] = [
  {
    id: "districts",
    param: "miejski",
    label: "Miejski",
    hint: "Osiedla Stalowej Woli — kolor koła = ruch lokalny, linie = przepływy między osiedlami (czerwony = więcej pasażerów).",
  },
  {
    id: "localities",
    param: "regionalny",
    label: "Regionalny",
    hint: "Gminy i sołectwa — kolor = gap ratio. Kliknij miejscowość.",
  },
  {
    id: "routes",
    param: "trasy",
    label: "Trasy",
    hint: "Tory PKP + trasy MZK (Nisko, HSW, Pętla Sandomierska). Przełączniki włączają/wyłączają linie.",
  },
  {
    id: "stops",
    param: "przystanki",
    label: "Przystanki",
    hint: `${allStops.length} przystanków — kliknij po dane bramkowe.`,
  },
  {
    id: "destinations",
    param: "destynacje",
    label: "Destynacje",
    hint: "HSW, szpital, urząd, dworzec, szkoły.",
  },
];

type MapExplorerProps = {
  /** Strona /app/mapa — sync z URL. Dashboard — lokalny stan. */
  syncUrl?: boolean;
  compact?: boolean;
  className?: string;
  id?: string;
};

export function MapExplorer({
  syncUrl = false,
  compact = false,
  className,
  id,
}: MapExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("warstwa") ?? "regionalny";
  const [localParam, setLocalParam] = useState("regionalny");
  const param = syncUrl ? urlParam : localParam;
  const active = MAP_LAYERS.find((l) => l.param === param) ?? MAP_LAYERS[0];
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [routeEnabled, setRouteEnabled] = useState(defaultRouteEnabled);
  const [flowSlot, setFlowSlot] = useState<FlowTimeSlot>("morning");
  const [showFlows, setShowFlows] = useState(true);

  const enabledRouteIds = new Set(
    Object.entries(routeEnabled)
      .filter(([, on]) => on)
      .map(([id]) => id)
  );

  const onTabChange = useCallback(
    (value: string) => {
      setSelectedSlug(null);
      if (syncUrl) {
        router.replace(`/app/mapa?warstwa=${value}`, { scroll: false });
      } else {
        setLocalParam(value);
      }
    },
    [router, syncUrl]
  );

  return (
    <section id={id} className={cn("flex flex-col gap-3", className)}>
      <Tabs value={active.param} onValueChange={onTabChange}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          {MAP_LAYERS.map((l) => (
            <TabsTrigger key={l.param} value={l.param}>
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-sm text-slate-500">{active.hint}</p>
      {active.id === "routes" && (
        <RouteToggles
          enabled={routeEnabled}
          onToggle={(id, on) =>
            setRouteEnabled((prev) => ({ ...prev, [id]: on }))
          }
        />
      )}
      {active.id === "districts" && (
        <FlowToggles
          slot={flowSlot}
          onSlotChange={setFlowSlot}
          showFlows={showFlows}
          onShowFlowsChange={setShowFlows}
        />
      )}
      <div className="relative">
        <MapView
          key={active.id}
          mode={active.id}
          compact={compact}
          enabledRouteIds={
            active.id === "routes" ? enabledRouteIds : undefined
          }
          flowTimeSlot={active.id === "districts" ? flowSlot : undefined}
          showOsiedlaFlows={active.id === "districts" ? showFlows : undefined}
          selectedSlug={
            active.id === "localities" ? selectedSlug : undefined
          }
          onSelectLocality={
            active.id === "localities" ? setSelectedSlug : undefined
          }
        />
        {active.id === "localities" && (
          <LocalityPanel
            selectedSlug={selectedSlug}
            onClose={() => setSelectedSlug(null)}
          />
        )}
      </div>
    </section>
  );
}

/** @deprecated alias */
export function UnifiedMap(props: { className?: string }) {
  return <MapExplorer syncUrl className={props.className} />;
}
