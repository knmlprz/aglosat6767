"use client";

// Wybór adresu i celu na telefonie: pełny ekran z szukaniem zamiast listy rozwijanej z dwustoma pozycjami.
// Base UI pilnuje pułapki fokusa, Escape i zablokowania tła, więc zostaje tu tylko treść.

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CheckIcon, SearchIcon, XIcon } from "lucide-react";

export type PozycjaWyboru = {
  id: string;
  tytul: string;
  podtytul?: string;
  grupa?: string;
};

/** Szukanie ma działać tak samo dla „Młodości” i „mlodosci”. */
function bezOgonkow(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function WyborMiejsca({
  otwarty,
  naZmiane,
  tytul,
  etykietaSzukania,
  pozycje,
  wybrane,
  naWybor,
}: {
  otwarty: boolean;
  naZmiane: (otwarty: boolean) => void;
  tytul: string;
  etykietaSzukania: string;
  pozycje: PozycjaWyboru[];
  wybrane: string;
  naWybor: (id: string) => void;
}) {
  const [szukane, setSzukane] = useState("");

  const znalezione = useMemo(() => {
    const pytanie = bezOgonkow(szukane.trim());
    if (!pytanie) return pozycje;
    return pozycje.filter((p) => bezOgonkow(`${p.tytul} ${p.podtytul ?? ""} ${p.grupa ?? ""}`).includes(pytanie));
  }, [pozycje, szukane]);

  const grupy = useMemo(() => {
    const g = new Map<string, PozycjaWyboru[]>();
    for (const p of znalezione) g.set(p.grupa ?? "", [...(g.get(p.grupa ?? "") ?? []), p]);
    return [...g.entries()];
  }, [znalezione]);

  const zamknij = (otwarte: boolean) => {
    if (!otwarte) setSzukane("");
    naZmiane(otwarte);
  };

  return (
    <Dialog.Root open={otwarty} onOpenChange={zamknij}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/30" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-white transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex items-center gap-1 border-b border-slate-200 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <Dialog.Close
              aria-label="Zamknij i wróć"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <XIcon className="size-5" aria-hidden />
            </Dialog.Close>
            <Dialog.Title className="truncate text-base font-bold text-slate-900">{tytul}</Dialog.Title>
          </div>

          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                value={szukane}
                onChange={(e) => setSzukane(e.target.value)}
                placeholder={etykietaSzukania}
                aria-label={etykietaSzukania}
                // text-base, bo iOS przybliża stronę przy polach mniejszych niż 16 px
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {znalezione.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">Nic nie pasuje do „{szukane}”.</p>
            ) : (
              grupy.map(([nazwa, lista]) => (
                <div key={nazwa}>
                  {nazwa && (
                    <h3 className="sticky top-0 bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                      {nazwa}
                    </h3>
                  )}
                  <ul>
                    {lista.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            naWybor(p.id);
                            zamknij(false);
                          }}
                          aria-current={p.id === wybrane ? "true" : undefined}
                          className="flex min-h-[60px] w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-semibold text-slate-900">{p.tytul}</span>
                            {p.podtytul && <span className="block text-sm text-slate-600">{p.podtytul}</span>}
                          </span>
                          {p.id === wybrane && (
                            <>
                              <CheckIcon className="size-5 shrink-0 text-slate-900" aria-hidden />
                              <span className="sr-only">wybrane teraz</span>
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
