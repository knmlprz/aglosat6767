"use client";

// Szczegóły miejsca: dlaczego jest ważne, co sprawdzić w terenie, co wiadomo i skąd.

import type { Cecha, Pilot, Profil, StanCechy, Status, Weryfikacja, WynikWplywu } from "@/lib/aglosat/types.ts";
import { FormularzKontroli } from "@/components/aglosat/formularz-kontroli";
import { WycinekObrazu } from "@/components/aglosat/wycinek-obrazu";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { stanOdcinka } from "@/lib/aglosat/status.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import {
  CECHA_LABEL,
  DATA_LABEL,
  ETYKIETA_PRZYKLADOWE,
  STATUS_LABEL,
  ZRODLO_LABEL,
  formatujWartosc,
  odmiana,
} from "@/lib/aglosat/vocabulary.ts";
import { STYL_MAPY, kategoriaMapy } from "@/lib/aglosat/styl.ts";

const STATUS_KLASA: Record<Status, string> = {
  potwierdzone: "bg-emerald-100 text-emerald-900",
  otwarte_zrodlo: "bg-sky-100 text-sky-900",
  zgloszone: "bg-violet-100 text-violet-900",
  podejrzenie_obraz: "bg-amber-100 text-amber-900",
  nieznane: "bg-slate-200 text-slate-800",
  sprzeczne: "bg-fuchsia-100 text-fuchsia-900",
};

