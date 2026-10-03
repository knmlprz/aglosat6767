"use client";

import { Polyline, Tooltip } from "react-leaflet";
import type { FlowTimeSlot } from "@/lib/osiedla-flows";
import {
  flowTrafficColor,
  getFlowMax,
  getOsiedloFlows,
} from "@/lib/osiedla-flows";

export function OsiedlaFlowLayer({ slot }: { slot: FlowTimeSlot }) {
  const flows = getOsiedloFlows(slot);
  const max = getFlowMax(slot);

  return (
    <>
      {flows.map((f, i) => {
        const t = f.passengers / max;
        const weight = 1 + t * 6;
        const opacity = 0.2 + t * 0.65;
        const color = flowTrafficColor(f.passengers, max);

        return (
          <Polyline
            key={`flow-${f.from}-${f.to}-${i}`}
            positions={[
              [f.fromLat, f.fromLon],
              [f.toLat, f.toLon],
            ]}
            pathOptions={{
              color,
              weight,
              opacity,
            }}
          >
            <Tooltip sticky>
              {f.from} → {f.to}: {f.passengers} pasaż./
              {slot === "all" ? "dzień" : "szczyt"}
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
