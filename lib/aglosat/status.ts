// Rozstrzyganie statusu cechy z dowodów. To jedyne miejsce, w którym powstaje status,
// więc tu pilnujemy reguł: brak dowodu = „nieznane”, różne wartości = „sprzeczne”.

import type { Cecha, Dowod, Obserwacja, Odcinek, StanCechy, Weryfikacja, Zgloszenie } from "./types.ts";

export const CECHY: Cecha[] = ["ciaglosc", "schody", "nawierzchnia", "kraweznik", "szerokosc", "nachylenie"];

/** Klasa modelu „niewidoczny” jest pełnoprawnym wynikiem, ale nie niesie wartości cechy. */
function niesieWartosc(d: Dowod): boolean {
  return !(d.zrodlo === "model" && d.wartosc === "niewidoczny");
}

export function rozstrzygnijCeche(cecha: Cecha, dowody: Dowod[]): StanCechy {
  const teren = dowody.filter((d) => d.zrodlo === "teren");
  if (teren.length > 0) {
    const najnowszy = [...teren].sort((x, y) => y.data.localeCompare(x.data))[0];
    return { cecha, status: "potwierdzone", wartosc: najnowszy.wartosc, dowody };
  }

  // Zgłoszenie przyjęte przez urząd: człowiek obejrzał zdjęcie i wziął je na siebie.
  // Stoi niżej niż kontrola w terenie, wyżej niż wszystko, czego nikt nie oglądał.
  const przyjete = dowody.filter((d) => d.przyjete);
  if (przyjete.length > 0) {
    const najnowszy = [...przyjete].sort((x, y) => y.data.localeCompare(x.data))[0];
    return { cecha, status: "przyjete_zgloszenie", wartosc: najnowszy.wartosc, dowody };
  }

  const zWartoscia = dowody.filter(niesieWartosc);
  const wartosci = new Set(zWartoscia.map((d) => String(d.wartosc)));
  if (wartosci.size === 0) return { cecha, status: "nieznane", wartosc: null, dowody };
  if (wartosci.size > 1) return { cecha, status: "sprzeczne", wartosc: null, dowody };

  const wartosc = zWartoscia[0].wartosc;
  const zrodla = new Set(zWartoscia.map((d) => d.zrodlo));
  if (zrodla.has("osm") || zrodla.has("zalozenie")) return { cecha, status: "otwarte_zrodlo", wartosc, dowody };
  if (zrodla.has("zgloszenie")) return { cecha, status: "zgloszone", wartosc, dowody };
  return { cecha, status: "podejrzenie_obraz", wartosc, dowody };
}

export function dowodZObserwacji(o: Obserwacja): Dowod {
  return {
    zrodlo: "model",
    wartosc: o.klasa,
    data: o.dataObrazu,
    rodzajDaty: "obrazu",
    opis: `${o.uzasadnienie} (ocena ${o.ocena.toFixed(2)})`,
    ref: o.id,
    przykladowe: o.przykladowe,
  };
}

export function dowodZWeryfikacji(w: Weryfikacja): Dowod {
  return {
    zrodlo: "teren",
    wartosc: w.wartosc,
    data: w.dataKontroli,
    rodzajDaty: "kontroli",
    opis: w.notatka,
    ref: w.id,
    przykladowe: w.przykladowe,
  };
}

export function dowodZeZgloszenia(z: Zgloszenie): Dowod {
  return {
    zrodlo: "zgloszenie",
    wartosc: z.wartosc,
    data: z.dataZgloszenia,
    rodzajDaty: "zgloszenia",
    opis: [z.zdjecie ? "ze zdjęciem" : "bez zdjęcia", z.opis].filter(Boolean).join(", "),
    ref: z.id,
    przykladowe: false,
    ...(z.stan === "przyjete" ? { przyjete: true } : {}),
  };
}

/**
 * Stan wszystkich cech odcinka: dowody z OSM + obserwacje z obrazu + weryfikacje z terenu
 * + zgłoszenia mieszkańców. Odrzucone zgłoszenia nie są dowodem; oczekujące są dowodem,
 * ale nie rozstrzygają — mogą najwyżej stanąć w sprzeczności z OSM i tak trafić do kolejki.
 */
export function stanOdcinka(
  odcinek: Odcinek,
  obserwacje: Obserwacja[],
  weryfikacje: Weryfikacja[],
  zgloszenia: Zgloszenie[] = [],
): Record<Cecha, StanCechy> {
  const odrzucone = new Set(weryfikacje.map((w) => w.odrzucaObserwacje).filter(Boolean));
  const wynik = {} as Record<Cecha, StanCechy>;
  for (const cecha of CECHY) {
    const dowody: Dowod[] = [...(odcinek.dowody[cecha] ?? [])];
    for (const o of obserwacje) {
      if (o.odcinekId === odcinek.id && o.cecha === cecha && !odrzucone.has(o.id)) dowody.push(dowodZObserwacji(o));
    }
    for (const z of zgloszenia) {
      if (z.odcinekId === odcinek.id && z.cecha === cecha && z.stan !== "odrzucone") dowody.push(dowodZeZgloszenia(z));
    }
    for (const w of weryfikacje) {
      if (w.odcinekId === odcinek.id && w.cecha === cecha) dowody.push(dowodZWeryfikacji(w));
    }
    wynik[cecha] = rozstrzygnijCeche(cecha, dowody);
  }
  return wynik;
}
