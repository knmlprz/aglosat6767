"use client";

// Tryb demo: przejście przez scenariusz prezentacji krok po kroku.
// Każdy krok opisuje pełny stan (widok, wybór, kontrole), więc można iść w przód, w tył i od nowa.
// Kroki zmieniające tylko kontrole nie montują widoku od nowa: przeliczenie widać na żywo.

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Pilot, Weryfikacja } from "@/lib/aglosat/types.ts";
import { wpisKontroli } from "@/lib/aglosat/weryfikacja.ts";
import { useAglosat, type ZadanieDemo } from "@/components/aglosat/stan-aglosat";

type Kontrole = "brak" | "obnizony" | "wysoki" | "obnizony_odrzucenie";

type Krok = {
  tytul: string;
  /** Tekst albo funkcja danych pilota, gdy tekst zawiera liczby z analizy. */
  mowimy: string | ((pilot: Pilot) => string);
  widok: "/app/planista" | "/app/mieszkaniec";
  wybierz: "miejsce1" | "sprzeczne" | "sentinel" | null;
  zakladka?: "ranking" | "kontrola";
  pokazKontrole?: boolean;
  kontrole: Kontrole;
};

const K = {
  mieszkaniec: {
    tytul: "Mieszkaniec pyta: czy dojadę?",
    mowimy:
      "Osiedle Ogrodowe 10, przychodnia ProMed: 467 metrów pieszo. Preferencje: bez schodów, niski krawężnik. Nie pytamy o niepełnosprawność.",
    widok: "/app/mieszkaniec",
    wybierz: null,
    kontrole: "brak",
  },
  brakInformacji: {
    tytul: "Brakuje informacji o jednym miejscu",
    mowimy:
      "Trasy udokumentowanej nie ma. Nie mówimy „niedostępne”: brakuje informacji o jednym przejściu. Ten sam opis czyta czytnik ekranu.",
    widok: "/app/mieszkaniec",
    wybierz: null,
    kontrole: "brak",
  },
  miejsce1: {
    tytul: "To przejście jest pierwsze w rankingu",
    mowimy:
      "Od tego jednego przejścia zależą dojścia do 5 usług, w tym do przychodni z naszego przykładu. Ranking to analiza bazowa dla całego obszaru.",
    widok: "/app/planista",
    wybierz: "miejsce1",
    kontrole: "brak",
  },
  dowod: {
    tytul: "Dowód z obrazu",
    mowimy:
      "Ortofotomapa GUGiK z kwietnia 2025: przejście jest pod drzewami, krawężnika z góry nie widać. Obraz wskazuje miejsce, rozstrzyga człowiek w terenie.",
    widok: "/app/planista",
    wybierz: "miejsce1",
    kontrole: "brak",
  },
  kontrola: {
    tytul: "Kontrola w terenie zmienia trasę",
    mowimy:
      "Wynik kontroli: krawężnik obniżony. Status zmienia się na „potwierdzone”, mgła znika, trasa udokumentowana pojawia się od razu.",
    widok: "/app/planista",
    wybierz: "miejsce1",
    kontrole: "obnizony",
  },
  mieszkaniecPo: {
    tytul: "Mieszkaniec widzi zmianę",
    mowimy: "Ta sama kontrola u mieszkańca: trasa udokumentowana 562 metry, ze źródłem i datą kontroli.",
    widok: "/app/mieszkaniec",
    wybierz: null,
    kontrole: "obnizony",
  },
  sprzeczne: {
    tytul: "Przypadek sprzeczny",
    mowimy: (p) => {
      const o = odcinekSprzeczny(p);
      return `OpenStreetMap: ciąg pieszy jest. Model (${o?.model ?? "model wizyjny"}): przerwa, ocena ${o?.ocena.toFixed(2).replace(".", ",") ?? "?"}. Nie wybieramy za użytkownika: pokazujemy oba źródła z datami.`;
    },
    widok: "/app/planista",
    wybierz: "sprzeczne",
    kontrole: "obnizony",
  },
  odrzucenie: {
    tytul: "Błąd modelu, pokazany celowo",
    mowimy: (p) => {
      const wersje = p.porownaniePromptow ?? [];
      const proc = (x: number | null | undefined) => (x == null ? "?" : `${Math.round(100 * x)}%`);
      // Liczby ze zbioru testowego, jeśli są na nim etykiety; inaczej ze wszystkich wycinków.
      const zbior = wersje.some((w) => w.zbior === "testowy" && w.n > 0) ? "testowy" : "wszystkie";
      const v2 = wersje.find((w) => w.wersjaPromptu === 2 && w.zbior === zbior);
      const v3 = wersje.find((w) => w.wersjaPromptu === 3 && w.zbior === zbior);
      const liczby =
        v2 && v3
          ? ` Poprawiliśmy wejście (obraz bez linii i z linią): trafność na próbce z ${proc(v2.trafnosc)} do ${proc(v3.trafnosc)}; gdy model mówi „ciągły”, człowiek zgadza się w ${proc(v3.precyzjaCiagly)}.`
          : "";
      return `Na zdjęciu bez nakładki ścieżka przez trawnik jest. Modelowi zasłoniła ją nasza własna linia z OSM.${liczby} Model wskazuje, gdzie spojrzeć; decyduje człowiek.`;
    },
    widok: "/app/planista",
    wybierz: "sprzeczne",
    kontrole: "obnizony_odrzucenie",
  },
  sentinel: {
    tytul: "Teren się zmienia: Sentinel-2",
    mowimy: (p) => {
      const { strefa, obserwacja } = odcinekSentinel(p);
      const ubytek = strefa ? ` Tu: ubytek roślinności na ${strefa.opis.match(/ok\. (\d+) m²/)?.[1] ?? "?"} m² w obu parach scen rok do roku.` : "";
      const model = obserwacja ? " Na tym samym odcinku model, patrząc na starsze zdjęcie, zgłosił przerwę przy budowie." : "";
      return `Ortofotomapa jest z kwietnia 2025. Sentinel-2 nie zobaczy chodnika, ale wskaże, gdzie od tamtej pory coś się zmieniło.${ubytek}${model} Dwa niezależne źródła: dane mogą być nieaktualne, tu warto wysłać kontrolę.`;
    },
    widok: "/app/planista",
    wybierz: "sentinel",
    kontrole: "obnizony_odrzucenie",
  },
  wysoki: {
    tytul: "A gdyby krawężnik był wysoki?",
    mowimy:
      "Ta sama kontrola z innym wynikiem: dla wózka nie ma żadnej trasy. Sprawdzenie poprawia wiedzę; dopiero usunięcie bariery poprawia dostępność.",
    widok: "/app/planista",
    wybierz: "miejsce1",
    kontrole: "wysoki",
  },
} satisfies Record<string, Krok>;

