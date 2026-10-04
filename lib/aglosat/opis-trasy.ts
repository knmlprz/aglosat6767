// Opis trasy dla mieszkańca: szablon z danych grafu, bez modelu językowego.
// Jest deterministyczny i nie doda faktów; to też tekstowa alternatywa dla mapy.

import type { Budynek, Cecha, Odcinek, Pilot, Usluga } from "./types.ts";
import type { OcenaOdcinka } from "./profile.ts";
import type { Trasa, TrasyRelacji } from "./routing.ts";
import { CECHA_LABEL, KATEGORIA_LABEL, odmiana } from "./vocabulary.ts";
import { lokalizacja } from "./opis.ts";

export const WEJSCIE_LABEL: Record<string, string> = {
  yes: "dostępne dla wózka",
  limited: "częściowo dostępne dla wózka",
  no: "niedostępne dla wózka",
};

export function opisWejscia(u: Usluga, dataOsm: string): string {
  const w = u.wejscie?.wheelchair;
  return w && WEJSCIE_LABEL[w]
    ? `według OpenStreetMap ${WEJSCIE_LABEL[w]} (dane pobrane ${dataOsm})`
    : "brak informacji o wejściu w OpenStreetMap";
}

export type MiejsceNaTrasie = {
  odcinek: Odcinek;
  rodzaj: "niewiadoma" | "sprzeczne" | "utrudnienie";
  cechy: Cecha[];
};

/** Odcinki trasy warte uwagi mieszkańca, w kolejności przejścia. Sąsiednie kawałki tej samej linii łączymy. */
export function miejscaNaTrasie(trasa: Trasa, pilot: Pilot, oceny: Map<string, OcenaOdcinka>): MiejsceNaTrasie[] {
  const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
  const wynik: MiejsceNaTrasie[] = [];
  for (const id of trasa.odcinki) {
    const o = oceny.get(id)!;
    const odc = odcinki.get(id)!;
    const rodzaj: MiejsceNaTrasie["rodzaj"] | null =
      o.sprzeczne.length > 0 ? "sprzeczne" : o.nieznane.length > 0 ? "niewiadoma" : o.utrudnienia.length > 0 ? "utrudnienie" : null;
    if (!rodzaj) continue;
    const cechy = rodzaj === "utrudnienie" ? o.utrudnienia : o.nieznane;
    const poprz = wynik[wynik.length - 1];
    if (poprz && poprz.rodzaj === rodzaj && poprz.odcinek.osmWayId === odc.osmWayId && poprz.cechy.join() === cechy.join()) continue;
    wynik.push({ odcinek: odc, rodzaj, cechy });
  }
  return wynik;
}

const metry = (m: number) => `${Math.round(m)} ${odmiana(Math.round(m), ["metr", "metry", "metrów"])}`;

export function opisTrasy(
  pilot: Pilot,
  start: Budynek,
  cel: Usluga,
  trasy: TrasyRelacji,
  oceny: Map<string, OcenaOdcinka>,
  dataKontroli: string | null,
  dataPrzyjetegoZgloszenia: string | null = null,
): string {
  const zdania: string[] = [];
  zdania.push(
    `Trasa z adresu ${start.adres ?? "budynek mieszkalny"} do celu ${cel.nazwa} (${KATEGORIA_LABEL[cel.kategoria]}).`,
  );
  if (trasy.piesza) zdania.push(`Najkrótsza droga piesza, bez uwzględniania preferencji, ma ${metry(trasy.piesza.dlugoscM)}.`);

  if (trasy.udokumentowana) {
    zdania.push(
      `Trasa udokumentowana dla wybranych preferencji ma ${metry(trasy.udokumentowana.dlugoscM)}: każda wymagana cecha na niej ma źródło i spełnia preferencje.`,
    );
  } else {
    zdania.push("Nie można potwierdzić trasy dla wybranych preferencji.");
  }

  const wer = trasy.weryfikacji;
  if (wer && wer.niewiadome.length > 0) {
    const miejsca = miejscaNaTrasie(wer, pilot, oceny).filter((m) => m.rodzaj !== "utrudnienie");
    const lista = miejsca
      .map((m) => `${lokalizacja(m.odcinek, pilot)}, brak informacji: ${m.cechy.map((c) => CECHA_LABEL[c]).join(", ")}`)
      .join("; ");
    zdania.push(
      `Trasa wymagająca weryfikacji ma ${metry(wer.dlugoscM)} i prowadzi przez ${miejsca.length} ${odmiana(miejsca.length, [
        "miejsce",
        "miejsca",
        "miejsc",
      ])} bez pełnej informacji: ${lista}.`,
    );
  } else if (!wer) {
    zdania.push("Nie znaleźliśmy przejścia nawet przy założeniu, że miejsca bez informacji są przejezdne.");
  }

  const glowna = trasy.udokumentowana ?? wer;
  if (glowna) {
    const utrudnienia = miejscaNaTrasie(glowna, pilot, oceny).filter((m) => m.rodzaj === "utrudnienie");
    if (utrudnienia.length > 0) {
      zdania.push(
        `Na trasie ${odmiana(utrudnienia.length, ["jest", "są", "jest"])} ${utrudnienia.length} ${odmiana(utrudnienia.length, [
          "odcinek",
          "odcinki",
          "odcinków",
        ])} z utrudnieniem, na przykład kostką granitową.`,
      );
    }
  }

  zdania.push(`Wejście do celu: ${opisWejscia(cel, pilot.meta.pobranoOsm)}.`);
  const zrodla = [`OpenStreetMap, pobrane ${pilot.meta.pobranoOsm}`];
  if (dataKontroli) zrodla.push(`kontrola w terenie ${dataKontroli}`);
  if (dataPrzyjetegoZgloszenia) {
    zrodla.push(`zgłoszenie mieszkańca przyjęte przez urząd ${dataPrzyjetegoZgloszenia}`);
  }
  zdania.push(`Źródło danych: ${zrodla.join("; ")}.`);
  return zdania.join(" ");
}
