"use client";

// Ranking miejsc do kontroli według wpływu na dojścia do usług (analiza bazowa).

import { useState } from "react";
import type { Pilot, WynikWplywu } from "@/lib/aglosat/types.ts";
import { CECHA_LABEL, ETYKIETA_ANALIZA_BAZOWA } from "@/lib/aglosat/vocabulary.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";

const NA_START = 10;

export function RankingLista({
  pilot,
  wybrany,
  onWybierz,
  sprawdzone,
}: {
  pilot: Pilot;
  wybrany: WynikWplywu | null;
  onWybierz: (odcinekId: string) => void;
  /** Odcinki z kontrolą w tej sesji. */
  sprawdzone: Set<string>;
}) {
  const [wszystkie, setWszystkie] = useState(false);
  const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
  const lista = wszystkie ? pilot.ranking : pilot.ranking.slice(0, NA_START);

  return (
    <section aria-labelledby="ranking-tytul" className="flex min-h-0 flex-col gap-3">
      <div>
        <h3 id="ranking-tytul" className="text-sm font-bold text-slate-800">
          Miejsca, których sprawdzenie najbardziej zmienia dostęp do usług
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Priorytet weryfikacji: co się stanie z dojściami, jeśli miejsce okaże się nieprzejezdne. {ETYKIETA_ANALIZA_BAZOWA}:
          kontrole z tej sesji nie zmieniają kolejności.
        </p>
      </div>
      <ol className="flex flex-col gap-1.5">
        {lista.map((r, i) => {
          const odc = odcinki.get(r.odcinekId)!;
          const aktywny = wybrany?.odcinekId === r.odcinekId;
          return (
            <li key={r.odcinekId}>
              <button
                type="button"
                aria-pressed={aktywny}
                onClick={() => onWybierz(r.odcinekId)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
                  aktywny ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i < 3 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                  aria-label={`pozycja ${i + 1}`}
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold text-slate-900">{lokalizacja(odc, pilot)}</span>
                  {r.odcinki.some((id) => sprawdzone.has(id)) && (
                    <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                      sprawdzone w tej sesji
                    </span>
                  )}
                  <span className="text-xs text-slate-600">
                    {r.utraconeRelacje > 0 && <>traci trasę: {r.utraconeRelacje} </>}
                    {r.utraconeRelacje > 0 && r.wydluzoneRelacje > 0 && "· "}
                    {r.wydluzoneRelacje > 0 && <>wydłuża się: {r.wydluzoneRelacje} (śr. +{r.dodatkowaDrogaM} m)</>}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {r.brakujaceCechy.map((c) => (
                      <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                        brak: {CECHA_LABEL[c]}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {pilot.ranking.length > NA_START && (
        <button
          type="button"
          onClick={() => setWszystkie((w) => !w)}
          className="self-start rounded-lg px-2 py-1 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
        >
          {wszystkie ? `Pokaż pierwsze ${NA_START}` : `Pokaż wszystkie (${pilot.ranking.length})`}
        </button>
      )}
    </section>
  );
}
