"use client";

// Wspólny stan widoków AgloSat: dane pilota, kontrole z tej sesji i tryb demo.
// Kontrola wpisana u planisty od razu zmienia trasy mieszkańca (ten sam graf, te same weryfikacje).

import { Fragment, createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Weryfikacja } from "@/lib/aglosat/types.ts";
import { usePilot, type StanWczytania } from "@/lib/aglosat/use-pilot.ts";
import { idWpisu } from "@/lib/aglosat/weryfikacja.ts";

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
  zadanie: ZadanieDemo | null;
  ustawZadanie: (z: ZadanieDemo | null, przemontuj: boolean) => void;
  klucz: number;
};

const Kontekst = createContext<StanAglosat | null>(null);

export function AglosatProvider({ children }: { children: React.ReactNode }) {
  const wczytanie = usePilot();
  const [weryfikacje, setWeryfikacje] = useState<Weryfikacja[]>([]);
  const [zadanie, setZadanie] = useState<ZadanieDemo | null>(null);
  const [klucz, setKlucz] = useState(0);
  const dodajKontrole = useCallback((w: Weryfikacja[]) => setWeryfikacje((prev) => [...prev, ...w]), []);
  const cofnijKontrole = useCallback(
    (id: string) => setWeryfikacje((prev) => prev.filter((w) => idWpisu(w) !== id)),
    [],
  );
  const przywroc = useCallback(() => setWeryfikacje([]), []);
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
      zadanie,
      ustawZadanie,
      klucz,
    }),
    [wczytanie, weryfikacje, dodajKontrole, cofnijKontrole, przywroc, zadanie, ustawZadanie, klucz],
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
