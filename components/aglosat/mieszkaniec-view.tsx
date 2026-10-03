"use client";

// Widok mieszkańca jako aplikacja na telefon, nie pulpit: jedno pytanie na ekranie, duże pola wyboru,
// odpowiedź przed szczegółami, mapa jako dodatek do opisu. Słownictwo bez zmian:
// nie mówimy „dostępne”, mówimy co jest udokumentowane, skąd i od kiedy.
// Nie pytamy o niepełnosprawność, tylko o preferencje trasy.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Maximize2Icon,
  Minimize2Icon,
  SatelliteIcon,
  Share2Icon,
  Volume2Icon,
} from "lucide-react";
import { useAglosat } from "@/components/aglosat/stan-aglosat";
import { WyborMiejsca, type PozycjaWyboru } from "@/components/aglosat/wybor-miejsca";
import { FormularzZgloszenia } from "@/components/aglosat/formularz-zgloszenia";
import { Instalacja } from "@/components/pwa/instalacja";
import { ocenWszystkie, trasyRelacji, zbudujGraf, type Trasa } from "@/lib/aglosat/routing.ts";
import { PROFILE } from "@/lib/aglosat/profile.ts";
import { stanOdcinka } from "@/lib/aglosat/status.ts";
import { lokalizacja, odlegloscM } from "@/lib/aglosat/opis.ts";
import { miejscaNaTrasie, opisTrasy } from "@/lib/aglosat/opis-trasy.ts";
import type { Cecha, KategoriaUslugi, Odcinek, Pilot, Weryfikacja, Zgloszenie } from "@/lib/aglosat/types.ts";
import { ETYKIETA_STANU } from "@/lib/aglosat/zgloszenia.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { KOLEJNOSC_KATEGORII } from "@/lib/aglosat/styl.ts";
import {
  CECHA_LABEL,
  DATA_LABEL,
  KATEGORIA_LABEL,
  STATUS_LABEL,
  ZRODLO_LABEL,
  formatujWartosc,
  odmiana,
} from "@/lib/aglosat/vocabulary.ts";

const MapaNiewiedzy = dynamic(
  () => import("@/components/aglosat/mapa-niewiedzy").then((m) => m.MapaNiewiedzy),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-800" aria-hidden /> },
);

const WIDOCZNE = new Set(KOLEJNOSC_KATEGORII);
const BEZ_WYBORU: string[] = [];
const BEZ_CZOLA: { odcinekId: string; pozycja: number }[] = [];
const nic = () => {};

const m = (x: number) => `${Math.round(x)} m`;
/** Spacerem 4 km/h, czyli tyle, ile przyjmują kalkulatory tras pieszych. Z wózkiem bywa wolniej. */
const minuty = (metry: number) => Math.max(1, Math.round(metry / 66.7));

