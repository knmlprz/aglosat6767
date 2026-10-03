"use client";

// Wspólny stan widoków AgloSat: dane pilota, kontrole z tej sesji i tryb demo.
// Kontrola wpisana u planisty od razu zmienia trasy mieszkańca (ten sam graf, te same weryfikacje).

import { Fragment, createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { StanZgloszenia, Weryfikacja, Zgloszenie } from "@/lib/aglosat/types.ts";
import { usePilot, type StanWczytania } from "@/lib/aglosat/use-pilot.ts";
import { idWpisu } from "@/lib/aglosat/weryfikacja.ts";
import { rozpatrzone } from "@/lib/aglosat/zgloszenia.ts";

/** Ta sama karta: zgłoszenie złożone u mieszkańca ma dotrzeć do urzędu, nawet po pełnym wejściu w URL. */
const KLUCZ_ZGLOSZEN = "aglosat:zgloszenia";
const PUSTE_ZGLOSZENIA: Zgloszenie[] = [];
let cacheZgloszen: Zgloszenie[] = PUSTE_ZGLOSZENIA;
let cacheWczytany = false;
const sluchaczeZgloszen = new Set<() => void>();

function odczytZgloszen(): Zgloszenie[] {
  if (typeof sessionStorage === "undefined") return PUSTE_ZGLOSZENIA;
  if (!cacheWczytany) {
    try {
      const surowe = sessionStorage.getItem(KLUCZ_ZGLOSZEN);
      cacheZgloszen = surowe ? (JSON.parse(surowe) as Zgloszenie[]) : PUSTE_ZGLOSZENIA;
    } catch {
      cacheZgloszen = PUSTE_ZGLOSZENIA;
    }
    cacheWczytany = true;
  }
  return cacheZgloszen;
}

function zapiszZgloszenia(z: Zgloszenie[]) {
  cacheZgloszen = z;
  cacheWczytany = true;
  try {
    if (z.length === 0) sessionStorage.removeItem(KLUCZ_ZGLOSZEN);
    else sessionStorage.setItem(KLUCZ_ZGLOSZEN, JSON.stringify(z));
  } catch {
    // Limit sesji (duże zdjęcia): zostają w pamięci tej karty.
  }
  sluchaczeZgloszen.forEach((s) => s());
}

const subskrybujZgloszenia = (cb: () => void) => {
  sluchaczeZgloszen.add(cb);
  return () => sluchaczeZgloszen.delete(cb);
};

/**
 * Stan początkowy widoków narzucony przez tryb demo. Widoki czytają go przy montowaniu;
 * zmiana widoku lub wyboru w demo montuje je od nowa (klucz), zmiana samych kontroli nie.
 */
export type ZadanieDemo = {
  wybierz: string | null;
  zakladka: "ranking" | "kontrola";
  pokazKontrole: boolean;
};

type StanAglosat = {
  wczytanie: StanWczytania;
  weryfikacje: Weryfikacja[];
  dodajKontrole: (w: Weryfikacja[]) => void;
  cofnijKontrole: (idWpisu: string) => void;
  przywroc: () => void;
  ustawKontrole: (w: Weryfikacja[]) => void;
  /** Zgłoszenia mieszkańców z tej sesji; widok planisty je rozpatruje. */
  zgloszenia: Zgloszenie[];
  dodajZgloszenia: (z: Zgloszenie[]) => void;
  rozpatrzZgloszenie: (id: string, stan: StanZgloszenia, uzasadnienie?: string) => void;
  zadanie: ZadanieDemo | null;
  ustawZadanie: (z: ZadanieDemo | null, przemontuj: boolean) => void;
  klucz: number;
};

const Kontekst = createContext<StanAglosat | null>(null);

export function AglosatProvider({ children }: { children: React.ReactNode }) {
  const wczytanie = usePilot();
  const [weryfikacje, setWeryfikacje] = useState<Weryfikacja[]>([]);
  const zgloszenia = useSyncExternalStore(subskrybujZgloszenia, odczytZgloszen, () => PUSTE_ZGLOSZENIA);
  const [zadanie, setZadanie] = useState<ZadanieDemo | null>(null);
  const [klucz, setKlucz] = useState(0);
  const dodajKontrole = useCallback((w: Weryfikacja[]) => setWeryfikacje((prev) => [...prev, ...w]), []);
  const cofnijKontrole = useCallback(
    (id: string) => setWeryfikacje((prev) => prev.filter((w) => idWpisu(w) !== id)),
    [],
  );
  const dodajZgloszenia = useCallback((z: Zgloszenie[]) => zapiszZgloszenia([...z, ...odczytZgloszen()]), []);
  const rozpatrzZgloszenie = useCallback(
    (id: string, stan: StanZgloszenia, uzasadnienie?: string) =>
      zapiszZgloszenia(odczytZgloszen().map((z) => (z.id === id ? rozpatrzone(z, stan, uzasadnienie) : z))),
    [],
  );
  const przywroc = useCallback(() => {
    setWeryfikacje([]);
    zapiszZgloszenia([]);
  }, []);
  const ustawZadanie = useCallback((z: ZadanieDemo | null, przemontuj: boolean) => {
    setZadanie(z);
    if (przemontuj) setKlucz((k) => k + 1);
  }, []);
  const wartosc = useMemo(
    () => ({
      wczytanie,
      weryfikacje,
      dodajKontrole,
      cofnijKontrole,
      przywroc,
      ustawKontrole: setWeryfikacje,
      zgloszenia,
      dodajZgloszenia,
      rozpatrzZgloszenie,
      zadanie,
      ustawZadanie,
      klucz,
    }),
    [
      wczytanie,
      weryfikacje,
      dodajKontrole,
      cofnijKontrole,
      przywroc,
      zgloszenia,
      dodajZgloszenia,
      rozpatrzZgloszenie,
      zadanie,
      ustawZadanie,
      klucz,
    ],
  );
  return <Kontekst.Provider value={wartosc}>{children}</Kontekst.Provider>;
}

/** Montuje widoki od nowa, gdy tryb demo przechodzi do kroku z innym widokiem lub wyborem. */
export function KluczDemo({ children }: { children: React.ReactNode }) {
  const { klucz } = useAglosat();
  return <Fragment key={klucz}>{children}</Fragment>;
}

export function useAglosat(): StanAglosat {
  const s = useContext(Kontekst);
  if (!s) throw new Error("useAglosat poza AglosatProvider");
  return s;
}
