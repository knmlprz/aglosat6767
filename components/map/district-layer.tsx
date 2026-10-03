"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { FlowTimeSlot } from "@/lib/osiedla-flows";
import { getOsiedlaStatsForSlot } from "@/lib/osiedla-flows";
import { osiedloTrafficColor } from "@/lib/osiedla";

type Props = {
  timeSlot: FlowTimeSlot;
};

export function DistrictLayer({ timeSlot }: Props) {
  const stats = getOsiedlaStatsForSlot(timeSlot);
  const maxPassengers = Math.max(...stats.map((o) => o.dailyPassengers), 1);

  return (
    <>
      {stats.map((o) => {
        const radius = 10 + Math.round(Math.sqrt(o.stopCount) * 4);
        return (
          <CircleMarker
            key={o.id}
            center={[o.lat, o.lon]}
            radius={radius}
            pathOptions={{
              fillColor: osiedloTrafficColor(o.dailyPassengers, maxPassengers),
              color: "#ffffff",
              weight: 2,
              fillOpacity: 0.65,
            }}
          >
            <Tooltip direction="top">
              <div className="font-sans text-sm">
                <div className="font-bold">{o.shortName}</div>
                <div className="text-xs text-gray-600">
                  {o.stopCount} przyst. · ~{o.dailyPassengers} pasaż.
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Ruch bramkowy z przypisanych przystanków
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
