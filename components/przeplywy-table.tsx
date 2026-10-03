"use client";

import { allStops } from "@/lib/stops";

export function PrzeplywyTable({ embedded = false }: { embedded?: boolean }) {
  const sorted = [...allStops].sort(
    (a, b) => b.dailyPassengers - a.dailyPassengers
  );
  const total = sorted.reduce((s, st) => s + st.dailyPassengers, 0);
  const rows = embedded ? sorted.slice(0, 25) : sorted;

  return (
    <div className={`flex flex-col gap-6 ${embedded ? "" : "px-4 lg:px-6"}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Przystanków w bazie" value={String(sorted.length)} />
        <SummaryCard
          label="Szac. ruch dzienny łącznie"
          value={total.toLocaleString("pl-PL")}
        />
        <SummaryCard
          label="Średni ruch / przystanek"
          value={Math.round(total / sorted.length).toString()}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className={`overflow-x-auto overflow-y-auto ${embedded ? "max-h-[380px]" : "max-h-[600px]"}`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Przystanek</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Sieć</th>
                <th className="px-4 py-3 text-right">Pasażerów/dzień</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((stop, i) => (
                <tr key={stop.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{stop.name}</td>
                  <td className="px-4 py-3">
                    {stop.isTrain ? (
                      <span className="text-rose-600 text-xs font-semibold">PKP</span>
                    ) : (
                      <span className="text-blue-600 text-xs font-semibold">BUS</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {stop.network || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {stop.dailyPassengers}
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}
