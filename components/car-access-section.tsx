"use client";

import Link from "next/link";
import {
  carTimesSorted,
  carTravelDestination,
  formatCarMin,
  getCarTimeBySlug,
  secToMin,
  trafficDelayPct,
  verifiedHswGap,
} from "@/lib/car-times";
import { getLocalityBySlug } from "@/lib/localities";

export function CarAccessSection({ embedded = false }: { embedded?: boolean }) {
  const longest = carTimesSorted.slice(0, 5);
  const shortest = [...carTimesSorted].slice(-3).reverse();

  return (
    <div className={`flex flex-col gap-6 ${embedded ? "" : "px-4 lg:px-6"}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingCard
          title="Najdłuższy dojazd autem"
          subtitle={`Do ${carTravelDestination}`}
          items={longest}
          variant="danger"
        />
        <RankingCard
          title="Najkrótszy dojazd autem"
          subtitle={`Do ${carTravelDestination}`}
          items={shortest}
          variant="success"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">
            Dostępność autem — wszystkie miejscowości
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Czas z routing API. Kolumna „Gap HSW” = czas komunikacją do HSW ÷
            czas autem do centrum (tylko gdzie mamy oba źródła).
          </p>
        </div>
        <div className={`overflow-x-auto ${embedded ? "max-h-[420px] overflow-y-auto" : ""}`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Miejscowość</th>
                <th className="px-4 py-3">Autem (ruch)</th>
                <th className="px-4 py-3">Autem (free-flow)</th>
                <th className="px-4 py-3">Korekta ruchem</th>
                <th className="px-4 py-3">Gap HSW (weryf.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carTimesSorted.map((entry) => {
                const loc = entry.localitySlug
                  ? getLocalityBySlug(entry.localitySlug)
                  : undefined;
                const hsw = loc?.destinations.find((d) => d.id === "hsw");
                const verified =
                  hsw != null
                    ? verifiedHswGap(entry.durationCarSec, hsw.transitMin)
                    : null;
                const delay = trafficDelayPct(entry);

                return (
                  <tr key={entry.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {entry.localitySlug ? (
                        <Link
                          href={`/app/miejscowosc/${entry.localitySlug}`}
                          className="text-blue-600 hover:underline"
                        >
                          {entry.name}
                        </Link>
                      ) : (
                        entry.name
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCarMin(entry.durationCarSec)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {formatCarMin(entry.staticDurationCarSec)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={
                          delay > 5
                            ? "text-rose-600 font-medium"
                            : delay < -2
                              ? "text-slate-400"
                              : "text-slate-600"
                        }
                      >
                        {delay > 0 ? "+" : ""}
                        {delay.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {verified != null ? (
                        <span
                          className={`font-bold ${verified >= 3 ? "text-rose-600" : "text-orange-600"}`}
                        >
                          {verified.toFixed(1)}×
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  items,
  variant,
}: {
  title: string;
  subtitle: string;
  items: typeof carTimesSorted;
  variant: "danger" | "success";
}) {
  const border =
    variant === "danger" ? "border-rose-200" : "border-emerald-200";
  return (
    <div className={`rounded-2xl border ${border} bg-white p-6 shadow-sm`}>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      <ol className="mt-4 space-y-2">
        {items.map((e, i) => (
          <li
            key={e.name}
            className="flex justify-between items-center text-sm"
          >
            <span>
              {i + 1}. {e.name}
            </span>
            <span className="font-bold tabular-nums">
              {secToMin(e.durationCarSec)} min
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export { getCarTimeBySlug, formatCarMin, verifiedHswGap, trafficDelayPct };
