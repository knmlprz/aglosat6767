"use client";

// Tryb demo: przejście przez scenariusz prezentacji krok po kroku.
// Każdy krok opisuje pełny stan (widok, wybór, kontrole), więc można iść w przód, w tył i od nowa.
// Kroki zmieniające tylko kontrole nie montują widoku od nowa: przeliczenie widać na żywo.

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Pilot, Weryfikacja, Zgloszenie } from "@/lib/aglosat/types.ts";
import { dzisiaj, wpisKontroli } from "@/lib/aglosat/weryfikacja.ts";
import { useAglosat, type ZadanieDemo } from "@/components/aglosat/stan-aglosat";

type Kontrole = "brak" | "obnizony" | "wysoki" | "obnizony_odrzucenie";
type StanDemoZgloszen = "brak" | "oczekuje" | "przyjete";

type Krok = {
  tytul: string;
  mowimy: string;
  widok: "/app/planista" | "/app/mieszkaniec";
  wybierz: "miejsce1" | "sprzeczne" | null;
  zakladka?: "ranking" | "kontrola" | "zgloszenia";
  pokazKontrole?: boolean;
  kontrole: Kontrole;
  zgloszenia?: StanDemoZgloszen;
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
  zgloszenie: {
    tytul: "Mieszkaniec zgłasza, jak tu jest",
    mowimy:
      "Przy przejściu bez krawężnika w danych: „obniżony”. Zgłoszenie czeka na urząd — trasa się jeszcze nie zmienia.",
    widok: "/app/mieszkaniec",
    wybierz: null,
    kontrole: "brak",
    zgloszenia: "oczekuje",
  },
  decyzja: {
    tytul: "Urząd ogląda zdjęcie i decyduje",
    mowimy:
      "Kolejka zgłoszeń: miejsce, deklarowana wartość, komentarz. Przyjęcie liczy zgłoszenie jak źródło i od razu przelicza trasy.",
    widok: "/app/planista",
    wybierz: null,
    zakladka: "zgloszenia",
    kontrole: "brak",
    zgloszenia: "oczekuje",
  },
  przyjete: {
    tytul: "Po decyzji trasa jest udokumentowana",
    mowimy:
      "Urząd przyjął zgłoszenie. U mieszkańca ta sama relacja: 562 metry, źródło „zgłoszenie przyjęte przez urząd”, nie kontrola w terenie.",
    widok: "/app/mieszkaniec",
    wybierz: null,
    kontrole: "brak",
    zgloszenia: "przyjete",
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
    mowimy:
      "OpenStreetMap: chodnik ciągły. Model wizyjny: przerwa, ocena 0,85. Nie wybieramy za użytkownika: pokazujemy oba źródła z datami.",
    widok: "/app/planista",
    wybierz: "sprzeczne",
    kontrole: "obnizony",
  },
  odrzucenie: {
    tytul: "Błąd modelu, pokazany celowo",
    mowimy:
      "W terenie chodnik jest. Na ortofotomapie zasłania go przechylony dach budynku. Model nie podejmuje decyzji, wskazuje, gdzie spojrzeć.",
    widok: "/app/planista",
    wybierz: "sprzeczne",
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

/** Jeden scenariusz: od pytania mieszkańca, przez zgłoszenie i decyzję urzędu, do kontroli w terenie. */
export const KROKI: Krok[] = [
  K.mieszkaniec,
  K.brakInformacji,
  K.zgloszenie,
  K.decyzja,
  K.przyjete,
  K.miejsce1,
  K.dowod,
  K.kontrola,
  K.mieszkaniecPo,
  K.sprzeczne,
  K.odrzucenie,
  K.wysoki,
];

/** Odcinek ze sprzecznymi źródłami do demo: wykrycie przerwy z najwyższą oceną. */
function odcinekSprzeczny(pilot: Pilot) {
  return [...pilot.obserwacje].filter((o) => o.klasa === "przerwany").sort((a, b) => b.ocena - a.ocena)[0];
}

function zgloszeniaKroku(stan: StanDemoZgloszen, pilot: Pilot): Zgloszenie[] {
  const odcinekId = pilot.ranking[0]?.odcinekId;
  if (!odcinekId || stan === "brak") return [];
  const z: Zgloszenie = {
    id: "demo-zgloszenie",
    odcinekId,
    cecha: "kraweznik",
    wartosc: "obnizony",
    zdjecie: null,
    opis: "krawężnik obniżony po obu stronach (zgłoszenie demo)",
    dataZgloszenia: dzisiaj(),
    stan: stan === "przyjete" ? "przyjete" : "oczekuje",
  };
  if (stan === "przyjete") z.uzasadnienie = "opis zgadza się z miejscem; przyjęte jako źródło";
  return [z];
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
      notatka: "chodnik jest; na ortofotomapie zasłania go przechylony dach budynku",
      odrzuca: { [obs.odcinekId]: obs.id },
    }),
  ];
}

export function TrybDemo() {
  const { wczytanie, ustawKontrole, ustawZgloszenia, ustawZadanie } = useAglosat();
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
      const wybierz = k.wybierz === "miejsce1" ? pilot.ranking[0]?.odcinekId : k.wybierz === "sprzeczne" ? odcinekSprzeczny(pilot).odcinekId : null;
      const zadanie: ZadanieDemo = { wybierz: wybierz ?? null, zakladka: k.zakladka ?? "ranking", pokazKontrole: !!k.pokazKontrole };
      const tenSamWidok =
        !!przed &&
        przed.widok === k.widok &&
        przed.wybierz === k.wybierz &&
        (przed.zakladka ?? "ranking") === (k.zakladka ?? "ranking") &&
        !!przed.pokazKontrole === !!k.pokazKontrole;
      ustawKontrole(kontroleKroku(k.kontrole, pilot));
      ustawZgloszenia(zgloszeniaKroku(k.zgloszenia ?? "brak", pilot));
      ustawZadanie(zadanie, !tenSamWidok);
      if (sciezka !== k.widok) router.push(k.widok);
      setPoprzedni(k);
    },
    [pilot, ustawKontrole, ustawZgloszenia, ustawZadanie, router, sciezka],
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
          <p className="text-sm text-slate-300">{krok.mowimy}</p>
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
              ustawZgloszenia([]);
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
