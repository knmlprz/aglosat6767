// Obszar pilota. Nowe miasto albo obszar = nowa konfiguracja tutaj.
// bbox: [południe, zachód, północ, wschód]

export const OBSZAR = {
  nazwa: "Nowa Huta: osiedla Wandy, Młodości, Na Skarpie",
  bboxPobrania: [50.062, 20.038, 50.0745, 20.057] as [number, number, number, number],
  /** Graf budujemy w nieco mniejszym obszarze, żeby uniknąć uciętych linii na brzegach. */
  bboxGrafu: [50.0628, 20.0392, 50.0738, 20.0555] as [number, number, number, number],
  srodek: [50.0685, 20.0475] as [number, number],
};

/** Parametry danych przykładowych. Ziarno losowania stałe, żeby wynik był powtarzalny. */
export const PRZYKLADOWE = {
  ziarno: 6767,
  dataObrazu: "2024-07-15",
  zrodloObrazu: "ortofotomapa (dane przykładowe)",
  scenaPrzed: "2025-08-10",
  scenaPo: "2026-09-14",
};
