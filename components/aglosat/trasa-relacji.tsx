"use client";

// Dojście budynek → usługa liczone na żywo: trasa piesza, udokumentowana i wymagająca weryfikacji.
// Porównanie ze stanem wyjściowym pokazuje, co zmieniła kontrola w terenie.

import type { Odcinek, OsmDostepnosc, Pilot } from "@/lib/aglosat/types.ts";
import type { TrasyRelacji } from "@/lib/aglosat/routing.ts";
import {
  CECHA_LABEL,
  KATEGORIA_LABEL,
  OSM_DOSTEPNOSC_LABEL,
  OSM_DOSTEPNOSC_POLA,
  TRASA_LABEL,
  odmiana,
  opisSygnalizacji,
} from "@/lib/aglosat/vocabulary.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";

export type Relacja = { budynekId: string; uslugaId: string };

const m = (x: number) => `${Math.round(x)} m`;

export function TrasaRelacji({
  pilot,
  relacja,
  trasy,
  bazowe,
  oceny,
  liczbaKontroli,
  onZmienRelacje,
  onWybierzOdcinek,
  onPokazNaMapie,
  onPrzywroc,
}: {
  pilot: Pilot;
  relacja: Relacja;
  trasy: TrasyRelacji;
  bazowe: TrasyRelacji;
  oceny: Map<string, OcenaOdcinka>;
  liczbaKontroli: number;
  onZmienRelacje: (r: Relacja) => void;
  onWybierzOdcinek: (id: string) => void;
  onPokazNaMapie: () => void;
  onPrzywroc: () => void;
}) {
  const budynek = pilot.budynki.find((b) => b.id === relacja.budynekId)!;
  const usluga = pilot.uslugi.find((u) => u.id === relacja.uslugaId)!;
  const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
  const nazwa = (r: Relacja) => {
    const b = pilot.budynki.find((x) => x.id === r.budynekId);
    const u = pilot.uslugi.find((x) => x.id === r.uslugaId);
    return `${b?.adres ?? "budynek"} → ${u?.nazwa} (${u ? KATEGORIA_LABEL[u.kategoria] : ""})`;
  };

  const dok = trasy.udokumentowana;
  const wer = trasy.weryfikacji;
  const zmianaDok = (bazowe.udokumentowana?.dlugoscM ?? null) !== (dok?.dlugoscM ?? null);
  const zmianaWer = (bazowe.weryfikacji?.dlugoscM ?? null) !== (wer?.dlugoscM ?? null);

  return (
    <section aria-labelledby="relacja-tytul" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="relacja-tytul" className="text-sm font-bold text-slate-800">
            Dojście do usługi, przeliczane na żywo
          </h3>
          <label className="mt-1 block text-xs text-slate-600">
            <span className="sr-only">Wybierz dojście</span>
            <select
              value={`${relacja.budynekId}|${relacja.uslugaId}`}
              onChange={(e) => {
                const [budynekId, uslugaId] = e.target.value.split("|");
                onZmienRelacje({ budynekId, uslugaId });
              }}
              className="mt-0.5 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
            >
              {pilot.kandydaci.map((k) => (
                <option key={`${k.budynekId}|${k.uslugaId}`} value={`${k.budynekId}|${k.uslugaId}`}>
                  {nazwa(k)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPokazNaMapie}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Pokaż na mapie
          </button>
          {liczbaKontroli > 0 && (
            <button
              type="button"
              onClick={onPrzywroc}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Przywróć stan wyjściowy ({liczbaKontroli} {odmiana(liczbaKontroli, ["kontrola", "kontrole", "kontroli"])})
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3" aria-live="polite">
        <Komorka tytul="pieszo, bez profilu" znak={<Linia kolor="#cbd5e1" przerywana="2 3" />}>
          <span className="text-2xl font-black text-slate-900">{trasy.piesza ? m(trasy.piesza.dlugoscM) : "brak"}</span>
        </Komorka>

        <Komorka
          tytul={TRASA_LABEL.udokumentowana}
          znak={<Linia kolor="#4ade80" />}
          ton={dok ? "ok" : "brak"}
          zmiana={zmianaDok ? `było: ${bazowe.udokumentowana ? m(bazowe.udokumentowana.dlugoscM) : "brak"}` : undefined}
        >
          {dok ? (
            <>
              <span className="text-2xl font-black text-slate-900">{m(dok.dlugoscM)}</span>
              {trasy.wspolczynnikObjazdu !== null && (
                <span className="block text-xs text-slate-600">
                  współczynnik objazdu {trasy.wspolczynnikObjazdu.toFixed(2).replace(".", ",")}×
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-800">
              Nie można potwierdzić trasy
              {wer && wer.niewiadome.length > 0 && (
                <span className="block font-normal text-slate-600">
                  brakuje informacji o {wer.niewiadome.length}{" "}
                  {odmiana(wer.niewiadome.length, ["miejscu", "miejscach", "miejscach"])}
                </span>
              )}
            </span>
          )}
        </Komorka>

        <Komorka
          tytul={TRASA_LABEL.weryfikacji}
          znak={<Linia kolor="#fbbf24" przerywana="6 4" />}
          ton={wer ? "uwaga" : "brak"}
          zmiana={zmianaWer ? `było: ${bazowe.weryfikacji ? m(bazowe.weryfikacji.dlugoscM) : "brak"}` : undefined}
        >
          {wer ? (
            <>
              <span className="text-2xl font-black text-slate-900">{m(wer.dlugoscM)}</span>
              <span className="block text-xs text-slate-600">
                {wer.niewiadome.length === 0
                  ? "bez niewiadomych"
                  : `${wer.niewiadome.length} ${odmiana(wer.niewiadome.length, ["niewiadoma", "niewiadome", "niewiadomych"])} po drodze:`}
              </span>
              <ul className="mt-1 flex flex-col gap-1">
                {wer.niewiadome.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onWybierzOdcinek(id)}
                      className="text-left text-xs font-medium text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
                    >
                      {lokalizacja(odcinki.get(id)!, pilot)}: brak{" "}
                      {(oceny.get(id)?.nieznane ?? []).map((c) => CECHA_LABEL[c]).join(", ")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-800">
              Brak przejścia dla profilu, nawet licząc niewiadome jako przejezdne
            </span>
          )}
        </Komorka>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Start: {budynek.adres ?? "budynek mieszkalny"}. Cel: {usluga.nazwa}
        {usluga.wejscie?.wheelchair ? ` (wejście w OSM: wheelchair=${usluga.wejscie.wheelchair})` : " (brak danych o wejściu w OSM)"}.
      </p>
      <PodsumowanieOsmTrasy
        ids={(dok ?? wer ?? trasy.piesza)?.odcinki ?? []}
        odcinki={odcinki}
      />
    </section>
  );
}

function PodsumowanieOsmTrasy({ ids, odcinki }: { ids: string[]; odcinki: Map<string, Odcinek> }) {
  if (ids.length === 0) return null;
  const zbiory = Object.fromEntries(OSM_DOSTEPNOSC_POLA.map((k) => [k, new Set<string>()])) as Record<
    keyof OsmDostepnosc,
    Set<string>
  >;
  for (const id of ids) {
    const osm = odcinki.get(id)?.osm;
    if (!osm) continue;
    for (const k of OSM_DOSTEPNOSC_POLA) if (osm[k]) zbiory[k].add(k === "traffic_signals" ? opisSygnalizacji(osm[k]) : osm[k]!);
  }
  const wiersze = OSM_DOSTEPNOSC_POLA.filter((k) => zbiory[k].size > 0).map(
    (k) => `${OSM_DOSTEPNOSC_LABEL[k]}: ${[...zbiory[k]].join(", ")}`,
  );
  if (wiersze.length === 0) {
    return <p className="mt-2 text-xs text-slate-600">Na tej trasie OSM nie ma tagów dostępności (wheelchair, surface, smoothness, …).</p>;
  }
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-xs font-semibold uppercase text-slate-600">Dane OSM na trasie</h4>
      <ul className="mt-1 flex flex-col gap-0.5">
        {wiersze.map((w) => (
          <li key={w} className="text-xs text-slate-800">
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Komorka({
  tytul,
  znak,
  ton,
  zmiana,
  children,
}: {
  tytul: string;
  znak: React.ReactNode;
  ton?: "ok" | "uwaga" | "brak";
  zmiana?: string;
  children: React.ReactNode;
}) {
  const kolor =
    ton === "ok" ? "border-emerald-200 bg-emerald-50" : ton === "brak" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-xl border p-3 ${kolor}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-600">
        {znak}
        {tytul}
      </div>
      <div className="mt-1">{children}</div>
      {zmiana && (
        <span className="mt-1 inline-block rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
          zmiana po kontroli · {zmiana}
        </span>
      )}
    </div>
  );
}

function Linia({ kolor, przerywana }: { kolor: string; przerywana?: string }) {
  return (
    <svg width="22" height="8" aria-hidden className="shrink-0">
      <line x1="1" y1="4" x2="21" y2="4" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
      <line x1="1" y1="4" x2="21" y2="4" stroke={kolor} strokeWidth="3.5" strokeDasharray={przerywana} />
    </svg>
  );
}
