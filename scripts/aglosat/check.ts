// Kontrola danych pilota i reguł modelu. Kończy się kodem 1, jeśli którakolwiek reguła pada.
// Uruchomienie: npm run aglosat:check

import { readFileSync } from "node:fs";
import type { Pilot, Weryfikacja } from "../../lib/aglosat/types.ts";
import { rozwinPilot, type PilotZapisany } from "../../lib/aglosat/data.ts";
import { PROFIL_DOMYSLNY, ocenCeche } from "../../lib/aglosat/profile.ts";
import { stanOdcinka, CECHY } from "../../lib/aglosat/status.ts";
import { ocenWszystkie, trasyRelacji, zbudujGraf } from "../../lib/aglosat/routing.ts";
import { policzAnalize } from "../../lib/aglosat/impact.ts";

const p: Pilot = rozwinPilot(JSON.parse(readFileSync("data/aglosat/pilot.json", "utf8")) as PilotZapisany);
let bledy = 0;
function sprawdz(warunek: boolean, opis: string) {
  console.log(`${warunek ? "OK  " : "BŁĄD"} ${opis}`);
  if (!warunek) bledy++;
}

const profil = PROFIL_DOMYSLNY;
const graf = zbudujGraf(p.odcinki);
const oceny = ocenWszystkie(p.odcinki, p.obserwacje, [], profil);

// 1. Brak danych nigdy nie staje się „spełnia”.
let naruszenia = 0;
for (const o of p.odcinki) {
  const stany = stanOdcinka(o, p.obserwacje, []);
  for (const c of CECHY) {
    const s = stany[c];
    const udok = s.status === "potwierdzone" || s.status === "otwarte_zrodlo";
    if (!udok && ocenCeche(s, profil) !== "nieznane") naruszenia++;
    if (s.status === "nieznane" && s.dowody.some((d) => d.zrodlo !== "model")) naruszenia++;
  }
}
sprawdz(naruszenia === 0, "brak danych i niepotwierdzone źródła nigdy nie dają „spełnia”");

// 2. Trzy rodzaje dat się nie mieszają.
const zleDaty = p.odcinki.flatMap((o) => Object.values(o.dowody).flat()).filter(
  (d) => (d!.zrodlo === "osm" || d!.zrodlo === "zalozenie") && d!.rodzajDaty !== "pobrania",
);
sprawdz(zleDaty.length === 0, "dowody z OSM mają datę pobrania");

// 3. Przypadek sprzeczny: OSM mówi „ciągły”, model „przerwany”.
const sprzeczne = p.odcinki.filter((o) => stanOdcinka(o, p.obserwacje, []).ciaglosc.status === "sprzeczne");
const przyklad = sprzeczne[0] && stanOdcinka(sprzeczne[0], p.obserwacje, []).ciaglosc;
sprawdz(
  !!przyklad && przyklad.wartosc === null && przyklad.dowody.some((d) => d.zrodlo === "osm") && przyklad.dowody.some((d) => d.rodzajDaty === "obrazu"),
  `przypadek sprzeczny istnieje i pokazuje oba źródła (${sprzeczne.length} odcinków)`,
);

// 4. Odrzucenie wykrycia w terenie („to był cień”) przywraca zgodność.
if (sprzeczne[0]) {
  const obs = p.obserwacje.find((x) => x.odcinekId === sprzeczne[0].id && x.klasa === "przerwany")!;
  const odrzucenie: Weryfikacja = {
    id: "test-odrzucenie", odcinekId: sprzeczne[0].id, cecha: "ciaglosc", wartosc: "ciagly",
    dataKontroli: "2026-10-04", notatka: "w terenie był cień", odrzucaObserwacje: obs.id, przykladowe: true,
  };
  const po = stanOdcinka(sprzeczne[0], p.obserwacje, [odrzucenie]).ciaglosc;
  sprawdz(po.status === "potwierdzone" && po.wartosc === "ciagly" && !po.dowody.some((d) => d.ref === obs.id),
    "odrzucenie wykrycia w terenie daje „potwierdzone” i usuwa obserwację z dowodów");
}

