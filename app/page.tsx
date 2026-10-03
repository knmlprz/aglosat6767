import { readFileSync } from "node:fs";
import path from "node:path";
import { LandingPage, type LiczbyStrony } from "@/components/landing-page";
import { rozwinPilot, type PilotZapisany } from "@/lib/aglosat/data.ts";
import { ocenWszystkie } from "@/lib/aglosat/routing.ts";
import { PROFIL_DOMYSLNY } from "@/lib/aglosat/profile.ts";
import { CECHA_LABEL } from "@/lib/aglosat/vocabulary.ts";

// Liczby strony głównej liczone przy budowaniu z tych samych danych i kodu co aplikacja.
function policzLiczby(): LiczbyStrony {
  const plik = path.join(process.cwd(), "public/aglosat/pilot.json");
  const p = rozwinPilot(JSON.parse(readFileSync(plik, "utf8")) as PilotZapisany);
  const oceny = ocenWszystkie(p.odcinki, p.obserwacje, [], PROFIL_DOMYSLNY);
  const k = p.kandydaci[0];
  const b = k && p.budynki.find((x) => x.id === k.budynekId);
  const u = k && p.uslugi.find((x) => x.id === k.uslugaId);
  const niewiadoma = k && oceny.get(k.niewiadome[0]);
  return {
    obszar: p.meta.obszar.nazwa,
    pobranoOsm: p.meta.pobranoOsm,
    relacje: p.mianownik.relacje,
    bezUdokumentowanej: p.mianownik.relacje - p.mianownik.udokumentowane,
    niewiadome: [...oceny.values()].filter((o) => o.przejezdnosc === "nieznany").length,
    sprzeczne: [...oceny.values()].filter((o) => o.sprzeczne.length > 0).length,
    odcinki: p.odcinki.length,
    miejsceUslugi: p.ranking[0]?.uslugi.length ?? 0,
    miejscDoKontroli: p.ranking.length,
    przypadek:
      k && b && u
        ? {
            start: b.adres ?? "budynek mieszkalny",
            cel: u.nazwa,
            pieszoM: k.pieszoM,
            weryfikacjiM: k.weryfikacjiM ?? 0,
            cecha: (niewiadoma?.nieznane ?? []).map((c) => CECHA_LABEL[c]).join(", "),
          }
        : null,
    dataNalotu: p.wycinki[0]?.dataObrazu ?? null,
    model: p.obserwacje.find((o) => !o.przykladowe && o.model)?.model ?? null,
  };
}

export default function Home() {
  return <LandingPage liczby={policzLiczby()} />;
}
