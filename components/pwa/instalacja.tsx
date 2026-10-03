"use client";

// Zachęta do dodania AgloSat na ekran telefonu. Chrome i Edge dają własne zdarzenie z gotowym oknem,
// Safari na iPhonie nie daje żadnego, więc tam zostaje instrukcja. W trybie aplikacji karta znika.

import { useEffect, useState, useSyncExternalStore } from "react";
import { ShareIcon, SmartphoneIcon, XIcon } from "lucide-react";

type ZdarzenieInstalacji = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KLUCZ_UKRYCIA = "aglosat:instalacja-odlozona";

const bezSubskrypcji = () => () => {};

function wTrybieAplikacji(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS nie zna display-mode w tym znaczeniu i ma własną flagę.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function naIphonie(): boolean {
  const ua = navigator.userAgent;
  // iPad z iPadOS 13+ podaje się za Macintosha, odróżnia go dotyk.
  return /iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function Instalacja() {
  // Na serwerze zakładamy, że karty nie ma: inaczej mignęłaby przed hydratacją.
  const wAplikacji = useSyncExternalStore(bezSubskrypcji, wTrybieAplikacji, () => true);
  const odlozone = useSyncExternalStore(
    bezSubskrypcji,
    () => localStorage.getItem(KLUCZ_UKRYCIA) === "1",
    () => true,
  );
  const iphone = useSyncExternalStore(bezSubskrypcji, naIphonie, () => false);
  const [zdarzenie, setZdarzenie] = useState<ZdarzenieInstalacji | null>(null);
  const [zainstalowane, setZainstalowane] = useState(false);
  const [schowane, setSchowane] = useState(false);

  useEffect(() => {
    if (wAplikacji || odlozone) return;
    const gotoweDoInstalacji = (e: Event) => {
      // Bez preventDefault przeglądarka pokaże własny pasek, a zdarzenie przepadnie.
      e.preventDefault();
      setZdarzenie(e as ZdarzenieInstalacji);
    };
    const poInstalacji = () => setZainstalowane(true);
    window.addEventListener("beforeinstallprompt", gotoweDoInstalacji);
    window.addEventListener("appinstalled", poInstalacji);
    return () => {
      window.removeEventListener("beforeinstallprompt", gotoweDoInstalacji);
      window.removeEventListener("appinstalled", poInstalacji);
    };
  }, [wAplikacji, odlozone]);

  if (wAplikacji || odlozone || zainstalowane || schowane) return null;
  // Bez zdarzenia od przeglądarki zostaje tylko instrukcja dla Safari; gdzie indziej nie ma czego pokazywać.
  if (!zdarzenie && !iphone) return null;

  return (
    <section aria-labelledby="instalacja-tytul" className="relative rounded-2xl border border-slate-300 bg-white p-4">
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(KLUCZ_UKRYCIA, "1");
          setSchowane(true);
        }}
        aria-label="Nie pokazuj zachęty do instalacji"
        className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
      <div className="flex items-start gap-3 pr-10">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <SmartphoneIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="instalacja-tytul" className="text-base font-bold text-slate-900">
            Dodaj AgloSat do telefonu
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Otworzysz go jednym dotknięciem, a raz wczytane dane działają też bez internetu.
          </p>
        </div>
      </div>

      {zdarzenie ? (
        <button
          type="button"
          onClick={async () => {
            await zdarzenie.prompt();
            await zdarzenie.userChoice;
            // Zdarzenia nie da się użyć drugi raz; o skutku powie „appinstalled”.
            setZdarzenie(null);
          }}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-base font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Zainstaluj
        </button>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-800">
          <ShareIcon className="size-4 shrink-0" aria-hidden />
          <span>
            W Safari dotknij <strong>Udostępnij</strong>, potem <strong>Do ekranu początkowego</strong>.
          </span>
        </p>
      )}
    </section>
  );
}
