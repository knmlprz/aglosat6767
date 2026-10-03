"use client";

import { Marker, Popup } from "react-leaflet";
import { createDotIcon } from "./map-icons";
import { stopsWithOsiedlo } from "@/lib/osiedla";

const busIcon = createDotIcon("#3b82f6", 20);
const trainIcon = createDotIcon("#e11d48", 22);

export function StopsLayer() {
  return (
    <>
      {stopsWithOsiedlo.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lon]}
          icon={stop.isTrain ? trainIcon : busIcon}
        >
          <Popup>
            <div className="min-w-[200px] font-sans">
              <div className="font-bold text-gray-900">{stop.name}</div>
              <div className="text-xs text-gray-500 uppercase mt-0.5">
                {stop.isTrain ? "PKP" : stop.network || "MZK"}
                {stop.ref ? ` · ref ${stop.ref}` : ""}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                <div className="text-gray-500">Osiedle (najbliższe)</div>
                <div className="font-semibold text-violet-700">
                  {stop.osiedloShort}
                </div>
                <div className="text-gray-400">
                  {(stop.distanceToOsiedloKm * 1000).toFixed(0)} m od centrum osiedla
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">Ruch dzienny (bramki)</div>
                <div className="text-lg font-bold text-blue-700">
                  {stop.dailyPassengers}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    pasażerów/dzień
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