export function MieszkaniecView() {
  const { wczytanie, weryfikacje, zgloszenia, dodajZgloszenia } = useAglosat();
  const pilot = wczytanie.stan === "gotowe" ? wczytanie.pilot : null;

  const [startId, setStartId] = useState<string | null>(null);
  const [celId, setCelId] = useState<string | null>(null);
  const [profilId, setProfilId] = useState(PROFILE[0].id);
  // null = domyślnie: udokumentowana, jeśli istnieje. Zmiana startu, celu lub preferencji wraca do domyślnej.
  const [wyborTrasy, setWyborTrasy] = useState<"udokumentowana" | "weryfikacji" | null>(null);
  const [fokus, setFokus] = useState(1);
  const [otwartyWybor, setOtwartyWybor] = useState<"start" | "cel" | null>(null);
  const [pelnaMapa, setPelnaMapa] = useState(false);
  const [komunikat, setKomunikat] = useState("");
  const [zglaszane, setZglaszane] = useState<{ odcinek: Odcinek; cechy: Cecha[] } | null>(null);

  const profil = PROFILE.find((p) => p.id === profilId)!;
  const domyslny = pilot?.kandydaci[0];
  const start = pilot?.budynki.find((b) => b.id === (startId ?? domyslny?.budynekId)) ?? null;
  const cel = pilot?.uslugi.find((u) => u.id === (celId ?? domyslny?.uslugaId)) ?? null;

  const graf = useMemo(() => (pilot ? zbudujGraf(pilot.odcinki) : null), [pilot]);
  const oceny = useMemo(
    () => (pilot ? ocenWszystkie(pilot.odcinki, pilot.obserwacje, weryfikacje, profil, zgloszenia) : null),
    [pilot, weryfikacje, profil, zgloszenia],
  );
  const trasy = useMemo(
    () => (graf && oceny && start && cel ? trasyRelacji(graf, oceny, start.wezel, cel.wezel) : null),
    [graf, oceny, start, cel],
  );

  const budynki = useMemo(
    () => (pilot?.budynki ?? []).filter((b) => b.adres),
    [pilot],
  );
  const pozycjeStartu: PozycjaWyboru[] = useMemo(
    () =>
      [...budynki]
        .sort((a, b) => a.adres!.localeCompare(b.adres!, "pl", { numeric: true }))
        .map((b) => ({ id: b.id, tytul: b.adres! })),
    [budynki],
  );
  // Grupy zawsze w tej samej kolejności co w słowniku, a w grupie od najbliższego celu.
  const pozycjeCelu: PozycjaWyboru[] = useMemo(() => {
    if (!pilot || !start) return [];
    const kategorie = Object.keys(KATEGORIA_LABEL) as KategoriaUslugi[];
    return kategorie.flatMap((k) =>
      pilot.uslugi
        .filter((u) => u.kategoria === k)
        .map((u) => ({ u, d: odlegloscM([start.lat, start.lon], [u.lat, u.lon]) }))
        .sort((a, b) => a.d - b.d)
        .map(({ u, d }) => ({
          id: u.id,
          tytul: u.nazwa,
          podtytul: `${m(d)} w linii prostej`,
          grupa: KATEGORIA_LABEL[k],
        })),
    );
  }, [pilot, start]);

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

  // Mapa na pełnym ekranie zachowuje się jak okno: Escape zamyka, tło nie przewija się pod spodem.
  useEffect(() => {
    if (!pelnaMapa) return;
    const poprzednie = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const naKlawisz = (e: KeyboardEvent) => e.key === "Escape" && setPelnaMapa(false);
    window.addEventListener("keydown", naKlawisz);
    return () => {
      document.body.style.overflow = poprzednie;
      window.removeEventListener("keydown", naKlawisz);
    };
  }, [pelnaMapa]);

  if (wczytanie.stan === "blad") {
    return (
      <Ramka>
        <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          Nie udało się wczytać danych ({wczytanie.komunikat}). Jeśli jesteś bez internetu, otwórz aplikację raz
          z siecią — dane zostaną na telefonie.
        </div>
      </Ramka>
    );
  }
  if (!pilot || !oceny || !trasy || !start || !cel) {
    return (
      <Ramka>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-busy="true" aria-label="Wczytywanie danych" />
      </Ramka>
    );
  }

  const ostatniaKontrola = weryfikacje.length
    ? [...weryfikacje].sort((a, b) => b.dataKontroli.localeCompare(a.dataKontroli))[0].dataKontroli
    : null;
  const opis = opisTrasy(pilot, start, cel, trasy, oceny, ostatniaKontrola);
  const pokazana = wyborTrasy && trasy[wyborTrasy] ? wyborTrasy : trasy.udokumentowana ? "udokumentowana" : "weryfikacji";
  const wybrana: Trasa | null = pokazana === "udokumentowana" ? trasy.udokumentowana : trasy.weryfikacji;
  const miejscaWeryfikacji = trasy.weryfikacji ? miejscaNaTrasie(trasy.weryfikacji, pilot, oceny) : [];
  const bezInformacji = miejscaWeryfikacji.filter((x) => x.rodzaj !== "utrudnienie").length;

  const wynik = trasy.udokumentowana
    ? {
        ton: "dobry" as const,
        naglowek: "Trasa udokumentowana",
        tytul: "Tak, cała droga ma źródła",
        tresc: "Każda cecha, której wymagają Twoje preferencje, jest opisana i je spełnia.",
        dlugoscM: trasy.udokumentowana.dlugoscM,
      }
    : trasy.weryfikacji
      ? {
          ton: "niepewny" as const,
          naglowek: "Wymaga sprawdzenia",
          tytul: "Nie wiemy na pewno",
          tresc: `Po drodze ${odmiana(bezInformacji, ["jest", "są", "jest"])} ${bezInformacji} ${odmiana(bezInformacji, [
            "miejsce",
            "miejsca",
            "miejsc",
          ])} bez informacji. To nie znaczy, że przejścia nie ma — znaczy, że nikt go nie opisał.`,
          dlugoscM: trasy.weryfikacji.dlugoscM,
        }
      : {
          ton: "zly" as const,
          naglowek: "Brak przejścia",
          tytul: "Nie znaleźliśmy drogi",
          tresc:
            "Dla tych preferencji nie ma przejścia, nawet gdy policzymy miejsca bez informacji jako przejezdne.",
          dlugoscM: null,
        };

  const tony = {
    dobry: "border-emerald-300 bg-emerald-50",
    niepewny: "border-amber-300 bg-amber-50",
    zly: "border-rose-300 bg-rose-50",
  };

  const zmienStart = (id: string) => {
    setStartId(id);
    setWyborTrasy(null);
    setFokus((f) => f + 1);
  };

  const udostepnij = async () => {
    const dane = { title: "AgloSat — czy dojadę?", text: opis };
    if (navigator.share) {
      try {
        await navigator.share(dane);
      } catch {
        // Użytkownik zrezygnował; nie ma o czym informować.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(opis);
      setKomunikat("Opis trasy skopiowany do schowka.");
    } catch {
      setKomunikat("Nie udało się skopiować opisu.");
    }
  };

  return (
    <Ramka>
      <h1 className="text-[1.75rem] font-black leading-tight text-slate-900">Czy dojadę?</h1>
      <p className="mt-1 text-sm text-slate-700">
        Mówimy, co o drodze wiadomo, skąd i od kiedy — oraz czego nikt jeszcze nie sprawdził.
      </p>

      <section aria-labelledby="wybor-tytul" className="mt-4">
        <h2 id="wybor-tytul" className="sr-only">
          Skąd i dokąd
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
          <WierszWyboru
            etykieta="Skąd"
            wartosc={start.adres ?? "budynek mieszkalny"}
            onClick={() => setOtwartyWybor("start")}
          />
          <WierszWyboru
            etykieta="Dokąd"
            wartosc={cel.nazwa}
            podtytul={KATEGORIA_LABEL[cel.kategoria]}
            onClick={() => setOtwartyWybor("cel")}
          />
        </div>

        <details className="group mt-2 overflow-hidden rounded-2xl border border-slate-300 bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-600">Preferencje trasy</span>
              <span className="block text-base font-semibold text-slate-900">{profil.nazwa}</span>
            </span>
            <ChevronDownIcon
              className="size-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden
            />
          </summary>
          <fieldset className="border-t border-slate-200 px-4 py-3">
            <legend className="sr-only">Preferencje trasy</legend>
            {PROFILE.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="radio"
                  name="profil"
                  value={p.id}
                  checked={profilId === p.id}
                  onChange={() => {
                    setProfilId(p.id);
                    setWyborTrasy(null);
                  }}
                  className="mt-1 size-5 shrink-0 accent-slate-900"
                />
                <span>
                  <span className="block text-base font-semibold text-slate-900">{p.nazwa}</span>
                  <span className="block text-sm text-slate-600">{p.opis}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </details>
      </section>

      <p aria-live="polite" className={komunikat ? "mt-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white" : "sr-only"}>
        {komunikat}
      </p>

      <section aria-labelledby="wynik-tytul" aria-live="polite" className="mt-4">
        <h2 id="wynik-tytul" className="sr-only">
          Odpowiedź
        </h2>
        <div className={`rounded-2xl border p-4 ${tony[wynik.ton]}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{wynik.naglowek}</p>
          <p className="mt-1 text-2xl font-black leading-tight text-slate-900">{wynik.tytul}</p>
          {wynik.dlugoscM !== null && (
            <p className="mt-2 text-slate-900">
              <span className="text-3xl font-black">{m(wynik.dlugoscM)}</span>
              <span className="ml-2 text-base font-semibold text-slate-700">
                ok. {minuty(wynik.dlugoscM)} min spacerem
              </span>
            </p>
          )}
          <p className="mt-2 text-sm text-slate-800">{wynik.tresc}</p>
        </div>

        <div role="group" aria-label="Którą trasę pokazać" className="mt-2 grid grid-cols-2 gap-2">
          {(["udokumentowana", "weryfikacji"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={pokazana === k}
              disabled={!trasy[k]}
              onClick={() => {
                setWyborTrasy(k);
                setFokus((f) => f + 1);
              }}
              className={`min-h-16 rounded-xl border px-3 py-2 text-left disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                pokazana === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide">
                {k === "udokumentowana" ? "udokumentowana" : "do sprawdzenia"}
              </span>
              <span className="block text-lg font-black">{trasy[k] ? m(trasy[k]!.dlugoscM) : "brak"}</span>
            </button>
          ))}
        </div>

        {/* flex, a nie siatka: bez syntezy mowy zostaje jeden przycisk i ma zająć całą szerokość */}
        <div className="mt-2 flex gap-2">
          <OdczytajNaGlos tekst={opis} />
          <button
            type="button"
            onClick={udostepnij}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Share2Icon className="size-5" aria-hidden />
            Udostępnij
          </button>
        </div>
      </section>

      <section aria-labelledby="opis-tytul" className="mt-4 rounded-2xl border border-slate-300 bg-white p-4">
        <h2 id="opis-tytul" className="text-sm font-bold uppercase tracking-wide text-slate-600">
          Opis trasy
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-900">{opis}</p>
      </section>

      <section className="mt-4">
        <h2 className="sr-only">Mapa trasy</h2>
        <div
          role="region"
          aria-label="Mapa trasy. Ta sama informacja jest w opisie trasy i na liście miejsc poniżej."
          className={
            pelnaMapa
              ? "fixed inset-0 z-40 bg-slate-900"
              : "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-300"
          }
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
          <button
            type="button"
            onClick={() => setPelnaMapa((p) => !p)}
            className="absolute right-3 z-[1000] flex min-h-11 items-center gap-2 rounded-xl bg-white/95 px-3 text-sm font-semibold text-slate-900 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            style={{ top: pelnaMapa ? "max(0.75rem, env(safe-area-inset-top))" : "0.75rem" }}
          >
            {pelnaMapa ? <Minimize2Icon className="size-4" aria-hidden /> : <Maximize2Icon className="size-4" aria-hidden />}
            {pelnaMapa ? "Zamknij mapę" : "Powiększ"}
          </button>
        </div>
        {!pelnaMapa && (
          <p className="mt-1 text-xs text-slate-600">
            Mapa jest dodatkiem. Wszystko, co na niej widać, jest też w opisie trasy i na liście miejsc.
          </p>
        )}
      </section>

      <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="flex-1 text-base font-bold text-slate-900">
            Miejsca na trasie{wybrana ? ` (${miejscaNaTrasie(wybrana, pilot, oceny).length})` : ""}
          </span>
          <ChevronDownIcon
            className="size-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="border-t border-slate-200 p-4">
          {wybrana ? (
            <ListaOdcinkow
              trasa={wybrana}
              pilot={pilot}
              oceny={oceny}
              weryfikacje={weryfikacje}
              zgloszenia={zgloszenia}
              naZgloszenie={(odcinek, cechy) => setZglaszane({ odcinek, cechy })}
            />
          ) : (
            <p className="text-sm text-slate-700">Tej trasy nie ma dla wybranych preferencji.</p>
          )}
        </div>
      </details>

      <details className="group mt-2 overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="flex-1 text-base font-bold text-slate-900">Skąd to wiemy</span>
          <ChevronDownIcon
            className="size-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <ul className="flex flex-col gap-2 border-t border-slate-200 p-4 text-sm text-slate-800">
          <li>Obszar pilota: {pilot.meta.obszar.nazwa}.</li>
          <li>Sieć piesza, nawierzchnie i usługi: OpenStreetMap, dane pobrane {pilot.meta.pobranoOsm}.</li>
          <li>Kontrole w terenie: {ostatniaKontrola ? `ostatnia ${ostatniaKontrola}` : "brak w tej sesji"}.</li>
          <li>
            Zgłoszenia mieszkańców liczą się jako źródło dopiero wtedy, gdy urząd je obejrzy i przyjmie. Do tego czasu
            są widoczne przy miejscu, ale trasy zostają bez zmian.
          </li>
          <li>Brak danych nigdy nie staje się „przejezdne”: nieopisana cecha zostaje niewiadomą.</li>
          <li>© współtwórcy OpenStreetMap (ODbL), podkład mapy: Esri World Imagery.</li>
        </ul>
      </details>

      <div className="mt-4">
        <Instalacja />
      </div>

      <WyborMiejsca
        otwarty={otwartyWybor === "start"}
        naZmiane={(o) => setOtwartyWybor(o ? "start" : null)}
        tytul="Skąd wyruszasz?"
        etykietaSzukania="Szukaj adresu"
        pozycje={pozycjeStartu}
        wybrane={start.id}
        naWybor={zmienStart}
      />
      <WyborMiejsca
        otwarty={otwartyWybor === "cel"}
        naZmiane={(o) => setOtwartyWybor(o ? "cel" : null)}
        tytul="Dokąd chcesz dotrzeć?"
        etykietaSzukania="Szukaj nazwy albo rodzaju miejsca"
        pozycje={pozycjeCelu}
        wybrane={cel.id}
        naWybor={(id) => {
          setCelId(id);
          setWyborTrasy(null);
          setFokus((f) => f + 1);
        }}
      />

      {zglaszane && (
        <FormularzZgloszenia
          otwarty
          naZmiane={(o) => !o && setZglaszane(null)}
          odcinekId={zglaszane.odcinek.id}
          nazwaMiejsca={lokalizacja(zglaszane.odcinek, pilot)}
          cechy={zglaszane.cechy}
          naWyslanie={(z) => {
            dodajZgloszenia(z);
            setKomunikat("Dziękujemy. Zgłoszenie czeka na decyzję urzędu — trasy na razie bez zmian.");
          }}
        />
      )}
    </Ramka>
  );
}

