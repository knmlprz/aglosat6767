import Link from "next/link";
import { ArrowRight, Eye, Network, UserCheck } from "lucide-react";

// Strona główna: teza, trzy role, skrajny przypadek, mianownik i stan prototypu.
// Liczby przychodzą z pilot.json (czytane przy budowaniu), nie są wpisane ręcznie.

export type LiczbyStrony = {
  obszar: string;
  pobranoOsm: string;
  relacje: number;
  bezUdokumentowanej: number;
  niewiadome: number;
  sprzeczne: number;
  odcinki: number;
  miejsceUslugi: number;
  miejscDoKontroli: number;
  przypadek: {
    start: string;
    cel: string;
    pieszoM: number;
    weryfikacjiM: number;
    cecha: string;
  } | null;
  dataNalotu: string | null;
  /** Nazwa modelu, jeśli klasy dla wycinków pochodzą z prawdziwego modelu. */
  model: string | null;
  /** Strefy zmian policzone z prawdziwych scen Sentinel-2 (nie ilustracja). */
  sentinel: { strefy: number; pary: string } | null;
  /** Ocena modelu na zbiorze testowym, gdy są etykiety ludzi. */
  ocena: {
    model: string;
    wersjaPromptu: number;
    wycinki: number;
    osoby: number;
    trafnosc: number;
    zgodnoscLudzi: number | null;
    precyzjaCiagly: number | null;
    grozne: number;
    pary: number;
    trafnoscV1: number | null;
  } | null;
};

const ROLE = [
  {
    ikona: Eye,
    tytul: "Obraz z góry zawęża listę",
    opis: "Model na ortofotomapie potwierdza, gdzie ciąg pieszy widać, i mówi, czego z góry nie widać. Przerwy znajduje rzadko, więc ich nie obiecujemy. Sentinel-2 daje sygnał zmiany terenu między dwiema datami.",
  },
  {
    ikona: Network,
    tytul: "Graf sieci pieszej nadaje im wagę",
    opis: "Dla każdej niewiadomej liczymy, ile dojść z budynków mieszkalnych do przychodni, aptek i sklepów zależy od tego jednego miejsca.",
  },
  {
    ikona: UserCheck,
    tytul: "Człowiek rozstrzyga na miejscu",
    opis: "Mieszkaniec zgłasza stan ze zdjęciem, urząd je przyjmuje albo wysyła kontrolę. Decyzja zmienia status cechy, a trasy przeliczają się od razu.",
  },
];

const DZIALA = [
  "graf sieci pieszej z OpenStreetMap, każda cecha ze źródłem, datą i statusem",
  "ranking miejsc do kontroli według wpływu na dojścia do usług",
  "trasy dla profilu przeliczane na żywo po kontroli w terenie albo przyjętym zgłoszeniu",
  "zgłoszenia mieszkańców ze zdjęciem i ich akceptacja po stronie urzędu",
  "wycinki ortofotomapy GUGiK jako dowód obrazowy",
  "trasa kontroli na zadany czas",
  "widok mieszkańca z opisem tekstowym trasy",
];
/** Gdy wszystkie warstwy są z prawdziwych danych: zamiast pustej listy „przykładowych” mówimy, czego prototyp nie rozstrzyga. */
const OGRANICZENIA = [
  "próbkę do oceny modelu opisały osoby z zespołu, nie audytorzy dostępności",
  "kontrole i zgłoszenia zostają w przeglądarce na czas sesji, bez wspólnej bazy",
  "waga budynku to powierzchnia zabudowy × kondygnacje, przybliżenie liczby mieszkańców",
  "Sentinel-2 daje sygnał zmiany terenu, nie wykrywa samej infrastruktury pieszej",
];
const ZAPROJEKTOWANE = [
  "trwały zapis kontroli i zgłoszeń, wielu użytkowników",
  "kolejne miasta: nowy obszar w konfiguracji potoku",
  "inna infrastruktura z niewiadomymi, ta sama metoda: drogi rowerowe, windy i rampy w przejściach podziemnych, dostępność przystanków",
];

