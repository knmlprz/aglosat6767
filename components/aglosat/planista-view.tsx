"use client";

// Widok planisty: mianownik, dojście przeliczane na żywo, mapa niewiedzy, ranking miejsc
// do kontroli i szczegóły miejsca z wpisem kontroli. Ranking i mianownik to analiza bazowa;
// na żywo przeliczają się stan odcinków, mapa i trasy.
// Legenda z liczbami jest jednocześnie tekstową alternatywą dla mapy.

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ocenWszystkie, trasyRelacji, zbudujGraf } from "@/lib/aglosat/routing.ts";
import { PROFIL_DOMYSLNY } from "@/lib/aglosat/profile.ts";
import { ETYKIETA_ANALIZA_BAZOWA, ETYKIETA_PRZYKLADOWE } from "@/lib/aglosat/vocabulary.ts";
import { KOLEJNOSC_KATEGORII, STYL_MAPY, kategoriaMapy, type KategoriaMapy } from "@/lib/aglosat/styl.ts";
import type { WynikWplywu } from "@/lib/aglosat/types.ts";
import { idWpisu } from "@/lib/aglosat/weryfikacja.ts";
import { useAglosat } from "@/components/aglosat/stan-aglosat";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import { TrasaRelacji, type Relacja } from "@/components/aglosat/trasa-relacji";
import { TrasaKontroliPanel, type UstawieniaKontroli } from "@/components/aglosat/trasa-kontroli";
import type { KontrolaNaMapie } from "@/components/aglosat/mapa-niewiedzy";
import { DOMYSLNE_PARAMETRY, ulozTraseKontroli } from "@/lib/aglosat/kontrola.ts";
import { RankingLista } from "@/components/aglosat/ranking-lista";
import { SzczegolyMiejsca } from "@/components/aglosat/szczegoly-miejsca";
import { ZgloszeniaLista } from "@/components/aglosat/zgloszenia-lista";

const CZOLO_NA_MAPIE = 10;

type Zakladka = "ranking" | "kontrola" | "zgloszenia";

/** Po zamknięciu szczegółów fokus wraca na nagłówek listy, która znów jest widoczna. */
const NAGLOWEK_LISTY: Record<Zakladka, string> = {
  ranking: "ranking-tytul",
  kontrola: "kontrola-tytul",
  zgloszenia: "zgloszenia-tytul",
};

const MapaNiewiedzy = dynamic(
  () => import("@/components/aglosat/mapa-niewiedzy").then((m) => m.MapaNiewiedzy),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-800" aria-hidden />,
  },
);

const procent = (a: number, b: number) => `${Math.round((100 * a) / Math.max(b, 1))}%`;