/** Chrom aplikacji: pasek z nazwą, wąska kolumna treści i stopka ze źródłami. */
function Ramka({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <a
        href="#tresc"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Przejdź do treści
      </a>
      <header className="sticky top-0 z-30 bg-slate-900 pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-2">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-white/15">
              <SatelliteIcon className="size-4" aria-hidden />
            </span>
            <span className="text-base font-black tracking-tight">AgloSat</span>
          </Link>
          <Link
            href="/app/planista"
            className="flex min-h-11 items-center rounded-lg px-2 text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Widok urzędu
          </Link>
        </div>
      </header>

      <main
        id="tresc"
        tabIndex={-1}
        className="mx-auto w-full max-w-xl flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 outline-none"
      >
        {children}
      </main>
    </div>
  );
}

function WierszWyboru({
  etykieta,
  wartosc,
  podtytul,
  onClick,
}: {
  etykieta: string;
  wartosc: string;
  podtytul?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left not-first:border-t not-first:border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-600">{etykieta}</span>
        <span className="block text-lg font-bold leading-snug text-slate-900">{wartosc}</span>
        {podtytul && <span className="block text-sm text-slate-600">{podtytul}</span>}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-slate-500" aria-hidden />
      <span className="sr-only">Zmień</span>
    </button>
  );
}

