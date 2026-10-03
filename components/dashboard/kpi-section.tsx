"use client";

import Link from "next/link";
import { Briefcase, MapIcon, BarChart3Icon, CarIcon } from "lucide-react";
import { summary, topDeserts } from "@/lib/localities";
import { carTimesSorted, carTravelDestination, secToMin } from "@/lib/car-times";

export function DashboardKpi() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <KpiCard title="Sołectwa przeanalizowane" value={String(summary.totalAnalyzed)} />
        <KpiCard
          title="Gap ratio &gt; 3×"
          value={String(summary.gapAbove3)}
          variant="danger"
        />
        <KpiCard title="Bez połączenia nocnego" value={String(summary.noNightService)} />
        <KpiCard
          title="Pasażerów/dzień → HSW (szczyt)"
          value={String(summary.hswPeakPassengers)}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 uppercase text-sm">
            Top 3 Transportation Deserts
          </h3>
          <div className="flex flex-col gap-2">
            {topDeserts.map((d, i) => (
              <Link
                key={d.slug}
                href={`/app/miejscowosc/${d.slug}`}
                className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
              >
                <span className="font-medium">
                  {i + 1}. {d.name}
                </span>
                <span className="text-rose-600 font-bold">{d.gapRatio.toFixed(1)}×</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
          <div className="flex gap-4">
            <Briefcase className="text-emerald-600 shrink-0" size={36} />
            <div>
              <h3 className="font-bold text-emerald-900">Kluczowa statystyka</h3>
              <p className="text-emerald-800 text-sm mt-2">
                <strong>{summary.hswPeakPassengers} osób dziennie</strong> przyjeżdża
                komunikacją do HSW w godzinach szczytu.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
          <div className="flex gap-4">
            <CarIcon className="text-rose-600 shrink-0" size={36} />
            <div>
              <h3 className="font-bold text-rose-900">Najdalszy dojazd autem</h3>
              <p className="text-rose-800 text-sm mt-2">
                <strong>{carTimesSorted[0]?.name}</strong> —{" "}
                {secToMin(carTimesSorted[0]?.durationCarSec ?? 0)} min do{" "}
                {carTravelDestination}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavCard
          href="/app/mapa"
          icon={<MapIcon className="size-6" />}
          title="Mapa"
          desc="4 warstwy: regionalny, trasy, przystanki, destynacje — przełączane zakładkami."
        />
        <NavCard
          href="/app/analiza"
          icon={<BarChart3Icon className="size-6" />}
          title="Analiza"
          desc="Gap ratio, dostępność autem i przepływy bramkowe w jednym miejscu."
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: string;
  variant?: "danger" | "success";
}) {
  const border =
    variant === "danger"
      ? "border-rose-200 bg-rose-50"
      : variant === "success"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${border}`}>
      <div
        className="text-sm text-slate-500 font-medium"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="text-3xl font-black text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="text-blue-600">{icon}</div>
      <div className="font-bold text-slate-900 text-lg">{title}</div>
      <div className="text-sm text-slate-500">{desc}</div>
    </Link>
  );
}