/** Jeden scenariusz: od pytania mieszkańca, przez dowód z obrazu, do kontroli, która zmienia trasę. */
export const KROKI: Krok[] = [
  K.mieszkaniec,
  K.brakInformacji,
  K.miejsce1,
  K.dowod,
  K.kontrola,
  K.mieszkaniecPo,
  K.sprzeczne,
  K.odrzucenie,
  K.sentinel,
  K.wysoki,
];

/** Odcinek ze sprzecznymi źródłami do demo: wykrycie przerwy z najwyższą oceną. */
function odcinekSprzeczny(pilot: Pilot) {
  return [...pilot.obserwacje].filter((o) => o.klasa === "przerwany").sort((a, b) => b.ocena - a.ocena)[0];
}

/** Odcinek w strefie zmian Sentinel-2; najpierw taki, na którym model też zgłosił przerwę. */
function odcinekSentinel(pilot: Pilot) {
  const wStrefie = pilot.odcinki.filter((o) => o.strefaZmian);
  const obserwacja = pilot.obserwacje.find((o) => o.klasa === "przerwany" && wStrefie.some((x) => x.id === o.odcinekId));
  const odcinek = wStrefie.find((o) => o.id === obserwacja?.odcinekId) ?? wStrefie[0];
  const strefa = pilot.strefyZmian.find((s) => s.id === odcinek?.strefaZmian && !s.ilustracja);
  return { odcinekId: odcinek?.id ?? null, strefa, obserwacja };
}

