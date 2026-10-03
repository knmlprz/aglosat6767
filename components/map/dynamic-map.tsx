"use client";

import dynamic from "next/dynamic";
import type { MapMode } from "@/lib/map-config";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[420px] w-full animate-pulse rounded-2xl bg-sky-50 sm:min-h-[560px]" />
    ),
  }
);

export function DynamicMap({
  mode,
  description,
}: {
  mode: MapMode;
  description?: string;
}) {
  return (
    <div className="px-4 lg:px-6 flex flex-col gap-3">
      {description && (
        <p className="text-sm text-slate-500 max-w-2xl">{description}</p>
      )}
      <MapView mode={mode} />
    </div>
  );
}