export function PlanistaView() {
  const { wczytanie, weryfikacje, zgloszenia, rozpatrzZgloszenie, dodajKontrole, cofnijKontrole, przywroc, zadanie } =
    useAglosat();
  const profil = PROFIL_DOMYSLNY;
  const [widoczne, setWidoczne] = useState<Set<KategoriaMapy>>(() => new Set(KOLEJNOSC_KATEGORII));
  // Stan początkowy może narzucić tryb demo (czytany tylko przy montowaniu).
  const [wybranyOdcinek, setWybranyOdcinek] = useState<string | null>(() => zadanie?.wybierz ?? null);
  const wybierz = useCallback((id: string) => setWybranyOdcinek(id), []);
  const [wybranaRelacja, setRelacja] = useState<Relacja | null>(null);
  const [fokusTrasy, setFokusTrasy] = useState(0);
  const [zakladka, setZakladka] = useState<Zakladka>(() => zadanie?.zakladka ?? "ranking");
  // Mapa pokazuje albo dojście, albo trasę kontroli, żeby linie się nie nakładały.
  const [pokazKontrole, setPokazKontrole] = useState(() => zadanie?.pokazKontrole ?? false);
  const [fokusKontroli, setFokusKontroli] = useState(() => (zadanie?.pokazKontrole ? 1 : 0));
  const [ustawieniaKontroli, setUstawieniaKontroli] = useState<UstawieniaKontroli | null>(null);

  const pilot = wczytanie.stan === "gotowe" ? wczytanie.pilot : null;
  const graf = useMemo(() => (pilot ? zbudujGraf(pilot.odcinki) : null), [pilot]);
  const ocenyBazowe = useMemo(
    () => (pilot ? ocenWszystkie(pilot.odcinki, pilot.obserwacje, [], profil) : null),
    [pilot, profil],
  );
  // Stan po kontrolach z tej sesji: od niego zależą mapa, trasy i panel miejsca.
  const oceny = useMemo(
    () =>
      pilot
        ? weryfikacje.length || zgloszenia.length
          ? ocenWszystkie(pilot.odcinki, pilot.obserwacje, weryfikacje, profil, zgloszenia)
          : ocenyBazowe
        : null,
    [pilot, weryfikacje, zgloszenia, profil, ocenyBazowe],
  );

  // Domyślnie skrajny przypadek: pierwszy kandydat z analizy.
  const relacja = useMemo<Relacja | null>(() => {
    if (wybranaRelacja) return wybranaRelacja;
    const k = pilot?.kandydaci[0];
    return k ? { budynekId: k.budynekId, uslugaId: k.uslugaId } : null;
  }, [wybranaRelacja, pilot]);
  const punkty = useMemo(() => {
    if (!pilot || !relacja) return null;
    const b = pilot.budynki.find((x) => x.id === relacja.budynekId);
    const u = pilot.uslugi.find((x) => x.id === relacja.uslugaId);
    return b && u ? { b, u } : null;
  }, [pilot, relacja]);
  const trasy = useMemo(
    () => (graf && oceny && punkty ? trasyRelacji(graf, oceny, punkty.b.wezel, punkty.u.wezel) : null),
    [graf, oceny, punkty],
  );
  const trasyBazowe = useMemo(
    () => (graf && ocenyBazowe && punkty ? trasyRelacji(graf, ocenyBazowe, punkty.b.wezel, punkty.u.wezel) : null),
    [graf, ocenyBazowe, punkty],
  );
  const trasaNaMapie = useMemo(
    () =>
      trasy && punkty
        ? {
            piesza: trasy.piesza?.odcinki ?? null,
            udokumentowana: trasy.udokumentowana?.odcinki ?? null,
            weryfikacji: trasy.weryfikacji?.odcinki ?? null,
            start: [punkty.b.lat, punkty.b.lon] as [number, number],
            cel: [punkty.u.lat, punkty.u.lon] as [number, number],
          }
        : null,
    [trasy, punkty],
  );
  const sprawdzone = useMemo(() => new Set(weryfikacje.map((w) => w.odcinekId)), [weryfikacje]);
  const doDecyzji = zgloszenia.filter((z) => z.stan === "oczekuje").length;

  // Trasa kontroli liczona tutaj, żeby przetrwała otwarcie szczegółów przystanku
  // i przeliczała się po każdej kontroli (sprawdzone miejsca wypadają).
  const ustawienia = useMemo<UstawieniaKontroli | null>(
    () => ustawieniaKontroli ?? (relacja ? { startId: relacja.budynekId, ...DOMYSLNE_PARAMETRY } : null),
    [ustawieniaKontroli, relacja],
  );
  const trasaKontroli = useMemo(() => {
    if (!graf || !pilot || !ustawienia) return null;
    const start = pilot.budynki.find((b) => b.id === ustawienia.startId);
    return start ? ulozTraseKontroli(graf, pilot, start.wezel, { ...DOMYSLNE_PARAMETRY, ...ustawienia }, sprawdzone) : null;
  }, [graf, pilot, ustawienia, sprawdzone]);
  const kontrolaNaMapie = useMemo<KontrolaNaMapie | null>(() => {
    if (!pokazKontrole || !trasaKontroli || !pilot || !ustawienia) return null;
    const odc = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const start = pilot.budynki.find((b) => b.id === ustawienia.startId)!;
    return {
      odcinki: trasaKontroli.odcinki,
      start: [start.lat, start.lon],
      przystanki: trasaKontroli.przystanki.map((p) => {
        const g = odc.get(p.odcinekId)!.geometria;
        return { nr: p.nr, polozenie: g[Math.floor(g.length / 2)] };
      }),
    };
  }, [pokazKontrole, trasaKontroli, pilot, ustawienia]);

  const podsumowanie = useMemo(() => {
    if (!pilot || !oceny) return null;
    const wynik = Object.fromEntries(KOLEJNOSC_KATEGORII.map((k) => [k, { liczba: 0, metry: 0 }])) as Record<
      KategoriaMapy,
      { liczba: number; metry: number }
    >;
    for (const o of pilot.odcinki) {
      const k = kategoriaMapy(oceny.get(o.id)!);
      wynik[k].liczba++;
      wynik[k].metry += o.dlugoscM;
    }
    return wynik;
  }, [pilot, oceny]);

  // Odcinek → miejsce w rankingu, do którego należy (kliknięcie w mapę wybiera całe miejsce).
  const wgOdcinka = useMemo(() => {
    const m = new Map<string, { wynik: WynikWplywu; pozycja: number }>();
    pilot?.ranking.forEach((wynik, i) => wynik.odcinki.forEach((id) => m.set(id, { wynik, pozycja: i + 1 })));
    return m;
  }, [pilot]);
  const wybraneMiejsce = wybranyOdcinek ? (wgOdcinka.get(wybranyOdcinek) ?? null) : null;
  const wybrane = useMemo(
    () => (wybranyOdcinek ? (wybraneMiejsce?.wynik.odcinki ?? [wybranyOdcinek]) : []),
    [wybranyOdcinek, wybraneMiejsce],
  );
  const czolo = useMemo(
    () => (pilot?.ranking ?? []).slice(0, CZOLO_NA_MAPIE).map((r, i) => ({ odcinekId: r.odcinekId, pozycja: i + 1 })),
    [pilot],
  );

  const sprzeczne = useMemo(
    () => (pilot && oceny ? pilot.odcinki.filter((o) => oceny.get(o.id)!.sprzeczne.length > 0) : []),
    [pilot, oceny],
  );

  if (wczytanie.stan === "blad") {
    return (
      <div role="alert" className="mx-4 lg:mx-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Nie udało się wczytać danych pilota ({wczytanie.komunikat}).
      </div>
    );
  }
  if (!pilot || !oceny || !podsumowanie || !ocenyBazowe) {
    return (
      <div className="px-4 lg:px-6" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 h-[560px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const m = pilot.mianownik;
  const przelacz = (k: KategoriaMapy) =>
    setWidoczne((prev) => {
      const nowe = new Set(prev);
      if (nowe.has(k)) nowe.delete(k);
      else nowe.add(k);
      return nowe;
    });

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6 pb-40">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-600">{pilot.meta.obszar.nazwa}</p>
        <h2 className="text-2xl font-black text-slate-900">Mapa niewiedzy</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Profil: <strong>{profil.nazwa}</strong>. {profil.opis} Odcinki bez rozstrzygnięcia przykrywa mgła;
          weryfikacja w terenie ją rozwiewa.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            OpenStreetMap, pobrano {pilot.meta.pobranoOsm}
          </span>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800">
            {ETYKIETA_PRZYKLADOWE}: obserwacje z obrazu, strefa Sentinel-2
          </span>
        </div>
      </header>

      <section aria-labelledby="mianownik" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="mianownik" className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Dojścia z budynków mieszkalnych do usług
          </h3>
          <span className="text-xs text-slate-600">{ETYKIETA_ANALIZA_BAZOWA}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Liczba tytul="relacje budynek–usługa" wartosc={String(m.relacje)} opis="najbliższa usługa każdej kategorii, do 1,2 km" />
          <Liczba tytul="trasa udokumentowana" wartosc={procent(m.udokumentowane, m.relacje)} opis={`${m.udokumentowane} relacji`} ton="ok" />
          <Liczba tytul="trasa wymagająca weryfikacji" wartosc={procent(m.wymagajaceWeryfikacji, m.relacje)} opis={`${m.wymagajaceWeryfikacji} relacji: przejście zależy od niewiadomych`} ton="uwaga" />
          <Liczba tytul="brak przejścia dla profilu" wartosc={procent(m.bezPrzejscia, m.relacje)} opis={`${m.bezPrzejscia} relacji, nawet licząc niewiadome jako przejezdne`} ton="zle" />
        </div>
      </section>

      {relacja && trasy && trasyBazowe && (
        <TrasaRelacji
          pilot={pilot}
          relacja={relacja}
          trasy={trasy}
          bazowe={trasyBazowe}
          oceny={oceny}
          liczbaKontroli={new Set(weryfikacje.map(idWpisu)).size}
          onZmienRelacje={(r) => {
            setPokazKontrole(false);
            setRelacja(r);
            setFokusTrasy((f) => f + 1);
          }}
          onWybierzOdcinek={wybierz}
          onPokazNaMapie={() => {
            setPokazKontrole(false);
            setFokusTrasy((f) => f + 1);
          }}
          onPrzywroc={przywroc}
        />
      )}

      <section aria-labelledby="mapa-tytul" className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <h3 id="mapa-tytul" className="sr-only">
          Mapa odcinków według stanu wiedzy
        </h3>
        <div
          role="region"
          aria-label="Mapa niewiedzy. Te same informacje są dostępne jako tekst: ranking miejsc, legenda z liczbami i lista sprzecznych źródeł."
          className="h-[520px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:h-[680px]"
        >
          <MapaNiewiedzy
            pilot={pilot}
            oceny={oceny}
            widoczne={widoczne}
            wybrane={wybrane}
            czolo={czolo}
            onWybierz={wybierz}
            trasa={kontrolaNaMapie ? null : trasaNaMapie}
            fokusTrasy={fokusTrasy}
            kontrola={kontrolaNaMapie}
            fokusKontroli={fokusKontroli}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:h-[680px] lg:overflow-y-auto" aria-live="polite">
          {wybranyOdcinek ? (
            <SzczegolyMiejsca
              pilot={pilot}
              odcinekId={wybraneMiejsce?.wynik.odcinekId ?? wybranyOdcinek}
              wynik={wybraneMiejsce?.wynik ?? null}
              pozycja={wybraneMiejsce?.pozycja ?? null}
              ocena={oceny.get(wybraneMiejsce?.wynik.odcinekId ?? wybranyOdcinek)!}
              profil={profil}
              weryfikacje={weryfikacje}
              zgloszenia={zgloszenia}
              onDodaj={dodajKontrole}
              onCofnij={cofnijKontrole}
              onZamknij={() => {
                setWybranyOdcinek(null);
                requestAnimationFrame(() =>
                  document.getElementById(NAGLOWEK_LISTY[zakladka])?.focus({ preventScroll: true }),
                );
              }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div role="group" aria-label="Widok listy" className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    ["ranking", "Ranking"],
                    ["kontrola", "Trasa kontroli"],
                    ["zgloszenia", "Zgłoszenia"],
                  ] as const
                ).map(([k, etykieta]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={zakladka === k}
                    onClick={() => setZakladka(k)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium ${
                      zakladka === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                    }`}
                  >
                    {etykieta}
                    {k === "zgloszenia" && doDecyzji > 0 && (
                      <span className="ml-1 rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white">
                        {doDecyzji}
                        <span className="sr-only"> do decyzji</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {zakladka === "ranking" ? (
                <RankingLista pilot={pilot} wybrany={null} onWybierz={wybierz} sprawdzone={sprawdzone} />
              ) : zakladka === "zgloszenia" ? (
                <ZgloszeniaLista
                  pilot={pilot}
                  zgloszenia={zgloszenia}
                  onRozpatrz={rozpatrzZgloszenie}
                  onWybierzOdcinek={wybierz}
                />
              ) : (
                trasaKontroli &&
                ustawienia && (
                  <TrasaKontroliPanel
                    pilot={pilot}
                    trasa={trasaKontroli}
                    ustawienia={ustawienia}
                    onZmienUstawienia={setUstawieniaKontroli}
                    naMapie={pokazKontrole}
                    onWybierzOdcinek={wybierz}
                    onPokazNaMapie={() => {
                      setPokazKontrole(true);
                      setFokusKontroli((f) => f + 1);
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>

      <fieldset className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <legend className="px-1 text-sm font-bold text-slate-800">
          Odcinki sieci pieszej: {pilot.odcinki.length}{" "}
          <span className="font-normal text-slate-600">(odznacz kategorię, aby ukryć ją na mapie)</span>
        </legend>
        {KOLEJNOSC_KATEGORII.map((k) => {
          const st = STYL_MAPY[k];
          return (
            <label key={k} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-slate-800"
                checked={widoczne.has(k)}
                onChange={() => przelacz(k)}
              />
              <svg width="28" height="14" className="mt-1 shrink-0 rounded bg-slate-800" aria-hidden>
                {st.mgla && <line x1="4" y1="7" x2="24" y2="7" stroke={st.mgla.color} strokeOpacity={st.mgla.opacity} strokeWidth={10} strokeLinecap="round" />}
                <line x1="2" y1="7" x2="26" y2="7" stroke={st.linia.color} strokeWidth={st.linia.weight} strokeDasharray={st.linia.dashArray} />
              </svg>
              <span className="flex flex-col text-sm">
                <span className="font-medium text-slate-800">
                  {st.etykieta}: {podsumowanie[k].liczba}
                  <span className="font-normal text-slate-600"> ({(podsumowanie[k].metry / 1000).toFixed(1)} km)</span>
                </span>
                <span className="text-xs text-slate-600">{st.opis}</span>
              </span>
            </label>
          );
        })}
        <div className="flex items-start gap-3 p-2 text-sm">
          <span className="mt-1 size-3.5 shrink-0 rounded-full border-2 border-slate-900 bg-sky-400" aria-hidden />
          <span>
            <span className="font-medium text-slate-800">usługi: {pilot.uslugi.length}</span>
            <span className="block text-xs text-slate-600">przychodnie, apteki, sklepy, poczta, biblioteki</span>
          </span>
        </div>
        <div className="flex items-start gap-3 p-2 text-sm">
          <span className="agl-numer mt-0.5 shrink-0 scale-75" aria-hidden>1</span>
          <span>
            <span className="font-medium text-slate-800">pierwsze {CZOLO_NA_MAPIE} miejsc rankingu</span>
            <span className="block text-xs text-slate-600">kliknij numer albo odcinek, aby zobaczyć szczegóły</span>
          </span>
        </div>
        {pilot.strefyZmian.length > 0 && (
          <div className="flex items-start gap-3 p-2 text-sm">
            <span className="mt-1 size-3.5 shrink-0 border-2 border-dashed border-cyan-400" aria-hidden />
            <span>
              <span className="font-medium text-slate-800">sygnał możliwej zmiany (Sentinel-2)</span>
              <span className="block text-xs text-amber-700">ilustracja, {ETYKIETA_PRZYKLADOWE}</span>
            </span>
          </div>
        )}
      </fieldset>

      {sprzeczne.length > 0 && (
        <section aria-labelledby="sprzeczne-tytul" className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 p-4">
          <h3 id="sprzeczne-tytul" className="text-sm font-bold text-slate-800">
            Sprzeczne źródła: {sprzeczne.length}
          </h3>
          <p className="text-xs text-slate-600">
            OpenStreetMap opisuje odcinek jako ciągły, a model wizyjny wskazuje przerwę. Pokazujemy oba źródła; rozstrzyga
            kontrola w terenie. <span className="text-amber-700">Wykrycia modelu: {ETYKIETA_PRZYKLADOWE}.</span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sprzeczne.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => wybierz(o.id)}
                  className="rounded-lg border border-fuchsia-300 bg-white px-2.5 py-1 text-sm text-slate-800 hover:bg-fuchsia-50"
                >
                  {lokalizacja(o, pilot)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Liczba({
  tytul,
  wartosc,
  opis,
  ton,
}: {
  tytul: string;
  wartosc: string;
  opis: string;
  ton?: "ok" | "uwaga" | "zle";
}) {
  const kolor =
    ton === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : ton === "uwaga"
        ? "border-slate-300 bg-slate-50"
        : ton === "zle"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 ${kolor}`}>
      <div className="text-xs font-semibold uppercase text-slate-600">{tytul}</div>
      <div className="mt-1 text-2xl font-black text-slate-900">{wartosc}</div>
      <div className="mt-1 text-xs text-slate-600">{opis}</div>
    </div>
  );
}
