"use client";

// Wczytuje dane pilota z public/aglosat/pilot.json (plik statyczny, działa bez API).

import { useEffect, useState } from "react";
import type { Pilot } from "./types.ts";
import { rozwinPilot, type PilotZapisany } from "./data.ts";

export const PILOT_URL = "/aglosat/pilot.json";

export type StanWczytania =
  | { stan: "wczytywanie" }
  | { stan: "blad"; komunikat: string }
  | { stan: "gotowe"; pilot: Pilot };

export function usePilot(): StanWczytania {
  const [wynik, setWynik] = useState<StanWczytania>({ stan: "wczytywanie" });
  useEffect(() => {
    let aktywny = true;
    fetch(PILOT_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PilotZapisany>;
      })
      .then((z) => aktywny && setWynik({ stan: "gotowe", pilot: rozwinPilot(z) }))
      .catch((e: unknown) => aktywny && setWynik({ stan: "blad", komunikat: String(e) }));
    return () => {
      aktywny = false;
    };
  }, []);
  return wynik;
}
