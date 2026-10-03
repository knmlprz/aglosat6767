"use client";

import Link from "next/link";
import {
  localities,
  type Locality,
} from "@/lib/localities";
import { gapRatioColor } from "@/lib/map-config";
import { getCarTimeBySlug, formatCarMin } from "@/lib/car-times";

export function GapRatioRanking({ embedded = false }: { embedded?: boolean }) {
  const sorted = [...localities].sort((a, b) => b.gapRatio - a.gapRatio);

  return (
    <div className={embedded ? "" : "px-4 lg:px-6"}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            Ranking Gap Ratio — wszystkie miejscowości
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Stosunek czasu dojazdu komunikacją do czasu autem. Wartość &gt; 3× =
            transportation desert.
          </p>
        </div>
        <div className={`overflow-x-auto ${embedded ? "max-h-[420px] overflow-y-auto" : ""}`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Miejscowość</th>
                <th className="px-4 py-3">Gmina</th>
                <th className="px-4 py-3">Gap ratio</th>
                <th className="px-4 py-3">Kursy/dzień</th>
                <th className="px-4 py-3">Ostatni powrót</th>
                <th className="px-4 py-3">SAS</th>
                <th className="px-4 py-3">Autem → SW</th>
                <th className="px-4 py-3">Polygon OSM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((loc, i) => (
                <Row key={loc.slug} rank={i + 1} loc={loc} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ rank, loc }: { rank: number; loc: Locality }) {
  const color = gapRatioColor(loc.gapRatio);
  const car = getCarTimeBySlug(loc.slug);
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 text-slate-400">{rank}</td>
      <td className="px-4 py-3">
        <Link
          href={`/app/miejscowosc/${loc.slug}`}
          className="font-semibold text-blue-600 hover:underline"
        >
          {loc.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-600">{loc.gmina}</td>
      <td className="px-4 py-3">
        <span
          className="font-bold px-2 py-0.5 rounded text-white text-xs"
          style={{ backgroundColor: color }}
        >
          {loc.gapRatio.toFixed(1)}×
        </span>
      </td>
      <td className="px-4 py-3">{loc.dailyCourses}</td>
      <td className="px-4 py-3">{loc.lastReturn}</td>
      <td className="px-4 py-3">{loc.sasScore}/100</td>
      <td className="px-4 py-3 tabular-nums text-slate-600">
        {car ? formatCarMin(car.durationCarSec) : "—"}
      </td>
      <td className="px-4 py-3">
        {loc.hasPolygon ? (
          <span className="text-emerald-600 text-xs font-medium">✓ polygon</span>
        ) : (
          <span className="text-amber-600 text-xs font-medium">○ marker</span>
        )}
      </td>
    </tr>
  );
}
