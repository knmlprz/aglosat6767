"use client";

// Widok mieszkańca, wersja minimalna: start, cel, preferencje → trasa udokumentowana
// i trasa wymagająca weryfikacji, miejsca bez informacji, wejście do celu, opis tekstowy.
// Nie pytamy o niepełnosprawność, tylko o preferencje trasy.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useAglosat } from "@/components/aglosat/stan-aglosat";
import { ocenWszystkie, trasyRelacji, zbudujGraf, type Trasa } from "@/lib/aglosat/routing.ts";
import { PROFILE } from "@/lib/aglosat/profile.ts";
import { stanOdcinka } from "@/lib/aglosat/status.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";
import { miejscaNaTrasie, opisTrasy } from "@/lib/aglosat/opis-trasy.ts";
import type { KategoriaUslugi, Pilot, Weryfikacja } from "@/lib/aglosat/types.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { KOLEJNOSC_KATEGORII } from "@/lib/aglosat/styl.ts";
import {
  CECHA_LABEL,
  DATA_LABEL,
  KATEGORIA_LABEL,
  STATUS_LABEL,
  TRASA_LABEL,
  ZRODLO_LABEL,
  formatujWartosc,
  odmiana,
} from "@/lib/aglosat/vocabulary.ts";

const MapaNiewiedzy = dynamic(
  () => import("@/components/aglosat/mapa-niewiedzy").then((m) => m.MapaNiewiedzy),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-800" aria-hidden /> },
);

const BEZ_WYBORU: string[] = [];
const BEZ_CZOLA: { odcinekId: string; pozycja: number }[] = [];
const nic = () => {};
const m = (x: number) => `${Math.round(x)} m`;

