"use client";

// Etykietowanie próbki referencyjnej: człowiek ocenia wycinek bez wiedzy o odpowiedzi modelu,
// według tej samej instrukcji, którą dostaje model (prompt v2).
// Klawisze: 1, 2, 3 przypisują klasę i przechodzą dalej; ← → nawigacja; S pomija; Backspace usuwa etykietę.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAglosat } from "@/components/aglosat/stan-aglosat";
import { WycinekObrazu } from "@/components/aglosat/wycinek-obrazu";
import { OcenaModeluKarta } from "@/components/aglosat/ocena-modelu";
import { policzOcene } from "@/lib/aglosat/metryki.ts";
import {
  KLASY_OBRAZU,
  PRZYPADKI,
  WERSJA_INSTRUKCJI,
  ZASADA,
  paryDoOceny,
  zgodnoscLudzi,
  type PlikEtykiet,
} from "@/lib/aglosat/etykiety.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import { formatujWartosc } from "@/lib/aglosat/vocabulary.ts";
import type { KlasaObrazu, Wycinek } from "@/lib/aglosat/types.ts";

const PUSTY_ZBIOR = new Set<string>();
const CEL = 40;
/** Poniżej tylu sekund na wycinek ocena jest raczej zgadywaniem. */
const ZA_SZYBKO_S = 4;

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
  const [plik, setPlik] = useState<PlikEtykiet | null>(null);
  const [nr, setNr] = useState(0);
  const [kto, setKto] = useState("");
  const [blad, setBlad] = useState<string | null>(null);
  const [czasy, setCzasy] = useState<number[]>([]);
  const ostatniZapis = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/etykiety")
      .then((r) => r.json() as Promise<PlikEtykiet>)
      .then(setPlik)
      .catch((e: unknown) => setBlad(String(e)));
  }, []);

  const osoba = kto.trim();
  const kolejka = useMemo(() => (pilot ? wymieszaj(pilot.wycinki) : []), [pilot]);
  // Model widział przebieg całego miejsca (np. przejście z wysepką), więc człowiek też.
  const miejsca = useMemo(() => new Map(pilot?.ranking.map((r) => [r.odcinekId, r.odcinki]) ?? []), [pilot]);
  const moje = useMemo(() => {
    const e = (osoba && plik?.osoby[osoba]) || {};
    return Object.fromEntries(Object.entries(e).filter(([, x]) => x.wersjaInstrukcji === WERSJA_INSTRUKCJI));
  }, [plik, osoba]);

  // Porównanie z modelem na żywo, tylko zbiorczo (pojedyncze odpowiedzi modelu zostają ukryte).
  const ocenaNaZywo = useMemo(() => {
    const zModelu = pilot?.obserwacje.filter((o) => !o.przykladowe && o.model) ?? [];
    if (!pilot || !plik || zModelu.length === 0) return null;
    const wgWycinka = new Map(zModelu.map((o) => [`w_${o.odcinekId}`, o.klasa]));
    return policzOcene(zModelu[0].model!, paryDoOceny(plik, (id) => wgWycinka.get(id)));
  }, [pilot, plik]);
  const ludzie = useMemo(() => (plik ? zgodnoscLudzi(plik) : null), [plik]);

  const wycinek = kolejka[nr];
  const opisane = kolejka.filter((w) => moje[w.id]).length;
  const sredniCzas = czasy.length >= 5 ? czasy.slice(-5).reduce((s, x) => s + x, 0) / 5 : null;

  const zapisz = useCallback(
    async (klasa: KlasaObrazu | null) => {
      if (!wycinek) return;
      if (!osoba) {
        setBlad("Najpierw wpisz, kto opisuje.");
        return;
      }
      const res = await fetch("/api/etykiety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wycinekId: wycinek.id, klasa, kto: osoba }),
      });
      if (!res.ok) {
        setBlad(((await res.json()) as { blad?: string }).blad ?? `HTTP ${res.status}`);
        return;
      }
      setBlad(null);
      const teraz = Date.now();
      setPlik((prev) => {
        const nowy = structuredClone(prev!);
        const e = (nowy.osoby[osoba] ??= {});
        if (klasa) e[wycinek.id] = { klasa, kiedy: new Date(teraz).toISOString(), wersjaInstrukcji: WERSJA_INSTRUKCJI };
        else delete e[wycinek.id];
        return nowy;
      });
      if (klasa) {
        if (ostatniZapis.current !== null) setCzasy((prev) => [...prev, (teraz - ostatniZapis.current!) / 1000]);
        ostatniZapis.current = teraz;
        setNr((n) => Math.min(n + 1, kolejka.length - 1));
      }
    },
    [wycinek, osoba, kolejka.length],
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

  if (!pilot || !plik) {
    return blad ? (
      <p role="alert" className="mx-4 text-sm text-rose-800 lg:mx-6">
        Nie udało się wczytać etykiet: {blad}
      </p>
    ) : (
      <div className="mx-4 h-40 animate-pulse rounded-xl bg-slate-100 lg:mx-6" aria-busy="true" />
    );
  }

  const odcinek = pilot.odcinki.find((o) => o.id === wycinek.odcinekId)!;
  const przebiegi = (miejsca.get(wycinek.odcinekId) ?? [wycinek.odcinekId]).map((id) => pilot.odcinki.find((o) => o.id === id)!.geometria);
  const obecna = moje[wycinek.id]?.klasa;

  return (
    <div className="flex flex-col gap-6 px-4 pb-40 lg:px-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">Próbka referencyjna dla modelu</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Oceń, co widać na obrazie wzdłuż przerywanej linii, według instrukcji poniżej (wersja {WERSJA_INSTRUKCJI}, tę samą
          dostaje model). Odpowiedź modelu jest ukryta. Poświęć około 10 sekund na wycinek: liczba, którą z tego policzymy,
          trafi przed jury.
        </p>
        <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-slate-800">
          Kto opisuje (wymagane; każda osoba ma osobne etykiety)
          <input
            value={kto}
            onChange={(e) => setKto(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="np. Michał"
          />
        </label>
        {osoba && (
          <>
            <p className="text-sm font-semibold text-slate-800" aria-live="polite">
              {osoba}: opisane {opisane} z {kolejka.length} (cel: co najmniej {CEL})
            </p>
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <div className="h-full bg-slate-900" style={{ width: `${(100 * opisane) / kolejka.length}%` }} />
            </div>
          </>
        )}
        {sredniCzas !== null && sredniCzas < ZA_SZYBKO_S && (
          <p role="status" className="max-w-3xl rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            Ostatnie wycinki opisujesz średnio w {sredniCzas.toFixed(1).replace(".", ",")} s. To szybciej, niż da się obejrzeć całą
            linię; zwolnij, żeby wynik był wiarygodny.
          </p>
        )}
      </header>

      {ocenaNaZywo && ocenaNaZywo.n > 0 && (
        <details className="max-w-4xl">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Pokaż porównanie z modelem (zbiorczo; otwórz po zakończeniu opisywania)
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <OcenaModeluKarta ocena={ocenaNaZywo} naZywo />
            {ludzie && ludzie.n > 0 && (
              <p className="text-sm text-slate-700">
                Zgodność między ludźmi: {Math.round(100 * (ludzie.zgodnosc ?? 0))}% na {ludzie.n} wycinkach opisanych przez co najmniej
                dwie osoby.
              </p>
            )}
          </div>
        </details>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <section aria-labelledby="wycinek-tytul" className="flex flex-col gap-2">
          <h3 id="wycinek-tytul" className="text-sm font-bold text-slate-800">
            Wycinek {nr + 1} z {kolejka.length}
            <span className="font-normal text-slate-600"> · {lokalizacja(odcinek, pilot)}</span>
          </h3>
          <WycinekObrazu key={wycinek.id} wycinek={wycinek} przebiegi={przebiegi} obserwacje={[]} odrzucone={PUSTY_ZBIOR} ukryjModel />
        </section>

        <section aria-labelledby="ocena-tytul" className="flex flex-col gap-3">
          <h3 id="ocena-tytul" className="text-sm font-bold text-slate-800">
            Twoja ocena
          </h3>
          <p className="text-sm text-slate-700">{ZASADA}</p>
          <div className="flex flex-col gap-2">
            {KLASY_OBRAZU.map((k) => (
              <button
                key={k.klasa}
                type="button"
                aria-pressed={obecna === k.klasa}
                disabled={!osoba}
                onClick={() => void zapisz(k.klasa)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left disabled:opacity-50 ${
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
          {blad && (
            <p role="alert" className="text-sm text-rose-800">
              {blad}
            </p>
          )}

          <details open className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">Przypadki sporne (instrukcja v{WERSJA_INSTRUKCJI})</summary>
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr className="text-slate-600">
                  <th scope="col" className="py-1 pr-2 font-semibold">Przypadek</th>
                  <th scope="col" className="py-1 pr-2 font-semibold">Klasa</th>
                  <th scope="col" className="py-1 font-semibold">Dlaczego</th>
                </tr>
              </thead>
              <tbody>
                {PRZYPADKI.map((p) => (
                  <tr key={p.przypadek} className="border-t border-slate-200 align-top">
                    <td className="py-1 pr-2 text-slate-800">{p.przypadek}</td>
                    <td className="py-1 pr-2 font-semibold text-slate-900">
                      {p.klasa === "zalezy" ? "zależy" : formatujWartosc("ciaglosc", p.klasa)}
                    </td>
                    <td className="py-1 text-slate-700">{p.dlaczego}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <p className="text-xs text-slate-600">
            Etykiety zapisują się do pliku data/aglosat/etykiety-reczne.json (tylko w trybie deweloperskim). Po sesji wystarczy
            commit.
          </p>
        </section>
      </div>
    </div>
  );
}
