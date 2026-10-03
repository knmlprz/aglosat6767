"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, CarIcon, MapIcon, BarChart3Icon } from "lucide-react";
import { summary, topDeserts } from "@/lib/localities";
import { carTimesSorted, carTravelDestination, secToMin } from "@/lib/car-times";
import { MapExplorer } from "@/components/map/map-explorer";
import { AnalizaExplorer } from "@/components/analiza-explorer";

const NAV = [
  { href: "#podsumowanie", label: "Podsumowanie" },
  { href: "#mapa", label: "Mapa" },
  { href: "#analiza", label: "Analiza" },
];

export function FullDashboard() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* Sticky mini-nav dla mentorów */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-6 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-slate-800 mr-2">Aglometer</span>
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              {n.label}
            </a>
          ))}
        </div>
      </div>

      {/* KPI + insights */}
      <section id="podsumowanie" className="px-4 lg:px-6 flex flex-col gap-6 scroll-mt-14">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Transportation Deserts — aglomeracja Stalowa Wola
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Regionalna i miejska analiza dostępności transportowej
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi title="Sołectwa" value={String(summary.totalAnalyzed)} />
          <Kpi title="Gap &gt; 3×" value={String(summary.gapAbove3)} danger />
          <Kpi title="Bez nocnych" value={String(summary.noNightService)} />
          <Kpi title="→ HSW (szczyt)" value={String(summary.hswPeakPassengers)} ok />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard title="Top 3 Transportation Deserts" icon={<BarChart3Icon className="size-5 text-rose-500" />}>
            {topDeserts.map((d, i) => (
              <Link
                key={d.slug}
                href={`/app/miejscowosc/${d.slug}`}
                className="flex justify-between py-2 border-b border-slate-100 last:border-0 hover:text-blue-600"
              >
                <span>{i + 1}. {d.name}</span>
                <span className="font-bold text-rose-600">{d.gapRatio.toFixed(1)}×</span>
              </Link>
            ))}
          </InsightCard>

          <InsightCard title="Kluczowy insight" icon={<Briefcase className="size-5 text-emerald-600" />}>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>{summary.hswPeakPassengers} osób/dzień</strong> przyjeżdża
              komunikacją do HSW w godzinach szczytu — główny wektor popytu na
              poprawę dostępności.
            </p>
          </InsightCard>

          <InsightCard title="Najdalszy dojazd autem" icon={<CarIcon className="size-5 text-rose-500" />}>
            <p className="text-sm text-slate-700">
              <strong>{carTimesSorted[0]?.name}</strong> —{" "}
              {secToMin(carTimesSorted[0]?.durationCarSec ?? 0)} min do{" "}
              {carTravelDestination}.
            </p>
          </InsightCard>
        </div>
      </section>

      {/* Mapa */}
      <section className="px-4 lg:px-6 scroll-mt-14">
        <SectionHeader
          id="mapa"
          icon={<MapIcon className="size-5" />}
          title="Mapa interaktywna"
          desc="Przełącz warstwy: regionalny gap ratio, trasy, przystanki, destynacje."
        />
        <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-sky-100" />}>
          <MapExplorer compact />
        </Suspense>
      </section>

      {/* Analiza */}
      <section className="px-4 lg:px-6 scroll-mt-14">
        <SectionHeader
          id="analiza"
          icon={<BarChart3Icon className="size-5" />}
          title="Analiza danych"
          desc="Gap ratio, czasy autem i przepływy bramkowe."
        />
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100" />}>
          <AnalizaExplorer />
        </Suspense>
      </section>
    </div>
  );
}

function SectionHeader({
  id,
  icon,
  title,
  desc,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div id={id} className="mb-4">
      <div className="flex items-center gap-2 text-blue-600">{icon}</div>
      <h2 className="text-xl font-bold text-slate-900 mt-1">{title}</h2>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function Kpi({
  title,
  value,
  danger,
  ok,
}: {
  title: string;
  value: string;
  danger?: boolean;
  ok?: boolean;
}) {
  const bg = danger
    ? "bg-rose-50 border-rose-200"
    : ok
      ? "bg-emerald-50 border-emerald-200"
      : "bg-white border-slate-200";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div
        className="text-xs uppercase text-slate-500 font-semibold"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-sm uppercase text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}
