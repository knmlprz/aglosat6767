"use client";

// Etykietowanie próbki referencyjnej: człowiek ocenia wycinek bez wiedzy o odpowiedzi modelu.
// Klawisze: 1, 2, 3 przypisują klasę i przechodzą dalej; ← → nawigacja; S pomija; Backspace usuwa etykietę.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAglosat } from "@/components/aglosat/stan-aglosat";
import { WycinekObrazu } from "@/components/aglosat/wycinek-obrazu";
import { KLASY_OBRAZU, type PlikEtykiet } from "@/lib/aglosat/etykiety.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import type { KlasaObrazu, Wycinek } from "@/lib/aglosat/types.ts";

const PUSTY_ZBIOR = new Set<string>();
const CEL = 40;

/** Stała, wymieszana kolejność: żeby nie opisywać po kolei według rankingu. */
function wymieszaj(lista: Wycinek[]): Wycinek[] {
  const klucz = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  return [...lista].sort((a, b) => klucz(a.id) - klucz(b.id));
}

export function EtykietowanieView() {
  const { wczytanie } = useAglosat();
  const pilot = wczytanie.stan === "gotowe" ? wczytanie.pilot : null;
  const [etykiety, setEtykiety] = useState<PlikEtykiet["etykiety"] | null>(null);
  const [nr, setNr] = useState(0);
  const [kto, setKto] = useState("");
  const [blad, setBlad] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/etykiety")
      .then((r) => r.json() as Promise<PlikEtykiet>)
      .then((p) => setEtykiety(p.etykiety))
      .catch((e: unknown) => setBlad(String(e)));
  }, []);

  const kolejka = useMemo(() => (pilot ? wymieszaj(pilot.wycinki) : []), [pilot]);
  const wycinek = kolejka[nr];
  const opisane = etykiety ? kolejka.filter((w) => etykiety[w.id]).length : 0;

  const zapisz = useCallback(
    async (klasa: KlasaObrazu | null) => {
      if (!wycinek) return;
      const res = await fetch("/api/etykiety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wycinekId: wycinek.id, klasa, kto: kto.trim() || undefined }),
      });
      if (!res.ok) {
        setBlad(((await res.json()) as { blad?: string }).blad ?? `HTTP ${res.status}`);
        return;
      }
      setBlad(null);
      setEtykiety((prev) => {
        const nowe = { ...(prev ?? {}) };
        if (klasa) nowe[wycinek.id] = { klasa, kiedy: new Date().toISOString(), ...(kto.trim() ? { kto: kto.trim() } : {}) };
        else delete nowe[wycinek.id];
        return nowe;
      });
      if (klasa) setNr((n) => Math.min(n + 1, kolejka.length - 1));
    },
    [wycinek, kto, kolejka.length],
  );

  useEffect(() => {
    const naKlawisz = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("input, select, textarea")) return;
      const k = KLASY_OBRAZU.find((x) => x.klawisz === e.key);
      if (k) void zapisz(k.klasa);
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "s") setNr((n) => Math.min(n + 1, kolejka.length - 1));
      else if (e.key === "ArrowLeft") setNr((n) => Math.max(n - 1, 0));
      else if (e.key === "Backspace") void zapisz(null);
    };
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [zapisz, kolejka.length]);

  if (!pilot || !etykiety) {
    return blad ? (
      <p role="alert" className="mx-4 text-sm text-rose-800 lg:mx-6">
        Nie udało się wczytać etykiet: {blad}
      </p>
    ) : (
      <div className="mx-4 h-40 animate-pulse rounded-xl bg-slate-100 lg:mx-6" aria-busy="true" />
    );
  }

  const odcinek = pilot.odcinki.find((o) => o.id === wycinek.odcinekId)!;
  const obecna = etykiety[wycinek.id]?.klasa;

  return (
    <div className="flex flex-col gap-6 px-4 pb-40 lg:px-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">Próbka referencyjna dla modelu</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Oceń, co widać na obrazie wzdłuż przerywanej linii. Odpowiedź modelu jest ukryta, żeby nie sugerowała oceny. Z tych
          etykiet liczymy, jak często model się myli. Zgodność z obrazem to nie to samo co stan w terenie.
        </p>
        <p className="text-sm font-semibold text-slate-800" aria-live="polite">
          Opisane: {opisane} z {kolejka.length} (cel: co najmniej {CEL})
        </p>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <div className="h-full bg-slate-900" style={{ width: `${(100 * opisane) / kolejka.length}%` }} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <section aria-labelledby="wycinek-tytul" className="flex flex-col gap-2">
          <h3 id="wycinek-tytul" className="text-sm font-bold text-slate-800">
            Wycinek {nr + 1} z {kolejka.length}
            <span className="font-normal text-slate-600"> · {lokalizacja(odcinek, pilot)}</span>
          </h3>
          <WycinekObrazu
            key={wycinek.id}
            wycinek={wycinek}
            przebiegi={[odcinek.geometria]}
            obserwacje={[]}
            odrzucone={PUSTY_ZBIOR}
            ukryjModel
          />
        </section>

        <section aria-labelledby="ocena-tytul" className="flex flex-col gap-3">
          <h3 id="ocena-tytul" className="text-sm font-bold text-slate-800">
            Twoja ocena
          </h3>
          <div className="flex flex-col gap-2">
            {KLASY_OBRAZU.map((k) => (
              <button
                key={k.klasa}
                type="button"
                aria-pressed={obecna === k.klasa}
                onClick={() => void zapisz(k.klasa)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left ${
                  obecna === k.klasa ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <kbd className={`rounded border px-2 py-0.5 text-sm font-bold ${obecna === k.klasa ? "border-white" : "border-slate-400"}`}>
                  {k.klawisz}
                </kbd>
                <span>
                  <span className="block font-semibold">{k.etykieta}</span>
                  <span className={`block text-sm ${obecna === k.klasa ? "text-slate-200" : "text-slate-600"}`}>{k.definicja}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setNr((n) => Math.max(n - 1, 0))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              ← Poprzedni
            </button>
            <button
              type="button"
              onClick={() => setNr((n) => Math.min(n + 1, kolejka.length - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Pomiń (S) →
            </button>
            {obecna && (
              <button type="button" onClick={() => void zapisz(null)} className="rounded-lg px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
                Usuń etykietę
              </button>
            )}
          </div>
          <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-slate-700">
            Kto opisuje (opcjonalnie, do porównania zgodności między osobami)
            <input value={kto} onChange={(e) => setKto(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          {blad && (
            <p role="alert" className="text-sm text-rose-800">
              Nie zapisano: {blad}
            </p>
          )}
          <p className="text-xs text-slate-600">
            Etykiety zapisują się do pliku data/aglosat/etykiety-reczne.json (tylko w trybie deweloperskim). Po sesji wystarczy
            commit.
          </p>
        </section>
      </div>
    </div>
  );
}
