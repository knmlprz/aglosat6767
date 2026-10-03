// Ręczne etykiety wycinków: próbka referencyjna do oceny modelu wizyjnego.
// Ta sama instrukcja trafia do ludzi (strona /app/etykiety) i do modelu (prompt v2).

import type { KlasaObrazu } from "./types.ts";

/** Wersja instrukcji. Metryki liczymy tylko z etykiet zrobionych według bieżącej wersji. */
export const WERSJA_INSTRUKCJI = 2;

export const ZASADA =
  "Ciągłość to pytanie, czy wzdłuż linii biegnie jeden nieprzerwany pas, po którym da się przejść, bez stałej przeszkody. Rodzaj nawierzchni, krawężniki, schody, ruch samochodów i zaparkowane auta to osobne cechy: tej klasy nie oceniają.";

export const KLASY_OBRAZU: { klasa: KlasaObrazu; klawisz: string; etykieta: string; definicja: string }[] = [
  {
    klasa: "ciagly",
    klawisz: "1",
    etykieta: "ciągły",
    definicja: "Wzdłuż linii biegnie jeden nieprzerwany pas, po którym da się przejść: chodnik, asfaltowa droga, parking, ścieżka.",
  },
  {
    klasa: "przerwany",
    klawisz: "2",
    etykieta: "przerwany",
    definicja: "Na linii widać stałą przerwę: pas trawy między odcinkami, koniec chodnika, ogrodzenie, barierkę, rozkop.",
  },
  {
    klasa: "niewidoczny",
    klawisz: "3",
    etykieta: "niewidoczny",
    definicja: "Większości linii nie widać (drzewa, cień, dach, auta) albo nie da się rozstrzygnąć. To pełnoprawna odpowiedź.",
  },
];

/** Przypadki sporne: tabela uzgodniona w zespole, wspólna dla ludzi i modelu. */
export const PRZYPADKI: { przypadek: string; klasa: KlasaObrazu | "zalezy"; dlaczego: string }[] = [
  { przypadek: "Asfaltowa droga osiedlowa, ulica bez chodnika", klasa: "ciagly", dlaczego: "pas jest ciągły; ruch aut to inna cecha" },
  { przypadek: "Przejście dla pieszych przez jezdnię", klasa: "ciagly", dlaczego: "jezdnia łączy oba chodniki; krawężnik to osobna cecha" },
  { przypadek: "Przejście, ale na linii stoi ogrodzenie, barierka albo pas zieleni bez przerwy", klasa: "przerwany", dlaczego: "stała przeszkoda na linii" },
  { przypadek: "Parking, przez który biegnie linia", klasa: "ciagly", dlaczego: "utwardzony pas jest ciągły" },
  { przypadek: "Zaparkowane auta na linii", klasa: "zalezy", dlaczego: "ciągły; jeśli zasłaniają większość linii: niewidoczny. Auto to przeszkoda tymczasowa, nie przerwa" },
  { przypadek: "Schody", klasa: "ciagly", dlaczego: "schody to osobna cecha" },
  { przypadek: "Ścieżka gruntowa, wydeptana na całej długości", klasa: "ciagly", dlaczego: "rodzaj nawierzchni to osobna cecha" },
  { przypadek: "Dwa odcinki chodnika, a między nimi pas trawy", klasa: "przerwany", dlaczego: "trzeba zejść na trawnik" },
  { przypadek: "Chodnik kończy się w połowie linii", klasa: "przerwany", dlaczego: "" },
  { przypadek: "Część linii pod drzewami, widoczne fragmenty ciągłe", klasa: "zalezy", dlaczego: "ciągły, jeśli zasłonięta mniejsza część; niewidoczny, jeśli większa" },
  { przypadek: "Widać przerwę, choć część linii jest zasłonięta", klasa: "przerwany", dlaczego: "widoczna przerwa wystarczy" },
  { przypadek: "Linia przesunięta o kilka metrów od widocznej ścieżki (np. przechylony dach)", klasa: "zalezy", dlaczego: "oceniamy ścieżkę biegnącą obok równolegle; jeśli jej nie widać: niewidoczny" },
  { przypadek: "Zieleń: nie wiadomo, czy to trawnik, czy korony drzew nad chodnikiem", klasa: "niewidoczny", dlaczego: "„nie wiem” to pełnoprawna odpowiedź" },
];

export type EtykietaReczna = {
  klasa: KlasaObrazu;
  kiedy: string;
  wersjaInstrukcji: number;
};

/** Etykiety osobno dla każdej osoby: druga osoba nie nadpisuje pierwszej, a zgodność między ludźmi da się policzyć. */
export type PlikEtykiet = {
  opis: string;
  wersjaFormatu: 2;
  osoby: Record<string, Record<string, EtykietaReczna>>;
};

export const PUSTY_PLIK_ETYKIET: PlikEtykiet = {
  opis: "Ręczne etykiety wycinków ortofotomapy (próbka referencyjna). osoby → identyfikator wycinka → etykieta.",
  wersjaFormatu: 2,
  osoby: {},
};

/** Odczyt pliku z przeniesieniem starego formatu (jedna osoba, bez wersji instrukcji = v1). */
export function wczytajEtykiety(surowe: unknown): PlikEtykiet {
  const p = surowe as Partial<PlikEtykiet> & { etykiety?: Record<string, { klasa: KlasaObrazu; kiedy: string; kto?: string }> };
  if (p?.wersjaFormatu === 2 && p.osoby) return p as PlikEtykiet;
  const wynik: PlikEtykiet = structuredClone(PUSTY_PLIK_ETYKIET);
  for (const [id, e] of Object.entries(p?.etykiety ?? {})) {
    const kto = e.kto || "bez imienia";
    (wynik.osoby[kto] ??= {})[id] = { klasa: e.klasa, kiedy: e.kiedy, wersjaInstrukcji: 1 };
  }
  return wynik;
}

/** Pary człowiek–model z etykiet bieżącej wersji instrukcji (każda osoba osobno). */
export function paryDoOceny(
  plik: PlikEtykiet,
  model: (wycinekId: string) => KlasaObrazu | undefined,
  wersja = WERSJA_INSTRUKCJI,
): { kto: string; wycinekId: string; czlowiek: KlasaObrazu; model: KlasaObrazu }[] {
  const pary = [];
  for (const [kto, etykiety] of Object.entries(plik.osoby)) {
    for (const [wycinekId, e] of Object.entries(etykiety)) {
      const m = model(wycinekId);
      if (e.wersjaInstrukcji === wersja && m) pary.push({ kto, wycinekId, czlowiek: e.klasa, model: m });
    }
  }
  return pary;
}

/** Zgodność między ludźmi: odsetek wycinków opisanych przez co najmniej dwie osoby, gdzie wszystkie się zgadzają. */
export function zgodnoscLudzi(plik: PlikEtykiet, wersja = WERSJA_INSTRUKCJI): { n: number; zgodnosc: number | null } {
  const wgWycinka = new Map<string, KlasaObrazu[]>();
  for (const etykiety of Object.values(plik.osoby)) {
    for (const [id, e] of Object.entries(etykiety)) {
      if (e.wersjaInstrukcji === wersja) wgWycinka.set(id, [...(wgWycinka.get(id) ?? []), e.klasa]);
    }
  }
  const wspolne = [...wgWycinka.values()].filter((k) => k.length >= 2);
  const zgodne = wspolne.filter((k) => k.every((x) => x === k[0])).length;
  return { n: wspolne.length, zgodnosc: wspolne.length ? Math.round((1000 * zgodne) / wspolne.length) / 1000 : null };
}
