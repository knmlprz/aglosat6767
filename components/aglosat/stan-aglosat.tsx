"use client";

// Wspólny stan widoków AgloSat: dane pilota i kontrole z tej sesji.
// Kontrola wpisana u planisty od razu zmienia trasy mieszkańca (ten sam graf, te same weryfikacje).

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Weryfikacja } from "@/lib/aglosat/types.ts";
import { usePilot, type StanWczytania } from "@/lib/aglosat/use-pilot.ts";
import { idWpisu } from "@/lib/aglosat/weryfikacja.ts";

type StanAglosat = {
  wczytanie: StanWczytania;
  weryfikacje: Weryfikacja[];
  dodajKontrole: (w: Weryfikacja[]) => void;
  cofnijKontrole: (idWpisu: string) => void;
  przywroc: () => void;
};

const Kontekst = createContext<StanAglosat | null>(null);

export function AglosatProvider({ children }: { children: React.ReactNode }) {
  const wczytanie = usePilot();
  const [weryfikacje, setWeryfikacje] = useState<Weryfikacja[]>([]);
  const dodajKontrole = useCallback((w: Weryfikacja[]) => setWeryfikacje((prev) => [...prev, ...w]), []);
  const cofnijKontrole = useCallback(
    (id: string) => setWeryfikacje((prev) => prev.filter((w) => idWpisu(w) !== id)),
    [],
  );
  const przywroc = useCallback(() => setWeryfikacje([]), []);
  const wartosc = useMemo(
    () => ({ wczytanie, weryfikacje, dodajKontrole, cofnijKontrole, przywroc }),
    [wczytanie, weryfikacje, dodajKontrole, cofnijKontrole, przywroc],
  );
  return <Kontekst.Provider value={wartosc}>{children}</Kontekst.Provider>;
}

export function useAglosat(): StanAglosat {
  const s = useContext(Kontekst);
  if (!s) throw new Error("useAglosat poza AglosatProvider");
  return s;
}
