import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Layers,
  MapPin,
  Menu,
  Sparkles,
  Users,
} from "lucide-react";

const NAV = [
  { label: "Produkt", href: "#produkt" },
  { label: "Mapa", href: "/app/mapa" },
  { label: "O nas", href: "#o-nas" },
  { label: "Kontakt", href: "#kontakt" },
];

const LOGOS = ["Partner A", "Partner B", "Partner C", "Partner D", "Partner E"];

const FEATURES = [
  {
    icon: MapPin,
    eyebrow: "Obszar",
    title: "Mapa aglomeracji",
    description:
      "Placeholder pod sekcję z mapą i granicami administracyjnymi. Podmień tekst i podlinkuj /map.",
  },
  {
    icon: BarChart3,
    eyebrow: "Dane",
    title: "Metryki i wskaźniki",
    description:
      "Miejsce na wykresy, KPI i porównania. Wstaw tu własne komponenty analityczne.",
  },
  {
    icon: Users,
    eyebrow: "Społeczność",
    title: "Profile użytkowników",
    description:
      "Krótki opis segmentów, grup docelowych albo partnerów lokalnych.",
  },
  {
    icon: Layers,
    eyebrow: "Warstwy",
    title: "Wiele perspektyw",
    description:
      "Stub karty pod dodatkowe widoki — np. transport, usługi, demografia.",
  },
];

export function LandingPage() {
  return (
    <div className="overflow-hidden text-gray-950">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-2 bottom-0 rounded-[2rem] bg-gradient-to-br from-[#fff1be] from-30% via-[#ee87cb] via-70% to-[#b060ff] ring-1 ring-black/5 ring-inset" />

        <div className="relative px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <header className="flex items-center justify-between pt-12 sm:pt-16">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Aglometer
              </Link>

              <nav className="hidden items-center gap-1 lg:flex">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-950 transition hover:bg-black/5"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-lg hover:bg-black/5 lg:hidden"
                aria-label="Menu"
              >
                <Menu className="size-5" />
              </button>
            </header>

            <div className="pb-24 pt-16 sm:pb-32 sm:pt-24 md:pb-48 md:pt-32">
              <h1 className="max-w-4xl text-5xl font-medium tracking-tight text-balance sm:text-7xl md:text-8xl">
                Twój nagłówek tutaj.
              </h1>
              <p className="mt-8 max-w-lg text-lg font-medium text-gray-950/75 sm:text-xl">
                Krótki opis produktu albo aglomeracji. Ten landing to pusty
                szablon — podmień copy, obrazki i sekcje kiedy będziesz gotowy.
              </p>
              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-6">
                <Link
                  href="#kontakt"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-gray-800"
                >
                  Zacznij
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-white/60 px-5 py-2.5 text-sm font-medium text-gray-950 shadow-md ring-1 ring-black/10 backdrop-blur transition hover:bg-white/80"
                >
                  Zobacz mapę
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo cloud */}
      <div className="mt-10 px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-gray-400 uppercase"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <main>
        {/* Screenshot / preview */}
        <section
          id="produkt"
          className="bg-gradient-to-b from-white from-50% to-gray-100 py-24 sm:py-32"
        >
          <div className="px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-balance sm:text-5xl">
                Sekcja pod główny podgląd produktu.
              </h2>
              <div className="relative mt-16 aspect-[16/10] overflow-hidden rounded-2xl bg-gray-200 shadow-2xl ring-1 ring-black/10">
                <div className="flex h-full items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Sparkles className="mx-auto size-10 opacity-40" />
                    <p className="mt-3 text-sm">Placeholder — wstaw screenshot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Funkcje
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">
              Miejsce na opis tego, co robisz.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                const span =
                  i === 0
                    ? "lg:col-span-3 lg:rounded-tl-[2rem]"
                    : i === 1
                      ? "lg:col-span-3 lg:rounded-tr-[2rem]"
                      : i === 2
                        ? "lg:col-span-2 lg:rounded-bl-[2rem]"
                        : "lg:col-span-4 lg:rounded-br-[2rem]";

                return (
                  <article
                    key={feature.title}
                    className={`flex flex-col overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 ${span}`}
                  >
                    <div className="mb-6 flex size-10 items-center justify-center rounded-xl bg-gray-100">
                      <Icon className="size-5 text-gray-700" />
                    </div>
                    <p className="font-mono text-xs font-semibold tracking-widest text-gray-500 uppercase">
                      {feature.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-medium tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Dark band */}
        <section
          id="o-nas"
          className="mx-2 mt-2 rounded-[2rem] bg-gray-900 px-6 py-24 text-white lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Więcej
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">
              Ciemna sekcja — np. case study albo CTA pośrodku strony.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10"
                >
                  <p className="font-mono text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Karta {n}
                  </p>
                  <p className="mt-2 text-lg font-medium">
                    Tytuł do uzupełnienia
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Krótki opis. Możesz tu dać testimonial, statystykę albo
                    link do bloga.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer CTA */}
      <footer id="kontakt" className="relative mt-2 px-6 py-20 lg:px-8">
        <div className="absolute inset-2 rounded-[2rem] bg-white/80 ring-1 ring-black/5" />
        <div className="relative mx-auto max-w-7xl text-center">
          <p className="font-mono text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Kontakt
          </p>
          <h2 className="mt-6 text-3xl font-medium tracking-tight sm:text-5xl">
            Gotowy, żeby coś tu postawić?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-gray-500">
            Placeholder pod formularz, e-mail albo przycisk do aplikacji.
          </p>
          <Link
            href="mailto:hello@example.com"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-950 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-gray-800"
          >
            Napisz do nas
            <ArrowRight className="size-4" />
          </Link>
          <p className="mt-16 text-sm text-gray-500">
            © {new Date().getFullYear()} Aglometer. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}