const proc = (a: number, b: number) => `${Math.round((100 * a) / Math.max(b, 1))}%`;

export function LandingPage({ liczby }: { liczby: LiczbyStrony }) {
  return (
    <div className="bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="text-lg font-black tracking-tight">
            AgloSat
          </Link>
          <nav aria-label="Główna" className="flex gap-1 text-sm font-medium">
            <Link href="/app/planista" className="rounded-lg px-3 py-2 hover:bg-slate-100">
              Planista
            </Link>
            <Link href="/app/mieszkaniec" className="rounded-lg px-3 py-2 hover:bg-slate-100">
              Mieszkaniec
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 lg:px-6 lg:pt-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pilot: {liczby.obszar}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Przeszkody, których miasto nie ma na mapie
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-700">
            AgloSat wskazuje miastu, które niewiadome o infrastrukturze pieszej (chodnikach, przejściach, krawężnikach,
            schodach) sprawdzić najpierw, bo od nich zależy najwięcej dojść
            do usług.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/planista"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Panel planisty <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/app/mieszkaniec"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              Czy dotrę? Widok mieszkańca
            </Link>
          </div>
        </section>

        {liczby.przypadek && (
          <section aria-labelledby="przypadek" className="border-y border-slate-200 bg-slate-50">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[1fr_1.2fr] lg:px-6">
              <div>
                <h2 id="przypadek" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Jeden przypadek
                </h2>
                <p className="mt-2 text-2xl font-bold leading-snug">
                  Z adresu {liczby.przypadek.start} do przychodni {liczby.przypadek.cel} jest {liczby.przypadek.pieszoM} m
                  pieszo. Dla wózka nie da się potwierdzić żadnej trasy.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Liczba wartosc={`${liczby.przypadek.pieszoM} m`} opis="pieszo, bez profilu" />
                <Liczba wartosc={`${liczby.przypadek.weryfikacjiM} m`} opis="trasa wymagająca weryfikacji" />
                <Liczba wartosc="1" opis={`miejsce bez informacji: ${liczby.przypadek.cecha}`} />
                <p className="text-sm text-slate-600 sm:col-span-3">
                  Od tego jednego przejścia zależą dojścia do {liczby.miejsceUslugi} usług. Obniżony krawężnik daje trasę
                  udokumentowaną; wysoki odbiera przejście całkowicie. Rozstrzyga kontrola w terenie.
                </p>
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="mianownik" className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
          <h2 id="mianownik" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            To nie wyjątek
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Liczba
              wartosc={proc(liczby.bezUdokumentowanej, liczby.relacje)}
              opis={`z ${liczby.relacje} relacji budynek–usługa nie ma trasy udokumentowanej dla wózka`}
            />
            <Liczba
              wartosc={String(liczby.niewiadome)}
              opis={`z ${liczby.odcinki} odcinków sieci pieszej nie ma rozstrzygnięcia dla profilu (w tym ${liczby.sprzeczne} ze sprzecznymi źródłami)`}
            />
            <Liczba wartosc={String(liczby.miejscDoKontroli)} opis="miejsc do kontroli, uporządkowanych według wpływu na dojścia" />
          </div>
          <p className="mt-3 text-xs text-slate-600">
            OpenStreetMap, dane pobrane {liczby.pobranoOsm}. Profil: bez schodów, krawężnik do 3 cm, utwardzona nawierzchnia.
            Brak informacji to nie bariera: nie wiemy, czy przejście jest. Założenie: krawężnik sprawdzamy tylko na
            przejściach, bo tam opisuje go OSM; obniżeń przy wjazdach i końcach chodników nie ma w danych.
          </p>
        </section>

        {liczby.ocena && (
          <section aria-labelledby="model" className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
              <h2 id="model" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Model wizyjny, sprawdzony na próbce testowej
              </h2>
              <p className="mt-2 max-w-3xl text-2xl font-bold leading-snug">
                Model ocenia na zdjęciu ciągłość ciągu pieszego prawie tak zgodnie z człowiekiem, jak dwie osoby ze sobą.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Liczba wartosc={proc1(liczby.ocena.trafnosc)} opis="zgodność modelu z człowiekiem" />
                <Liczba
                  wartosc={liczby.ocena.zgodnoscLudzi === null ? "brak danych" : proc1(liczby.ocena.zgodnoscLudzi)}
                  opis={`zgodność ${liczby.ocena.osoby === 2 ? "dwóch osób" : `${liczby.ocena.osoby} osób`} między sobą: punkt odniesienia`}
                />
                <Liczba
                  wartosc={liczby.ocena.precyzjaCiagly === null ? "brak danych" : proc1(liczby.ocena.precyzjaCiagly)}
                  opis="gdy model mówi „ciągły”, człowiek się zgadza"
                />
              </div>
              <p className="mt-3 max-w-4xl text-xs text-slate-600">
                {liczby.ocena.model}, prompt v{liczby.ocena.wersjaPromptu}
                {liczby.ocena.trafnoscV1 !== null ? ` (pierwsza wersja: ${proc1(liczby.ocena.trafnoscV1)})` : ""};{" "}
                {liczby.ocena.wycinki} wycinków ortofotomapy GUGiK nieużywanych przy poprawianiu promptu, opisanych niezależnie przez{" "}
                {liczby.ocena.osoby === 2 ? "dwie osoby" : `${liczby.ocena.osoby} osoby`} z zespołu. Groźne pomyłki (model „ciągły”, człowiek widzi przerwę albo nic):{" "}
                {liczby.ocena.grozne} z {liczby.ocena.pary}. Model wskazuje, gdzie spojrzeć; o stanie miejsca rozstrzyga kontrola
                w terenie.
              </p>
            </div>
          </section>
        )}

        <section aria-labelledby="role" className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
            <h2 id="role" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Trzy role, zawsze w tej kolejności
            </h2>
            <ol className="mt-4 grid gap-4 md:grid-cols-3">
              {ROLE.map((r, i) => (
                <li key={r.tytul} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <r.ikona className="size-5" aria-hidden />
                    <span className="text-sm font-semibold">{i + 1}.</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{r.tytul}</h3>
                  <p className="mt-1 text-sm text-slate-600">{r.opis}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="stan" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
            <h2 id="stan" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Stan prototypu
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Lista
                tytul="Działa"
                elementy={[
                  ...DZIALA,
                  ...(liczby.model ? [`klasyfikacja wycinków modelem wizyjnym (${liczby.model})`] : []),
                  ...(liczby.sentinel ? [`strefy zmian z Sentinel-2: ${liczby.sentinel.strefy}, pary scen ${liczby.sentinel.pary}`] : []),
                ]}
              />
              {liczby.model && liczby.sentinel ? (
                <Lista tytul="Ograniczenia, mówimy wprost" elementy={OGRANICZENIA} />
              ) : (
                <Lista
                  tytul="Dane przykładowe, oznaczone w interfejsie"
                  elementy={[
                    ...(liczby.model ? [] : ["klasy zwracane przez model wizyjny dla wycinków"]),
                    ...(liczby.sentinel ? [] : ["strefa zmian Sentinel-2 (jedna para scen)"]),
                  ]}
                />
              )}
              <Lista tytul="Zaprojektowane, poza prototypem" elementy={ZAPROJEKTOWANE} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-600 lg:px-6">
          Dane: © współtwórcy OpenStreetMap (ODbL)
          {liczby.dataNalotu && <>; ortofotomapa GUGiK (Geoportal), nalot {liczby.dataNalotu}</>}; podkład mapy: Esri World
          Imagery.
        </div>
      </footer>
    </div>
  );
}

/** Ułamek 0–1 jako procent. */
const proc1 = (x: number) => `${Math.round(100 * x)}%`;

function Liczba({ wartosc, opis }: { wartosc: string; opis: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-3xl font-black">{wartosc}</div>
      <div className="mt-1 text-sm text-slate-600">{opis}</div>
    </div>
  );
}

function Lista({ tytul, elementy }: { tytul: string; elementy: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">{tytul}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {elementy.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
