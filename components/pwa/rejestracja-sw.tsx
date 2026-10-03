"use client";

// Rejestracja service workera tylko w wersji produkcyjnej: w trybie dev zapisane paczki Next.js
// rozminęłyby się z odświeżaniem na gorąco. Instalowalność sprawdza się na `npm run build && npm start`.

import { useEffect } from "react";

export function RejestracjaSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((e: unknown) => console.warn("AgloSat: nie udało się zarejestrować service workera", e));
  }, []);
  return null;
}
