"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { getLocalityBySlug, localities } from "@/lib/localities";
import { getDestinationName } from "@/lib/destinations-data";
import { gapRatioColor } from "@/lib/map-config";
import {
  getCarTimeBySlug,
  formatCarMin,
  verifiedHswGap,
  trafficDelayPct,
  carTravelDestination,
} from "@/lib/car-times";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-2xl bg-sky-50" /> }
);

function destLabel(id: string) {
  return getDestinationName(id);
}

export default function MiejscowoscPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locality = getLocalityBySlug(slug);
  const carTime = getCarTimeBySlug(slug);
  const hswDest = locality?.destinations.find((d) => d.id === "hsw");
  const verifiedGap =
    carTime && hswDest
      ? verifiedHswGap(carTime.durationCarSec, hswDest.transitMin)
      : null;

  if (!locality) {
    return (
      <AppShell title="Nie znaleziono">
        <div className="px-4 lg:px-6">
          <p className="text-slate-600">Brak danych dla tej miejscowości.</p>
          <Link href="/app/analiza?tab=gap" className="text-blue-600 text-sm mt-2 inline-block">
            ← Wróć do rankingu
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={locality.name}>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900">{locality.name}</h2>
            <p className="text-slate-500">
              {locality.gmina} · powiat {locality.powiat}
            </p>
            {!locality.hasPolygon && (
              <p className="text-amber-600 text-sm mt-1">
                Brak polygonu OSM — lokalizacja jako marker (fallback)
              </p>
            )}
          </div>
          <span
            className="text-white font-bold px-4 py-2 rounded-xl text-lg"
            style={{ backgroundColor: gapRatioColor(locality.gapRatio) }}
          >
            Gap {locality.gapRatio.toFixed(1)}×
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${carTime ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <Stat label="Kursy dziennie" value={String(locality.dailyCourses)} />
          <Stat label="Ostatni powrót" value={locality.lastReturn} />
          <Stat label="SAS Score (Copernicus)" value={`${locality.sasScore}/100`} />
          {carTime && (
            <Stat
              label={`Autem → ${carTravelDestination}`}
              value={formatCarMin(carTime.durationCarSec)}
              hint={`Korekta ruchem: ${trafficDelayPct(carTime) > 0 ? "+" : ""}${trafficDelayPct(carTime).toFixed(0)}%`}
            />
          )}
        </div>

        {verifiedGap != null && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm text-indigo-900">
            <strong>Gap HSW (zweryfikowany):</strong> {verifiedGap.toFixed(1)}× — komunikacja{" "}
            {hswDest!.transitMin} min vs autem {formatCarMin(carTime!.durationCarSec)} do centrum
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-bold text-sm uppercase text-slate-700">
                Gap ratio vs destynacje
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Destynacja</th>
                  <th className="px-4 py-2">Auto</th>
                  <th className="px-4 py-2">KM</th>
                  <th className="px-4 py-2 text-right">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {locality.destinations.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium">{destLabel(d.id)}</td>
                    <td className="px-4 py-3 text-center">{d.carMin} min</td>
                    <td className="px-4 py-3 text-center">{d.transitMin} min</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {d.ratio.toFixed(1)}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="font-bold text-blue-900 text-sm uppercase mb-2">
              Rekomendacja LLM
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              {locality.recommendation}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm uppercase text-slate-700 mb-2">
            Lokalizacja
          </h3>
          <MapView mode="localities" selectedSlug={slug} />
        </div>

        <div>
          <h3 className="font-bold text-sm uppercase text-slate-700 mb-2">
            Inne miejscowości
          </h3>
          <div className="flex flex-wrap gap-2">
            {localities
              .filter((l) => l.slug !== slug)
              .slice(0, 8)
              .map((l) => (
                <Link
                  key={l.slug}
                  href={`/app/miejscowosc/${l.slug}`}
                  className="text-sm px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50"
                >
                  {l.name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
