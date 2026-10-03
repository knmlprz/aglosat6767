"use client";

// Wynik kontroli w terenie dla miejsca: wybór wartości cechy, notatka, lista wpisów z tej sesji.

import { useRef, useState } from "react";
import type { Cecha, Obserwacja, Wartosc, Weryfikacja } from "@/lib/aglosat/types.ts";
import { CECHA_LABEL, formatujWartosc } from "@/lib/aglosat/vocabulary.ts";
import { WARIANTY, idWpisu, wpisKontroli } from "@/lib/aglosat/weryfikacja.ts";

export function FormularzKontroli({
  odcinki,
  doSprawdzenia,
  obserwacje,
  weryfikacje,
  onDodaj,
  onCofnij,
}: {
  /** Odcinki miejsca: wpis dotyczy wszystkich. */
  odcinki: string[];
  doSprawdzenia: Cecha[];
  obserwacje: Obserwacja[];
  weryfikacje: Weryfikacja[];
  onDodaj: (w: Weryfikacja[]) => void;
  onCofnij: (idWpisu: string) => void;
}) {
  const [notatka, setNotatka] = useState("");
  const [komunikat, setKomunikat] = useState("");
  const naglowek = useRef<HTMLHeadingElement>(null);
  const naMiejscu = new Set(odcinki);
  const przerwy = obserwacje.filter((o) => naMiejscu.has(o.odcinekId) && o.klasa === "przerwany");
  const odrzucone = new Set(weryfikacje.map((w) => w.odrzucaObserwacje).filter(Boolean));
  const aktywnePrzerwy = przerwy.filter((o) => !odrzucone.has(o.id));

  // Wpisy z tej sesji dla tego miejsca, po jednym na wpis (nie na odcinek).
  const wpisy = new Map<string, Weryfikacja>();
  for (const w of weryfikacje) if (naMiejscu.has(w.odcinekId) && !wpisy.has(idWpisu(w))) wpisy.set(idWpisu(w), w);

  const dodaj = (cecha: Cecha, wartosc: Wartosc) => {
    const odrzuca =
      cecha === "ciaglosc" && wartosc === "ciagly"
        ? Object.fromEntries(aktywnePrzerwy.map((o) => [o.odcinekId, o.id]))
        : undefined;
    onDodaj(wpisKontroli(odcinki, cecha, wartosc, { notatka: notatka.trim() || undefined, odrzuca }));
    setNotatka("");
    // Przyciski wartości mogą zniknąć (cecha przestaje być niewiadomą), więc fokus na nagłówek
    // i komunikat dla czytnika ekranu.
    setKomunikat(`Zapisano: ${CECHA_LABEL[cecha]} ${formatujWartosc(cecha, wartosc)}. Trasy przeliczone.`);
    requestAnimationFrame(() => naglowek.current?.focus({ preventScroll: true }));
  };

  if (doSprawdzenia.length === 0 && wpisy.size === 0) return null;

  return (
    <div className="rounded-xl border-2 border-slate-900 p-3">
      <h4 ref={naglowek} tabIndex={-1} className="text-sm font-bold text-slate-900 outline-none">
        Wynik kontroli w terenie
      </h4>
      <p className="sr-only" role="status">
        {komunikat}
      </p>
      {doSprawdzenia.length > 0 && (
        <>
          <p className="mt-0.5 text-xs text-slate-600">
            Wpis zmienia status cechy na „potwierdzone” i od razu przelicza trasy. Zapisany tylko w tej sesji.
          </p>
          <label className="mt-2 block text-xs font-medium text-slate-700">
            Notatka z kontroli (opcjonalnie)
            <input
              type="text"
              value={notatka}
              onChange={(e) => setNotatka(e.target.value)}
              placeholder="np. krawężnik obniżony po obu stronach"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="mt-2 flex flex-col gap-2">
            {doSprawdzenia.map((cecha) => (
              <fieldset key={cecha}>
                <legend className="text-xs font-semibold text-slate-700">{CECHA_LABEL[cecha]}</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {WARIANTY[cecha].map((w) => (
                    <button
                      key={String(w.wartosc)}
                      type="button"
                      onClick={() => dodaj(cecha, w.wartosc)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm hover:border-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-600"
                    >
                      {w.etykieta}
                      {cecha === "ciaglosc" && w.wartosc === "ciagly" && aktywnePrzerwy.length > 0 && (
                        <span className="text-slate-600"> (odrzuć wykrycie modelu)</span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </>
      )}
      {wpisy.size > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-700">Kontrole w tej sesji</p>
          <ul className="mt-1 flex flex-col gap-1">
            {[...wpisy.entries()].map(([id, w]) => (
              <li key={id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {CECHA_LABEL[w.cecha]}: <strong>{formatujWartosc(w.cecha, w.wartosc)}</strong>
                  <span className="text-xs text-slate-600"> · data kontroli {w.dataKontroli}</span>
                  {w.odrzucaObserwacje && <span className="text-xs text-slate-600"> · odrzucono wykrycie modelu</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onCofnij(id);
                    setKomunikat(`Cofnięto: ${CECHA_LABEL[w.cecha]}. Trasy przeliczone.`);
                    requestAnimationFrame(() => naglowek.current?.focus({ preventScroll: true }));
                  }}
                  className="rounded px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50"
                >
                  Cofnij
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