export function MieszkaniecView() {
  const { wczytanie, weryfikacje } = useAglosat();
  const pilot = wczytanie.stan === "gotowe" ? wczytanie.pilot : null;

  const [startId, setStartId] = useState<string | null>(null);
  const [celId, setCelId] = useState<string | null>(null);
  const [profilId, setProfilId] = useState(PROFILE[0].id);
  // null = domyślnie: udokumentowana, jeśli istnieje. Zmiana startu, celu lub preferencji wraca do domyślnej.
  const [wyborTrasy, setWyborTrasy] = useState<"udokumentowana" | "weryfikacji" | null>(null);
  const [fokus, setFokus] = useState(1);

  const profil = PROFILE.find((p) => p.id === profilId)!;
  const domyslny = pilot?.kandydaci[0];
  const start = pilot?.budynki.find((b) => b.id === (startId ?? domyslny?.budynekId)) ?? null;
  const cel = pilot?.uslugi.find((u) => u.id === (celId ?? domyslny?.uslugaId)) ?? null;

  const graf = useMemo(() => (pilot ? zbudujGraf(pilot.odcinki) : null), [pilot]);
  const oceny = useMemo(
    () => (pilot ? ocenWszystkie(pilot.odcinki, pilot.obserwacje, weryfikacje, profil) : null),
    [pilot, weryfikacje, profil],
  );
  const trasy = useMemo(
    () => (graf && oceny && start && cel ? trasyRelacji(graf, oceny, start.wezel, cel.wezel) : null),
    [graf, oceny, start, cel],
  );


  const budynki = useMemo(
    () => (pilot?.budynki ?? []).filter((b) => b.adres).sort((a, b) => a.adres!.localeCompare(b.adres!, "pl", { numeric: true })),
    [pilot],
  );
  const uslugiWgKategorii = useMemo(() => {
    const g = new Map<KategoriaUslugi, NonNullable<typeof pilot>["uslugi"]>();
    for (const u of pilot?.uslugi ?? []) g.set(u.kategoria, [...(g.get(u.kategoria) ?? []), u]);
    return g;
  }, [pilot]);

  const trasaNaMapie = useMemo(
    () =>
      trasy && start && cel
        ? {
            piesza: null,
            udokumentowana: trasy.udokumentowana?.odcinki ?? null,
            weryfikacji: trasy.weryfikacji?.odcinki ?? null,
            start: [start.lat, start.lon] as [number, number],
            cel: [cel.lat, cel.lon] as [number, number],
          }
        : null,
    [trasy, start, cel],
  );

  if (wczytanie.stan === "blad") {
    return (
      <div role="alert" className="mx-4 lg:mx-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Nie udało się wczytać danych ({wczytanie.komunikat}).
      </div>
    );
  }
  if (!pilot || !oceny || !trasy || !start || !cel) {
    return <div className="mx-4 h-40 animate-pulse rounded-xl bg-slate-100 lg:mx-6" aria-busy="true" />;
  }

  const ostatniaKontrola = weryfikacje.length ? [...weryfikacje].sort((a, b) => b.dataKontroli.localeCompare(a.dataKontroli))[0].dataKontroli : null;
  const opis = opisTrasy(pilot, start, cel, trasy, oceny, ostatniaKontrola);
  const pokazana = wyborTrasy && trasy[wyborTrasy] ? wyborTrasy : trasy.udokumentowana ? "udokumentowana" : "weryfikacji";
  const wybrana: Trasa | null = pokazana === "udokumentowana" ? trasy.udokumentowana : trasy.weryfikacji;
  const roznica =
    trasy.udokumentowana && trasy.weryfikacji ? trasy.udokumentowana.dlugoscM - trasy.weryfikacji.dlugoscM : null;

  return (
    <div className="flex flex-col gap-6 px-4 pb-40 lg:px-6">
      <header>
        <p className="text-sm font-medium text-slate-600">{pilot.meta.obszar.nazwa}</p>
        <h2 className="text-2xl font-black text-slate-900">Czy dojadę i na ile to pewne?</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Nie mówimy „dostępne”. Mówimy, co wiadomo, skąd i od kiedy, oraz czego nie potwierdzają dostępne dane.
        </p>
      </header>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
          Skąd
          <select
            value={start.id}
            onChange={(e) => {
              setStartId(e.target.value);
              setWyborTrasy(null);
              setFokus((f) => f + 1);
            }}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900"
          >
            {budynki.map((b) => (
              <option key={b.id} value={b.id}>
                {b.adres}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
          Dokąd
          <select
            value={cel.id}
            onChange={(e) => {
              setCelId(e.target.value);
              setWyborTrasy(null);
              setFokus((f) => f + 1);
            }}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900"
          >
            {[...uslugiWgKategorii.entries()].map(([k, lista]) => (
              <optgroup key={k} label={KATEGORIA_LABEL[k]}>
                {lista.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nazwa}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="font-medium text-slate-700">Preferencje trasy</legend>
          {PROFILE.map((p) => (
            <label key={p.id} className="flex items-start gap-2 text-slate-800">
              <input
                type="radio"
                name="profil"
                value={p.id}
                checked={profilId === p.id}
                onChange={() => {
                  setProfilId(p.id);
                  setWyborTrasy(null);
                }}
                className="mt-1 accent-slate-900"
              />
              <span>{p.nazwa}</span>
            </label>
          ))}
        </fieldset>
      </form>

      <section aria-labelledby="wynik-tytul" className="grid gap-3 md:grid-cols-2" aria-live="polite">
        <h3 id="wynik-tytul" className="sr-only">
          Wynik
        </h3>
        <div className={`rounded-2xl border p-4 ${trasy.udokumentowana ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <p className="text-xs font-semibold uppercase text-slate-600">{TRASA_LABEL.udokumentowana}</p>
          {trasy.udokumentowana ? (
            <>
              <p className="text-3xl font-black text-slate-900">{m(trasy.udokumentowana.dlugoscM)}</p>
              <p className="text-sm text-slate-700">Każda wymagana cecha ma źródło i spełnia Twoje preferencje.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-900">Nie można potwierdzić trasy</p>
              {trasy.weryfikacji && trasy.weryfikacji.niewiadome.length > 0 && (
                <p className="text-sm text-slate-700">
                  Brakuje informacji o {miejscaNaTrasie(trasy.weryfikacji, pilot, oceny).filter((x) => x.rodzaj !== "utrudnienie").length}{" "}
                  {odmiana(miejscaNaTrasie(trasy.weryfikacji, pilot, oceny).filter((x) => x.rodzaj !== "utrudnienie").length, ["miejscu", "miejscach", "miejscach"])}{" "}
                  po drodze. To nie znaczy, że przejścia nie ma, tylko że nikt go nie opisał.
                </p>
              )}
            </>
          )}
        </div>
        <div className={`rounded-2xl border p-4 ${trasy.weryfikacji ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
          <p className="text-xs font-semibold uppercase text-slate-600">{TRASA_LABEL.weryfikacji}</p>
          {trasy.weryfikacji ? (
            <>
              <p className="text-3xl font-black text-slate-900">{m(trasy.weryfikacji.dlugoscM)}</p>
              <p className="text-sm text-slate-700">
                {trasy.weryfikacji.niewiadome.length === 0
                  ? "Każde miejsce na trasie jest opisane."
                  : "Prowadzi też przez miejsca bez informacji; wymieniamy je poniżej."}
                {roznica !== null && roznica > 1 && <> Trasa udokumentowana jest dłuższa o {m(roznica)}.</>}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-slate-900">
              Brak przejścia dla wybranych preferencji, nawet licząc miejsca bez informacji jako przejezdne
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="opis-tytul" className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="opis-tytul" className="text-sm font-bold text-slate-800">
            Opis trasy
          </h3>
          <OdczytajNaGlos tekst={opis} />
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-800">{opis}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div
          role="region"
          aria-label="Mapa trasy. Ta sama informacja jest w opisie trasy i na liście miejsc obok."
          className="h-[460px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:h-[560px]"
        >
          <MapaNiewiedzy
            pilot={pilot}
            oceny={oceny}
            widoczne={WIDOCZNE}
            wybrane={BEZ_WYBORU}
            czolo={BEZ_CZOLA}
            onWybierz={nic}
            trasa={trasaNaMapie}
            fokusTrasy={fokus}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:h-[560px] lg:overflow-y-auto">
          <h3 className="mb-2 text-sm font-bold text-slate-800">Miejsca na trasie</h3>
          <div role="group" aria-label="Która trasa" className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["udokumentowana", "weryfikacji"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={pokazana === k}
                disabled={!trasy[k]}
                onClick={() => setWyborTrasy(k)}
                className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium disabled:opacity-40 ${
                  pokazana === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                {k === "udokumentowana" ? "udokumentowana" : "wymagająca weryfikacji"}
              </button>
            ))}
          </div>
          {wybrana ? (
            <ListaOdcinkow trasa={wybrana} pilot={pilot} oceny={oceny} weryfikacje={weryfikacje} />
          ) : (
            <p className="mt-3 text-sm text-slate-600">Tej trasy nie ma dla wybranych preferencji.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ListaOdcinkow({
  trasa,
  pilot,
  oceny,
  weryfikacje,
}: {
  trasa: Trasa;
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  weryfikacje: Weryfikacja[];
}) {
  const miejsca = miejscaNaTrasie(trasa, pilot, oceny);
  const pozostale = trasa.odcinki.length - miejsca.length;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs text-slate-600">
        {m(trasa.dlugoscM)}, {trasa.odcinki.length} {odmiana(trasa.odcinki.length, ["odcinek", "odcinki", "odcinków"])} w OSM.
      </p>
      <ol className="flex flex-col gap-2">
        {miejsca.map((mm) => {
          const stany = stanOdcinka(mm.odcinek, pilot.obserwacje, weryfikacje);
          return (
            <li
              key={mm.odcinek.id}
              className={`rounded-lg border p-2.5 ${
                mm.rodzaj === "utrudnienie" ? "border-amber-200 bg-amber-50" : mm.rodzaj === "sprzeczne" ? "border-fuchsia-200 bg-fuchsia-50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{lokalizacja(mm.odcinek, pilot)}</p>
              <p className="text-xs text-slate-600">
                {mm.rodzaj === "utrudnienie" ? "utrudnienie" : mm.rodzaj === "sprzeczne" ? "sprzeczne źródła" : "brak informacji"}
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {mm.cechy.map((c) => (
                  <li key={c} className="text-xs text-slate-700">
                    {CECHA_LABEL[c]}: <strong>{formatujWartosc(c, stany[c].wartosc)}</strong> · {STATUS_LABEL[stany[c].status]}
                    {stany[c].dowody.length === 0 && (
                      <span className="block pl-2 text-slate-600">żadne źródło nie opisuje tej cechy</span>
                    )}
                    {stany[c].dowody.map((d, i) => (
                      <span key={i} className="block pl-2 text-slate-600">
                        {ZRODLO_LABEL[d.zrodlo]}: {formatujWartosc(c, d.wartosc)}, {DATA_LABEL[d.rodzajDaty]} {d.data}
                        {d.przykladowe && " (dane przykładowe)"}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      {pozostale > 0 && (
        <p className="text-xs text-slate-600">
          Pozostałe {pozostale} {odmiana(pozostale, ["odcinek", "odcinki", "odcinków"])}: każda wymagana cecha ma źródło
          (OpenStreetMap z {pilot.meta.pobranoOsm}
          {weryfikacje.some((w) => trasa.odcinki.includes(w.odcinekId)) ? ", kontrola w terenie" : ""} albo jawne
          założenie, np. brak krawężnika poza przejściami) i spełnia preferencje.
        </p>
      )}
    </div>
  );
}

const WIDOCZNE = new Set(KOLEJNOSC_KATEGORII);

const bezSubskrypcji = () => () => {};

function OdczytajNaGlos({ tekst }: { tekst: string }) {
  const [mowi, setMowi] = useState(false);
  const dostepne = useSyncExternalStore(
    bezSubskrypcji,
    () => "speechSynthesis" in window,
    () => false,
  );
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  if (!dostepne) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const s = window.speechSynthesis;
        if (mowi) {
          s.cancel();
          setMowi(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(tekst);
        u.lang = "pl-PL";
        u.onend = () => setMowi(false);
        s.cancel();
        s.speak(u);
        setMowi(true);
      }}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {mowi ? "Zatrzymaj" : "Odczytaj na głos"}
    </button>
  );
}
