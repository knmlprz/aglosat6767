"use client";

// Trasa kontroli: planista podaje start i czas, system układa spacer przez miejsca z czoła rankingu.
// Założenia (minuty na miejsce, tempo) są widoczne i edytowalne.

import { useMemo, useState } from "react";
import type { Pilot } from "@/lib/aglosat/types.ts";
import { DOMYSLNE_PARAMETRY, type TrasaKontroli } from "@/lib/aglosat/kontrola.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import { CECHA_LABEL, odmiana } from "@/lib/aglosat/vocabulary.ts";
import { dzisiaj } from "@/lib/aglosat/weryfikacja.ts";

const BUDZETY = [30, 60, 90, 120];

export type UstawieniaKontroli = { startId: string; budzetMin: number; minutNaMiejsce: number; tempoKmH: number };

export function TrasaKontroliPanel({
  pilot,
  trasa,
  ustawienia,
  onZmienUstawienia,
  naMapie,
  onPokazNaMapie,
  onWybierzOdcinek,
}: {
  pilot: Pilot;
  trasa: TrasaKontroli;
  ustawienia: UstawieniaKontroli;
  onZmienUstawienia: (u: UstawieniaKontroli) => void;
  naMapie: boolean;
  onPokazNaMapie: () => void;
  onWybierzOdcinek: (id: string) => void;
}) {
  const { startId, budzetMin, minutNaMiejsce, tempoKmH } = ustawienia;
  const ustaw = (zmiana: Partial<UstawieniaKontroli>) => onZmienUstawienia({ ...ustawienia, ...zmiana });
  const [skopiowano, setSkopiowano] = useState(false);

  const budynki = useMemo(
    () => pilot.budynki.filter((b) => b.adres).sort((a, b) => a.adres!.localeCompare(b.adres!, "pl", { numeric: true })),
    [pilot],
  );
  const start = pilot.budynki.find((b) => b.id === startId)!;
  const odcinki = useMemo(() => new Map(pilot.odcinki.map((o) => [o.id, o])), [pilot]);

  const tekst = [
    `Trasa kontroli AgloSat, ${dzisiaj()}. Start i powrót: ${start.adres}.`,
    ...trasa.przystanki.map(
      (p) =>
        `${p.nr}. ok. ${p.dotarcieMin} min: ${lokalizacja(odcinki.get(p.odcinekId)!, pilot)}; sprawdź: ${p.cechy
          .map((c) => CECHA_LABEL[c])
          .join(", ")} (miejsce ${p.pozycjaWRankingu} w rankingu)`,
    ),
    `Razem ${(trasa.dystansM / 1000).toFixed(1).replace(".", ",")} km, ${trasa.razemMin} min (marsz ${trasa.marszMin} + kontrola ${trasa.kontrolaMin}).`,
    `Założenia: ${minutNaMiejsce} min na miejsce, ${tempoKmH} km/h.`,
  ].join("\n");

  return (
    <section aria-labelledby="kontrola-tytul" className="flex flex-col gap-3">
      <div>
        <h3 id="kontrola-tytul" tabIndex={-1} className="text-sm font-bold text-slate-800 outline-none">
          Trasa kontroli
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Spacer przez miejsca z czoła rankingu, które mieszczą się w czasie. Czas obejmuje przejście, sprawdzanie i powrót
          do startu. Miejsca sprawdzone w tej sesji pomijamy.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
          Start i powrót
          <select
            value={startId}
            onChange={(e) => ustaw({ startId: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            {budynki.map((b) => (
              <option key={b.id} value={b.id}>
                {b.adres}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-700">
          Czas na kontrolę
          <select
            value={budzetMin}
            onChange={(e) => ustaw({ budzetMin: Number(e.target.value) })}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            {BUDZETY.map((b) => (
              <option key={b} value={b}>
                {b} min
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Minut na miejsce
          <input
            type="number"
            min={1}
            max={30}
            value={minutNaMiejsce}
            onChange={(e) => ustaw({ minutNaMiejsce: Math.max(1, Number(e.target.value) || 1) })}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Tempo marszu (km/h)
          <input
            type="number"
            min={1}
            max={8}
            step={0.5}
            value={tempoKmH}
            onChange={(e) => ustaw({ tempoKmH: Math.max(1, Number(e.target.value) || 1) })}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3" aria-live="polite">
        <p className="text-sm font-semibold text-slate-900">
          {trasa.przystanki.length} {odmiana(trasa.przystanki.length, ["miejsce", "miejsca", "miejsc"])},{" "}
          {(trasa.dystansM / 1000).toFixed(1).replace(".", ",")} km, {trasa.razemMin} min
        </p>
        <p className="text-xs text-slate-600">
          marsz {trasa.marszMin} min + kontrola {trasa.kontrolaMin} min; {trasa.pominiete}{" "}
          {odmiana(trasa.pominiete, ["miejsce", "miejsca", "miejsc"])} z pierwszych {DOMYSLNE_PARAMETRY.zCzola} nie mieści się w czasie
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPokazNaMapie}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
          >
            {naMapie ? "Przybliż na mapie" : "Pokaż na mapie"}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(tekst);
                setSkopiowano(true);
                setTimeout(() => setSkopiowano(false), 2000);
              } catch {
                setSkopiowano(false);
              }
            }}
            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            {skopiowano ? "Skopiowano" : "Kopiuj listę dla zespołu"}
          </button>
        </div>
      </div>

      {trasa.przystanki.length === 0 ? (
        <p className="text-sm text-slate-600">Żadne miejsce z czoła rankingu nie mieści się w tym czasie. Wydłuż czas albo zmień start.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {trasa.przystanki.map((p) => (
            <li key={p.odcinekId}>
              <button
                type="button"
                onClick={() => onWybierzOdcinek(p.odcinekId)}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-bold text-white">
                  K{p.nr}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-slate-900">{lokalizacja(odcinki.get(p.odcinekId)!, pilot)}</span>
                  <span className="text-xs text-slate-600">
                    ok. {p.dotarcieMin} min od startu · sprawdź: {p.cechy.map((c) => CECHA_LABEL[c]).join(", ")} · miejsce{" "}
                    {p.pozycjaWRankingu} w rankingu
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
