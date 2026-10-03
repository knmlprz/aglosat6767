"use client";

import { osiedlaStats, osiedloTrafficColor } from "@/lib/osiedla";

export function OsiedlaRanking({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? "" : "px-4 lg:px-6"}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Ruch per osiedle</h2>
          <p className="text-sm text-slate-500 mt-1">
            Przystanki przypisane do najbliższego węzła osiedla (brak polygonów OSM).
            Sumowany szacowany ruch bramkowy.
          </p>
        </div>
        <div className={`overflow-x-auto ${embedded ? "max-h-[420px] overflow-y-auto" : ""}`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Osiedle</th>
                <th className="px-4 py-3">Przystanki</th>
                <th className="px-4 py-3">BUS / PKP</th>
                <th className="px-4 py-3 text-right">Pasażerów/dzień</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {osiedlaStats.map((o, i) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: osiedloTrafficColor(o.dailyPassengers) }}
                    />
                    <span className="font-medium">{o.shortName}</span>
                  </td>
                  <td className="px-4 py-3">{o.stopCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.busStopCount} / {o.trainStopCount}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {o.dailyPassengers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