export function SzczegolyMiejsca({
  pilot,
  odcinekId,
  wynik,
  pozycja,
  ocena,
  profil,
  weryfikacje,
  onDodaj,
  onCofnij,
  onZamknij,
}: {
  pilot: Pilot;
  odcinekId: string;
  wynik: WynikWplywu | null;
  pozycja: number | null;
  ocena: OcenaOdcinka;
  profil: Profil;
  weryfikacje: Weryfikacja[];
  onDodaj: (w: Weryfikacja[]) => void;
  onCofnij: (idWpisu: string) => void;
  onZamknij: () => void;
}) {
  const odc = pilot.odcinki.find((o) => o.id === odcinekId)!;
  const stany = stanOdcinka(odc, pilot.obserwacje, weryfikacje);
  // Odrzucone wykrycia nie liczą się do statusu, ale pokazujemy je: tak wygląda błąd modelu.
  const naMiejscu = new Set(wynik?.odcinki ?? [odcinekId]);
  const wycinek = pilot.wycinki.find((w) => naMiejscu.has(w.odcinekId)) ?? null;
  const odrzucone = weryfikacje.flatMap((w) => {
    const o = w.odrzucaObserwacje ? pilot.obserwacje.find((x) => x.id === w.odrzucaObserwacje) : undefined;
    return o && naMiejscu.has(o.odcinekId) ? [{ o, w }] : [];
  });
  const kat = STYL_MAPY[kategoriaMapy(ocena)];
  const liczbaOdcinkow = wynik?.odcinki.length ?? 1;
  const dlugosc = wynik
    ? wynik.odcinki.reduce((s, id) => s + (pilot.odcinki.find((o) => o.id === id)?.dlugoscM ?? 0), 0)
    : odc.dlugoscM;
  const pozostale: Cecha[] = (["ciaglosc", "schody", "nawierzchnia", "kraweznik", "szerokosc", "nachylenie"] as Cecha[]).filter(
    (c) => !profil.wymagane.includes(c),
  );

  return (
    <section aria-labelledby="szczegoly-tytul" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            {pozycja ? `Miejsce ${pozycja} w rankingu` : "Odcinek poza rankingiem"}
          </p>
          <h3 id="szczegoly-tytul" className="text-lg font-bold text-slate-900">
            {lokalizacja(odc, pilot)}
          </h3>
          <p className="text-xs text-slate-500">
            {Math.round(dlugosc)} m{liczbaOdcinkow > 1 ? `, ${liczbaOdcinkow} ${odmiana(liczbaOdcinkow, ["odcinek", "odcinki", "odcinków"])} w OSM` : ""} · {kat.etykieta}
          </p>
        </div>
        <button
          type="button"
          onClick={onZamknij}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Wróć do listy
        </button>
      </div>

      {wycinek && (
        <WycinekObrazu
          wycinek={wycinek}
          przebiegi={[...naMiejscu].map((id) => pilot.odcinki.find((o) => o.id === id)!.geometria)}
          obserwacje={pilot.obserwacje.filter((o) => naMiejscu.has(o.odcinekId))}
          odrzucone={new Set(weryfikacje.map((w) => w.odrzucaObserwacje).filter((x): x is string => !!x))}
        />
      )}

      {wynik && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Jeśli to miejsce okaże się nieprzejezdne</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {wynik.utraconeRelacje > 0 && (
              <li>
                {wynik.utraconeRelacje} {odmiana(wynik.utraconeRelacje, ["relacja", "relacje", "relacji"])} budynek–usługa{" "}
                {odmiana(wynik.utraconeRelacje, ["traci", "tracą", "traci"])} trasę
              </li>
            )}
            {wynik.wydluzoneRelacje > 0 && (
              <li>
                {wynik.wydluzoneRelacje} {odmiana(wynik.wydluzoneRelacje, ["relacja", "relacje", "relacji"])}{" "}
                {odmiana(wynik.wydluzoneRelacje, ["wydłuża", "wydłużają", "wydłuża"])} się, średnio o {wynik.dodatkowaDrogaM} m
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs font-semibold text-slate-600">Usługi, do których prowadzą te dojścia:</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {wynik.uslugi.map((u) => (
              <li key={u} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                {u}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Wynik mówi, że miejsce jest istotne. Nie mówi, że jego sprawdzenie rozstrzygnie trasę: po drodze mogą być inne
            niewiadome.
          </p>
        </div>
      )}

      {ocena.nieznane.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800">Do sprawdzenia w terenie</h4>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {ocena.nieznane.map((c) => (
              <li key={c} className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                {CECHA_LABEL[c]}
                {ocena.sprzeczne.includes(c) && " (sprzeczne źródła)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormularzKontroli
        odcinki={wynik?.odcinki ?? [odcinekId]}
        doSprawdzenia={ocena.nieznane}
        obserwacje={pilot.obserwacje}
        weryfikacje={weryfikacje}
        onDodaj={onDodaj}
        onCofnij={onCofnij}
      />

      {odc.strefaZmian && (
        <p className="rounded-lg border border-cyan-300 bg-cyan-50 p-2 text-xs text-cyan-900">
          Odcinek leży w strefie sygnału możliwej zmiany (Sentinel-2): dane mogą być nieaktualne.{" "}
          <span className="text-amber-700">Ilustracja, {ETYKIETA_PRZYKLADOWE}.</span>
        </p>
      )}

      {odrzucone.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <h4 className="text-xs font-bold text-slate-700">Wykrycia modelu odrzucone w terenie</h4>
          <ul className="mt-1 flex flex-col gap-0.5">
            {odrzucone.map(({ o, w }) => (
              <li key={o.id} className="text-xs text-slate-600">
                <s>
                  model wizyjny: {formatujWartosc("ciaglosc", o.klasa)} (ocena {o.ocena.toFixed(2)}, data obrazu {o.dataObrazu})
                </s>{" "}
                → kontrola {w.dataKontroli}: {formatujWartosc(w.cecha, w.wartosc)}
                {w.notatka && <>, „{w.notatka}”</>}
                {o.przykladowe && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">{ETYKIETA_PRZYKLADOWE}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-slate-800">Co wiadomo i skąd</h4>
        <p className="text-xs text-slate-500">Cechy wymagane przez profil „{profil.nazwa}”.</p>
        <ul className="mt-2 flex flex-col gap-2">
          {profil.wymagane.map((c) => (
            <WierszCechy key={c} cecha={c} stan={stany[c]} />
          ))}
        </ul>
        {pozostale.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">Pozostałe cechy</summary>
            <ul className="mt-2 flex flex-col gap-2">
              {pozostale.map((c) => (
                <WierszCechy key={c} cecha={c} stan={stany[c]} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

function WierszCechy({ cecha, stan }: { cecha: Cecha; stan: StanCechy }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{CECHA_LABEL[cecha]}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_KLASA[stan.status]}`}>
          {STATUS_LABEL[stan.status]}
        </span>
      </div>
      <p className="text-sm text-slate-700">{formatujWartosc(cecha, stan.wartosc)}</p>
      {stan.dowody.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">Żadne źródło nie opisuje tej cechy.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {stan.dowody.map((d, i) => (
            <li key={i} className="text-xs text-slate-500">
              {ZRODLO_LABEL[d.zrodlo]}: {formatujWartosc(cecha, d.wartosc)} · {DATA_LABEL[d.rodzajDaty]} {d.data}
              {d.ref && d.zrodlo !== "teren" && <> · <code className="text-[11px]">{d.ref}</code></>}
              {d.opis && <> · {d.opis}</>}
              {d.przykladowe && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">{ETYKIETA_PRZYKLADOWE}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
