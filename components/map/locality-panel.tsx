"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import {
  getLocalityBySlug,
  summary,
  topDeserts,
  type Locality,
} from "@/lib/localities";
import { getDestinationName } from "@/lib/destinations-data";

function destName(id: string) {
  return getDestinationName(id).split(" (")[0];
}

type Props = {
  selectedSlug: string | null;
  onClose: () => void;
};

export function LocalityPanel({ selectedSlug, onClose }: Props) {
  const locality = selectedSlug ? getLocalityBySlug(selectedSlug) : null;

  return (
    <div className="absolute top-4 right-4 z-[400] w-full max-w-sm bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100%-2rem)]">
      <div className="bg-slate-900/90 backdrop-blur text-white p-4">
        <h2 className="text-xl font-bold">Aglometer</h2>
        <p className="text-slate-300 text-xs mt-1">
          Analiza transportation deserts — powiat stalowowolski
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!locality ? (
          <DefaultPanel />
        ) : (
          <SelectedPanel locality={locality} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function DefaultPanel() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatBox value={summary.totalAnalyzed} label="SOŁECTWA" />
        <StatBox
          value={summary.gapAbove3}
          label="GAP &gt; 3×"
          variant="danger"
        />
        <StatBox value={summary.noNightService} label="BRAK NOCNYCH" />
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase">
          Top 3 Transportation Deserts
        </h3>
        <div className="flex flex-col gap-2">
          {topDeserts.map((d, i) => (
            <Link
              key={d.slug}
              href={`/app/miejscowosc/${d.slug}`}
              className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-rose-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-rose-100 text-rose-600 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  {i + 1}
                </div>
                <span className="font-medium text-slate-700">{d.name}</span>
              </div>
              <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2 py-1 rounded">
                {d.gapRatio.toFixed(1)}×
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Briefcase className="text-emerald-500 shrink-0" size={32} />
          <div>
            <h4 className="font-bold text-emerald-900 leading-tight">
              Insight Miejscowy
            </h4>
            <p className="text-emerald-700 text-sm mt-1">
              Obecnie{" "}
              <strong>{summary.hswPeakPassengers} osób dziennie</strong>{" "}
              przyjeżdża komunikacją do strefy przemysłowej HSW w godzinach
              szczytu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedPanel({
  locality,
  onClose,
}: {
  locality: Locality;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{locality.name}</h2>
          <p className="text-slate-500 font-medium">powiat {locality.powiat}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-sm font-bold"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-3">
        <MiniStat label="KURSY/DZIEŃ" value={String(locality.dailyCourses)} />
        <MiniStat label="OST. POWRÓT" value={locality.lastReturn} />
        <MiniStat
          label="SAS"
          value={`${locality.sasScore}/100`}
          accent
        />
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase">
          Gap Ratio vs Destynacje
        </h3>
        <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-2">Cel</th>
                <th className="px-3 py-2">Auto</th>
                <th className="px-3 py-2">KM</th>
                <th className="px-3 py-2 text-right">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locality.destinations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{destName(d.id)}</td>
                  <td className="px-3 py-2 text-slate-600">{d.carMin}m</td>
                  <td className="px-3 py-2 text-slate-600">{d.transitMin}m</td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${d.ratio >= 3 ? "text-rose-600" : "text-orange-500"}`}
                  >
                    {d.ratio.toFixed(1)}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
        <span className="font-bold text-blue-900 text-xs uppercase tracking-wide block mb-1">
          Rekomendacja LLM
        </span>
        <p className="text-blue-800 text-sm">{locality.recommendation}</p>
      </div>

      <Link
        href={`/app/miejscowosc/${locality.slug}`}
        className="text-center text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        Pełny profil miejscowości →
      </Link>
    </div>
  );
}

function StatBox({
  value,
  label,
  variant,
}: {
  value: number;
  label: string;
  variant?: "danger";
}) {
  const bg = variant === "danger" ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100";
  const text = variant === "danger" ? "text-rose-600" : "text-slate-800";
  return (
    <div className={`${bg} p-3 rounded-xl text-center border`}>
      <div className={`text-2xl font-black ${text}`}>{value}</div>
      <div
        className="text-[10px] font-semibold text-slate-500 uppercase mt-1"
        dangerouslySetInnerHTML={{ __html: label }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl flex-1 border ${accent ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}
    >
      <div className="text-[10px] font-semibold text-slate-500 uppercase">
        {label}
      </div>
      <div
        className={`text-xl font-black ${accent ? "text-indigo-700" : "text-slate-800"}`}
      >
        {value}
      </div>
    </div>
  );
}
