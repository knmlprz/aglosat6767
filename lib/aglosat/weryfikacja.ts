// Weryfikacja z terenu: człowiek potwierdza wartość cechy albo odrzuca wykrycie modelu.
// W prototypie weryfikacje żyją w pamięci strony; trwały zapis to krok po hackathonie.

import type { Cecha, Wartosc, Weryfikacja } from "./types.ts";

/** Wartości do wyboru w formularzu kontroli. Kolejność: najpierw spełniające typowy profil. */
export const WARIANTY: Record<Cecha, { wartosc: Wartosc; etykieta: string }[]> = {
  kraweznik: [
    { wartosc: "obnizony", etykieta: "obniżony" },
    { wartosc: "zrownany", etykieta: "zrównany" },
    { wartosc: "wysoki", etykieta: "wysoki" },
  ],
  nawierzchnia: [
    { wartosc: "paving_stones", etykieta: "kostka betonowa" },
    { wartosc: "asphalt", etykieta: "asfalt" },
    { wartosc: "sett", etykieta: "kostka granitowa" },
    { wartosc: "ground", etykieta: "nieutwardzona" },
  ],
  ciaglosc: [
    { wartosc: "ciagly", etykieta: "ciągły" },
    { wartosc: "przerwany", etykieta: "przerwany" },
  ],
  schody: [
    { wartosc: false, etykieta: "brak schodów" },
    { wartosc: true, etykieta: "są schody" },
  ],
  szerokosc: [
    { wartosc: 150, etykieta: "150 cm" },
    { wartosc: 100, etykieta: "100 cm" },
    { wartosc: 70, etykieta: "70 cm" },
  ],
  nachylenie: [
    { wartosc: 2, etykieta: "do 2%" },
    { wartosc: 5, etykieta: "około 5%" },
    { wartosc: 10, etykieta: "około 10%" },
  ],
};

export function dzisiaj(): string {
  return new Date().toISOString().slice(0, 10);
}

let licznik = 0;

/**
 * Jeden wpis z kontroli dla całego miejsca: po jednej weryfikacji na odcinek.
 * Identyfikatory mają wspólny prefiks wpisu, żeby dało się cofnąć wpis w całości.
 */
export function wpisKontroli(
  odcinki: string[],
  cecha: Cecha,
  wartosc: Wartosc,
  opcje: { notatka?: string; /** odcinek → odrzucona obserwacja modelu */ odrzuca?: Record<string, string> } = {},
): Weryfikacja[] {
  const wpis = `k${Date.now().toString(36)}${(licznik++).toString(36)}`;
  return odcinki.map((odcinekId) => ({
    id: `${wpis}:${odcinekId}`,
    odcinekId,
    cecha,
    wartosc,
    dataKontroli: dzisiaj(),
    ...(opcje.notatka ? { notatka: opcje.notatka } : {}),
    ...(opcje.odrzuca?.[odcinekId] ? { odrzucaObserwacje: opcje.odrzuca[odcinekId] } : {}),
    przykladowe: false,
  }));
}

export const idWpisu = (w: Weryfikacja) => w.id.split(":")[0];
