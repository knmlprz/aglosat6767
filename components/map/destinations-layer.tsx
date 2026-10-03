"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { DESTINATIONS } from "@/lib/destinations-data";
import { createPinIcon } from "./map-icons";

export function DestinationsLayer() {
  const icons = useMemo(
    () =>
      DESTINATIONS.map((d) => ({
        ...d,
        icon: createPinIcon(d.emoji, d.color),
      })),
    []
  );

  return (
    <>
      {icons.map((dest) => (
        <Marker
          key={dest.id}
          position={[dest.lat, dest.lon]}
          icon={dest.icon}
        >
          <Popup>
            <div className="font-sans">
              <div className="font-bold">{dest.name}</div>
              <div className="text-xs text-gray-500 uppercase">{dest.type}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