function kontroleKroku(k: Kontrole, pilot: Pilot): Weryfikacja[] {
  const miejsce = pilot.ranking[0]?.odcinki ?? [];
  const krawedz = (w: string) => wpisKontroli(miejsce, "kraweznik", w, { notatka: "kontrola w terenie (demo)" });
  if (k === "brak") return [];
  if (k === "obnizony") return krawedz("obnizony");
  if (k === "wysoki") return krawedz("wysoki");
  const obs = odcinekSprzeczny(pilot);
  return [
    ...krawedz("obnizony"),
    ...wpisKontroli([obs.odcinekId], "ciaglosc", "ciagly", {
      notatka: "ścieżka jest; na obrazie dla modelu zasłoniła ją nasza linia z OSM",
      odrzuca: { [obs.odcinekId]: obs.id },
    }),
  ];
}

export function TrybDemo() {
  const { wczytanie, ustawKontrole, ustawZadanie } = useAglosat();
  const pilot = wczytanie.stan === "gotowe" ? wczytanie.pilot : null;
  const router = useRouter();
  const sciezka = usePathname();
  const [aktywny, setAktywny] = useState(false);
  const [nr, setNr] = useState(0);
  const [poprzedni, setPoprzedni] = useState<Krok | null>(null);
  const krok = KROKI[nr];

  const zastosuj = useCallback(
    (k: Krok, przed: Krok | null) => {
      if (!pilot) return;
      const wybierz = k.wybierz === "miejsce1" ? pilot.ranking[0]?.odcinekId : k.wybierz === "sprzeczne" ? odcinekSprzeczny(pilot).odcinekId : k.wybierz === "sentinel" ? odcinekSentinel(pilot).odcinekId : null;
      const zadanie: ZadanieDemo = { wybierz: wybierz ?? null, zakladka: k.zakladka ?? "ranking", pokazKontrole: !!k.pokazKontrole };
      const tenSamWidok =
        !!przed &&
        przed.widok === k.widok &&
        przed.wybierz === k.wybierz &&
        (przed.zakladka ?? "ranking") === (k.zakladka ?? "ranking") &&
        !!przed.pokazKontrole === !!k.pokazKontrole;
      ustawKontrole(kontroleKroku(k.kontrole, pilot));
      ustawZadanie(zadanie, !tenSamWidok);
      if (sciezka !== k.widok) router.push(k.widok);
      setPoprzedni(k);
    },
    [pilot, ustawKontrole, ustawZadanie, router, sciezka],
  );

  const idz = useCallback(
    (nowy: number) => {
      const n = Math.max(0, Math.min(KROKI.length - 1, nowy));
      setNr(n);
      zastosuj(KROKI[n], poprzedni);
    },
    [zastosuj, poprzedni],
  );

  // Strzałki przełączają kroki, gdy fokus nie jest w polu formularza.
  useEffect(() => {
    if (!aktywny) return;
    const naKlawisz = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") idz(nr + 1);
      if (e.key === "ArrowLeft") idz(nr - 1);
    };
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [aktywny, idz, nr]);

  if (!pilot) return null;

  if (!aktywny) {
    return (
      <button
        type="button"
        onClick={() => {
          setAktywny(true);
          setNr(0);
          zastosuj(KROKI[0], null);
        }}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
      >
        Tryb demo
      </button>
    );
  }

  return (
    <section
      aria-label="Tryb demo"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-900/95 text-white shadow-2xl backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            krok {nr + 1} z {KROKI.length}
          </p>
          <p className="font-bold">{krok.tytul}</p>
          <p className="text-sm text-slate-300">{typeof krok.mowimy === "function" ? krok.mowimy(pilot) : krok.mowimy}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => idz(nr - 1)}
            disabled={nr === 0}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Wstecz
          </button>
          <button
            type="button"
            onClick={() => idz(nr + 1)}
            disabled={nr === KROKI.length - 1}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
          >
            Dalej →
          </button>
          <button
            type="button"
            onClick={() => {
              setNr(0);
              zastosuj(KROKI[0], null);
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
          >
            Od początku
          </button>
          <button
            type="button"
            onClick={() => {
              setAktywny(false);
              ustawKontrole([]);
              ustawZadanie(null, true);
              setPoprzedni(null);
            }}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:text-white"
            aria-label="Zamknij tryb demo"
          >
            ✕
          </button>
        </div>
      </div>
    </section>
  );
}
