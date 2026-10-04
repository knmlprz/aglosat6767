"use client";

// Zgłoszenie mieszkańca na telefonie: najpierw zdjęcie, potem co tu jest i komentarz.
// Formularz nie pyta o niepełnosprawność ani o dane zgłaszającego i mówi wprost,
// że zgłoszenie samo nie zmienia tras — zmienia je dopiero decyzja urzędu.
// Zdjęcie jest zalecane, ale nie wymagane: bez niego zgłoszenie też jest informacją,
// a wymóg odciąłby osoby, które nie zrobią zdjęcia.

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CameraIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import type { Cecha, Wartosc, Zgloszenie } from "@/lib/aglosat/types.ts";
import { CECHA_LABEL } from "@/lib/aglosat/vocabulary.ts";
import { WARIANTY } from "@/lib/aglosat/weryfikacja.ts";
import { noweZgloszenie, zmniejszZdjecie } from "@/lib/aglosat/zgloszenia.ts";

export function FormularzZgloszenia({
  otwarty,
  naZmiane,
  odcinekId,
  nazwaMiejsca,
  cechy,
  naWyslanie,
}: {
  otwarty: boolean;
  naZmiane: (otwarty: boolean) => void;
  odcinekId: string;
  nazwaMiejsca: string;
  /** Cechy, o które pytamy: te, których na tym odcinku brakuje. */
  cechy: Cecha[];
  naWyslanie: (z: Zgloszenie[]) => void;
}) {
  const [odpowiedzi, setOdpowiedzi] = useState<Partial<Record<Cecha, number>>>({});
  const [zdjecie, setZdjecie] = useState<string | null>(null);
  const [opis, setOpis] = useState("");
  const [wczytujeZdjecie, setWczytujeZdjecie] = useState(false);
  const [blad, setBlad] = useState("");

  const wyczysc = () => {
    setOdpowiedzi({});
    setZdjecie(null);
    setOpis("");
    setBlad("");
  };

  const zamknij = (otwarte: boolean) => {
    if (!otwarte) wyczysc();
    naZmiane(otwarte);
  };

  const wczytajZdjecie = async (plik: File | undefined) => {
    if (!plik) return;
    setWczytujeZdjecie(true);
    setBlad("");
    try {
      setZdjecie(await zmniejszZdjecie(plik));
    } catch {
      setBlad("Nie udało się wczytać zdjęcia. Możesz wysłać zgłoszenie bez niego.");
    } finally {
      setWczytujeZdjecie(false);
    }
  };

  const wyslij = () => {
    const wybrane = (Object.entries(odpowiedzi) as [Cecha, number][]).filter(([, i]) => i !== undefined);
    if (wybrane.length === 0) {
      setBlad("Zaznacz choć jedną odpowiedź, żeby urząd wiedział, czego dotyczy zgłoszenie.");
      return;
    }
    const tresc = opis.trim();
    naWyslanie(
      wybrane.map(([cecha, i]) =>
        noweZgloszenie(odcinekId, cecha, WARIANTY[cecha][i].wartosc as Wartosc, {
          zdjecie,
          opis: tresc || undefined,
        }),
      ),
    );
    zamknij(false);
  };

  return (
    <Dialog.Root open={otwarty} onOpenChange={zamknij}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/30" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-white transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex items-center gap-1 border-b border-slate-200 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <Dialog.Close
              aria-label="Zamknij bez wysyłania"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <XIcon className="size-5" aria-hidden />
            </Dialog.Close>
            <Dialog.Title className="truncate text-base font-bold text-slate-900">Wyślij zdjęcie</Dialog.Title>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <p className="text-lg font-bold leading-snug text-slate-900">{nazwaMiejsca}</p>
            <p className="mt-1 text-sm text-slate-700">
              Zrób zdjęcie tego, co tu zastajesz. Urząd obejrzy i zdecyduje, czy przyjąć je jako źródło. Do tego czasu
              trasy się nie zmieniają.
            </p>

            <div className="mt-4">
              <h3 className="text-base font-bold text-slate-900">Zdjęcie</h3>
              <p className="mt-0.5 text-sm text-slate-700">
                To najważniejsza część zgłoszenia: na zdjęciu widać to, czego nie widać w danych.
              </p>
              {zdjecie ? (
                <div className="mt-2">
                  {/* data URL z aparatu: next/image nic by tu nie zoptymalizował */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={zdjecie}
                    alt="Zdjęcie dołączone do zgłoszenia"
                    className="w-full rounded-xl border-2 border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setZdjecie(null)}
                    className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-base font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    Usuń zdjęcie
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-900 bg-slate-50 px-4 text-center hover:bg-slate-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900">
                  {wczytujeZdjecie ? (
                    <LoaderCircleIcon className="size-10 animate-spin text-slate-900 motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <CameraIcon className="size-10 text-slate-900" aria-hidden />
                  )}
                  <span className="text-lg font-black text-slate-900">
                    {wczytujeZdjecie ? "Przygotowuję zdjęcie…" : "Zrób zdjęcie"}
                  </span>
                  {!wczytujeZdjecie && (
                    <span className="text-sm font-medium text-slate-600">albo wybierz z galerii</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      void wczytajZdjecie(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {cechy.map((cecha) => (
                <fieldset key={cecha}>
                  <legend className="text-base font-bold text-slate-900">{CECHA_LABEL[cecha]}</legend>
                  <div className="mt-2 flex flex-col gap-2">
                    {WARIANTY[cecha].map((w, i) => (
                      <label
                        key={String(w.wartosc)}
                        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 ${
                          odpowiedzi[cecha] === i ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`cecha-${cecha}`}
                          checked={odpowiedzi[cecha] === i}
                          onChange={() => setOdpowiedzi((p) => ({ ...p, [cecha]: i }))}
                          className="size-5 shrink-0 accent-cyan-500"
                        />
                        <span className="text-base font-semibold">{w.etykieta}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <label className="mt-5 block">
              <span className="text-base font-bold text-slate-900">Komentarz</span>
              <span className="block text-sm text-slate-700">Opcjonalnie, własnymi słowami.</span>
              <input
                type="text"
                value={opis}
                onChange={(e) => setOpis(e.target.value)}
                placeholder="np. krawężnik obniżony tylko po jednej stronie"
                // text-base, bo iOS przybliża stronę przy polach mniejszych niż 16 px
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
            </label>

            <p aria-live="polite" className={blad ? "mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900" : "sr-only"}>
              {blad}
            </p>
          </div>

          <div className="border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={wyslij}
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-base font-bold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {zdjecie ? "Wyślij zdjęcie" : "Wyślij bez zdjęcia"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