// 5. Skrajny przypadek: weryfikacja jedynej niewiadomej zmienia trasę na żywo.
const k = p.kandydaci[0];
sprawdz(!!k, `jest kandydat na skrajny przypadek (${p.kandydaci.length})`);
if (k) {
  const b = p.budynki.find((x) => x.id === k.budynekId)!;
  const u = p.uslugi.find((x) => x.id === k.uslugaId)!;
  const przed = trasyRelacji(graf, oceny, b.wezel, u.wezel);
  console.log(`     ${b.adres ?? b.id} → ${u.nazwa} (${u.kategoria}): pieszo ${Math.round(przed.piesza!.dlugoscM)} m, ` +
    `udokumentowana ${przed.udokumentowana ? Math.round(przed.udokumentowana.dlugoscM) + " m" : "brak"}, ` +
    `wymagająca weryfikacji ${Math.round(przed.weryfikacji!.dlugoscM)} m z ${przed.weryfikacji!.niewiadome.length} niewiadomymi`);
  const odc = przed.weryfikacji!.niewiadome[0];
  const brak = oceny.get(odc)!.nieznane;
  console.log(`     niewiadoma: ${odc} (${p.odcinki.find((o) => o.id === odc)!.typ}), brakuje: ${brak.join(", ")}`);

  const potw: Weryfikacja[] = brak.map((c, i) => ({
    id: `t${i}`, odcinekId: odc, cecha: c, wartosc: c === "kraweznik" ? "obnizony" : c === "nawierzchnia" ? "paving_stones" : "ciagly",
    dataKontroli: "2026-10-04", przykladowe: true,
  }));
  const poPotw = trasyRelacji(graf, ocenWszystkie(p.odcinki, p.obserwacje, potw, profil), b.wezel, u.wezel);
  sprawdz(!!poPotw.udokumentowana, `po potwierdzeniu „spełnia” trasa udokumentowana istnieje: ${poPotw.udokumentowana ? Math.round(poPotw.udokumentowana.dlugoscM) + " m" : "brak"}`);

  const bariera: Weryfikacja[] = potw.map((w) => ({ ...w, wartosc: w.cecha === "kraweznik" ? "wysoki" : w.cecha === "nawierzchnia" ? "grass" : "przerwany" }));
  const poBar = trasyRelacji(graf, ocenWszystkie(p.odcinki, p.obserwacje, bariera, profil), b.wezel, u.wezel);
  sprawdz(!poBar.weryfikacji || !poBar.weryfikacji.odcinki.includes(odc),
    `po potwierdzeniu bariery trasa jej unika: ${poBar.weryfikacji ? Math.round(poBar.weryfikacji.dlugoscM) + " m, " + poBar.weryfikacji.niewiadome.length + " niewiadomych" : "brak trasy"}`);
}

// 6. Mianownik i stabilność rankingu przy równych wagach.
const m = p.mianownik;
sprawdz(m.relacje === m.udokumentowane + m.wymagajaceWeryfikacji + m.bezPrzejscia, "mianownik się sumuje");
console.log(`     relacje budynek–kategoria usługi: ${m.relacje}; udokumentowane ${m.udokumentowane} (${Math.round((100 * m.udokumentowane) / m.relacje)}%), ` +
  `wymagające weryfikacji ${m.wymagajaceWeryfikacji}, bez przejścia ${m.bezPrzejscia}`);
const ponownie = policzAnalize(p.odcinki, p.budynki, p.uslugi, oceny, profil);
sprawdz(
  JSON.stringify(ponownie.ranking.slice(0, p.ranking.length)) === JSON.stringify(p.ranking) &&
    JSON.stringify(ponownie.mianownik) === JSON.stringify(p.mianownik),
  "ranking i mianownik przeliczone z wczytanego pliku są identyczne z zapisanymi",
);
const rowne = policzAnalize(p.odcinki, p.budynki, p.uslugi, oceny, profil, "rowne").ranking.slice(0, 10).map((r) => r.odcinekId);
const zabudowa = p.ranking.slice(0, 10).map((r) => r.odcinekId);
const wspolne = zabudowa.filter((id) => rowne.includes(id)).length;
console.log(`     stabilność: ${wspolne}/10 odcinków z czoła rankingu zostaje przy równych wagach budynków`);
const top = p.ranking.slice(0, 10);
console.log(`     koncentracja: pierwsze 10 odcinków dotyka ${top.reduce((s, r) => s + r.utraconeRelacje + r.wydluzoneRelacje, 0)} relacji (z powtórzeniami)`);

console.log(bledy === 0 ? "\nWszystkie reguły spełnione." : `\n${bledy} reguł nie spełniono.`);
process.exit(bledy === 0 ? 0 : 1);