function ListaOdcinkow({
  trasa,
  pilot,
  oceny,
  weryfikacje,
  zgloszenia,
  naZgloszenie,
}: {
  trasa: Trasa;
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  weryfikacje: Weryfikacja[];
  zgloszenia: Zgloszenie[];
  naZgloszenie: (odcinek: Odcinek, cechy: Cecha[]) => void;
}) {
  const miejsca = miejscaNaTrasie(trasa, pilot, oceny);
  const pozostale = trasa.odcinki.length - miejsca.length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-600">
        {m(trasa.dlugoscM)}, {trasa.odcinki.length} {odmiana(trasa.odcinki.length, ["odcinek", "odcinki", "odcinków"])} w OSM.
      </p>
      <ol className="flex flex-col gap-2">
        {miejsca.map((mm) => {
          const stany = stanOdcinka(mm.odcinek, pilot.obserwacje, weryfikacje, zgloszenia);
          const moje = zgloszenia.filter((z) => z.odcinekId === mm.odcinek.id);
          return (
            <li
              key={mm.odcinek.id}
              className={`rounded-xl border p-3 ${
                mm.rodzaj === "utrudnienie"
                  ? "border-amber-300 bg-amber-50"
                  : mm.rodzaj === "sprzeczne"
                    ? "border-fuchsia-300 bg-fuchsia-50"
                    : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className="text-base font-semibold text-slate-900">{lokalizacja(mm.odcinek, pilot)}</p>
              <p className="text-xs text-slate-700">
                {mm.rodzaj === "utrudnienie" ? "utrudnienie" : mm.rodzaj === "sprzeczne" ? "sprzeczne źródła" : "brak informacji"}
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {mm.cechy.map((c) => (
                  <li key={c} className="text-xs text-slate-800">
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

              {moje.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 border-t border-slate-300/70 pt-2">
                  {moje.map((z) => (
                    <li key={z.id} className="text-xs text-slate-800">
                      Twoje zgłoszenie: {CECHA_LABEL[z.cecha]} — <strong>{formatujWartosc(z.cecha, z.wartosc)}</strong>
                      {z.zdjecie && ", ze zdjęciem"} · {ETYKIETA_STANU[z.stan]}
                      {z.uzasadnienie && <span className="block pl-2 text-slate-600">urząd: „{z.uzasadnienie}”</span>}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => naZgloszenie(mm.odcinek, mm.cechy)}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-3 text-base font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <CameraIcon className="size-5" aria-hidden />
                Zgłoś, jak tu jest
              </button>
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
      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <Volume2Icon className="size-5" aria-hidden />
      {mowi ? "Zatrzymaj" : "Przeczytaj"}
    </button>
  );
}
