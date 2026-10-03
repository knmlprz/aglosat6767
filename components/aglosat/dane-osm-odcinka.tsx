import type { OsmDostepnosc } from "@/lib/aglosat/types.ts";
import { OSM_DOSTEPNOSC_LABEL, OSM_DOSTEPNOSC_POLA } from "@/lib/aglosat/vocabulary.ts";

export function DaneOsmOdcinka({ osm, kompakt }: { osm?: OsmDostepnosc | null; kompakt?: boolean }) {
  const dane = osm ?? {
    highway: null,
    wheelchair: null,
    incline: null,
    surface: null,
    smoothness: null,
    kerb: null,
    width: null,
  };
  const znane = OSM_DOSTEPNOSC_POLA.filter((k) => dane[k]);
  if (kompakt) {
    if (znane.length === 0) return <p className="mt-1 text-xs text-slate-600">Brak tagów dostępności w OSM na tym way.</p>;
    return (
      <p className="mt-1 text-xs text-slate-700">
        OSM: {znane.map((k) => `${OSM_DOSTEPNOSC_LABEL[k]}=${dane[k]}`).join(" · ")}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-bold text-slate-800">Dane OSM o odcinku</h4>
      <dl className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {OSM_DOSTEPNOSC_POLA.map((k) => (
          <div key={k} className="flex flex-col rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-[11px] font-medium uppercase text-slate-500">{OSM_DOSTEPNOSC_LABEL[k]}</dt>
            <dd className="font-mono text-xs text-slate-900">{dane[k] ?? "brak w OSM"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
