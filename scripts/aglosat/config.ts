// Obszar pilota. Nowe miasto albo obszar = nowa konfiguracja tutaj.
// bbox: [południe, zachód, północ, wschód]

export const OBSZAR = {
  nazwa: "Nowa Huta: osiedla Wandy, Młodości, Na Skarpie",
  bboxPobrania: [50.062, 20.038, 50.0745, 20.057] as [number, number, number, number],
  /** Graf budujemy w nieco mniejszym obszarze, żeby uniknąć uciętych linii na brzegach. */
  bboxGrafu: [50.0628, 20.0392, 50.0738, 20.0555] as [number, number, number, number],
  srodek: [50.0685, 20.0475] as [number, number],
};

/**
 * Ortofotomapa do wycinków: usługa WMS Geoportalu (GUGiK), otwarte dane.
 * Data i piksel z skorowidza GUGiK (WFS Skorowidze, warstwa SkorowidzOrtofomapy2025) dla arkusza
 * obejmującego pilota. Zakładamy, że usługa HighResolution pokazuje najnowszy arkusz.
 */
export const ORTO = {
  wms: "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution",
  warstwa: "Raster",
  dataNalotu: "2025-04-28",
  pikselM: 0.05,
  arkusz: "M-34-65-C-c-1-2",
  zrodlo: "Ortofotomapa GUGiK (Geoportal), piksel 5 cm",
  rozmiarPx: 480,
};

/**
 * Parametry danych przykładowych. Ziarno losowania stałe, żeby wynik był powtarzalny.
 * Klasy modelu są przykładowe; obraz i jego data pochodzą z prawdziwej ortofotomapy.
 */
export const PRZYKLADOWE = {
  ziarno: 6767,
  dataObrazu: ORTO.dataNalotu,
  zrodloObrazu: ORTO.zrodlo,
  scenaPrzed: "2025-08-10",
  scenaPo: "2026-09-14",
};

/**
 * Model, którego wyniki trafiają do danych pilota (plik w data/aglosat/klasyfikacje/).
 * Porównujemy tylko wersje promptu tego samego modelu; bez wpisu: model z najnowszego kompletnego pliku.
 * wersjaPromptu przypina wersję użytą w danych; bez niej: najwyższa kompletna.
 */
export const KLASYFIKACJA: { dostawca: string; model: string; wersjaPromptu?: number } | null = {
  dostawca: "openrouter",
  model: "anthropic/claude-sonnet-5.5",
  // v3 nie wskazuje przerw, więc demo straciłoby przypadek sprzeczny; do decyzji zostajemy przy v2.
  wersjaPromptu: 2,
};
