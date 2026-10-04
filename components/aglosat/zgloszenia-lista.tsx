"use client";

// Kolejka zgłoszeń mieszkańców u planisty. Decyzja jest jawna i odwracalna:
// przyjęcie liczy zgłoszenie jak udokumentowane źródło i od razu przelicza trasy,
// odrzucenie usuwa je z dowodów, ale zostawia w historii razem z powodem.

import { useEffect, useRef, useState } from "react";
import type { Pilot, StanZgloszenia, Zgloszenie } from "@/lib/aglosat/types.ts";
import { CECHA_LABEL, formatujWartosc } from "@/lib/aglosat/vocabulary.ts";
import { ETYKIETA_STANU } from "@/lib/aglosat/zgloszenia.ts";
import { lokalizacja } from "@/lib/aglosat/opis.ts";

const STAN_KLASA: Record<StanZgloszenia, string> = {
  oczekuje: "bg-violet-100 text-violet-900",
  przyjete: "bg-emerald-100 text-emerald-900",
  odrzucone: "bg-slate-200 text-slate-700",
};

export function ZgloszeniaLista({
  pilot,
  zgloszenia,
  onRozpatrz,
  onWybierzOdcinek,
}: {
  pilot: Pilot;
  zgloszenia: Zgloszenie[];
  onRozpatrz: (id: string, stan: StanZgloszenia, uzasadnienie?: string) => void;
  onWybierzOdcinek: (odcinekId: string) => void;
}) {
  const [komunikat, setKomunikat] = useState("");
  const rozpatrz = (id: string, stan: StanZgloszenia, uzasadnienie?: string) => {
    onRozpatrz(id, stan, uzasadnienie);
    setKomunikat(
      stan === "przyjete"
        ? "Zgłoszenie przyjęte. Trasy przeliczone."
        : stan === "odrzucone"
          ? "Zgłoszenie odrzucone. Nie liczy się jako źródło."
          : "Decyzja cofnięta. Zgłoszenie czeka na decyzję.",
    );
  };
  const oczekujace = zgloszenia.filter((z) => z.stan === "oczekuje");
  const rozpatrzone = zgloszenia.filter((z) => z.stan !== "oczekuje");

  if (zgloszenia.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 id="zgloszenia-tytul" tabIndex={-1} className="text-sm font-bold text-slate-800 outline-none">
          Zgłoszenia mieszkańców
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          Nic nie czeka na decyzję. Zgłoszenia trafiają tu z widoku mieszkańca: ktoś opisuje miejsce, którego nie ma
          w danych, i dołącza zdjęcie.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 id="zgloszenia-tytul" tabIndex={-1} className="text-sm font-bold text-slate-800 outline-none">
          Zgłoszenia mieszkańców: {oczekujace.length} do decyzji
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Zgłoszenie bez decyzji nie jest dowodem rozstrzygającym — cecha zostaje niewiadomą. Przyjęcie liczy je jak
          źródło udokumentowane i przelicza trasy.
        </p>
      </div>

      <p role="status" className="sr-only">
        {komunikat}
      </p>
      <ul className="flex flex-col gap-3">
        {[...oczekujace, ...rozpatrzone].map((z) => (
          <Karta key={z.id} z={z} pilot={pilot} onRozpatrz={rozpatrz} onWybierzOdcinek={onWybierzOdcinek} />
        ))}
      </ul>
    </div>
  );
}

function Karta({
  z,
  pilot,
  onRozpatrz,
  onWybierzOdcinek,
}: {
  z: Zgloszenie;
  pilot: Pilot;
  onRozpatrz: (id: string, stan: StanZgloszenia, uzasadnienie?: string) => void;
  onWybierzOdcinek: (odcinekId: string) => void;
}) {
  const [notatka, setNotatka] = useState("");
  const odcinek = pilot.odcinki.find((o) => o.id === z.odcinekId);
  // Przyciski decyzji znikają po kliknięciu; fokus idzie na przycisk, który ją cofa (i z powrotem).
  const poDecyzji = useRef(false);
  const cofnijRef = useRef<HTMLButtonElement>(null);
  const przyjmijRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!poDecyzji.current) return;
    poDecyzji.current = false;
    (z.stan === "oczekuje" ? przyjmijRef.current : cofnijRef.current)?.focus();
  }, [z.stan]);
  const decyzja = (stan: StanZgloszenia, uzasadnienie?: string) => {
    poDecyzji.current = true;
    onRozpatrz(z.id, stan, uzasadnienie);
  };

  return (
    <li className={`rounded-xl border p-3 ${z.stan === "oczekuje" ? "border-violet-300 bg-violet-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onWybierzOdcinek(z.odcinekId)}
          className="text-left text-sm font-bold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {odcinek ? lokalizacja(odcinek, pilot) : z.odcinekId}
        </button>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAN_KLASA[z.stan]}`}>{ETYKIETA_STANU[z.stan]}</span>
      </div>

      <p className="mt-1 text-sm text-slate-800">
        {CECHA_LABEL[z.cecha]}: <strong>{formatujWartosc(z.cecha, z.wartosc)}</strong>
      </p>
      <p className="text-xs text-slate-600">data zgłoszenia {z.dataZgloszenia}</p>
      {z.opis && <p className="mt-1 text-sm text-slate-700">„{z.opis}”</p>}

      {z.zdjecie ? (
        // data URL prosto z aparatu mieszkańca: next/image nie ma tu czego optymalizować
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={z.zdjecie}
          alt={`Zdjęcie ze zgłoszenia: ${CECHA_LABEL[z.cecha]}, ${formatujWartosc(z.cecha, z.wartosc)}`}
          className="mt-2 max-h-64 w-full rounded-lg border border-slate-300 bg-slate-900 object-contain"
        />
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-600">
          Bez zdjęcia. Samo zgłoszenie nie pokazuje miejsca — rozważ kontrolę w terenie zamiast przyjęcia.
        </p>
      )}

      {z.stan === "oczekuje" ? (
        <div className="mt-2 flex flex-col gap-2">
          <label className="block text-xs font-medium text-slate-700">
            Uzasadnienie decyzji (opcjonalnie)
            <input
              type="text"
              value={notatka}
              onChange={(e) => setNotatka(e.target.value)}
              placeholder="np. zdjęcie pokazuje obniżony krawężnik po obu stronach"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              ref={przyjmijRef}
              type="button"
              onClick={() => decyzja("przyjete", notatka)}
              className="min-h-10 flex-1 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Przyjmij
            </button>
            <button
              type="button"
              onClick={() => decyzja("odrzucone", notatka)}
              className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Odrzuć
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {z.uzasadnienie ? <p className="text-xs text-slate-700">Urząd: „{z.uzasadnienie}”</p> : <span />}
          <button
            ref={cofnijRef}
            type="button"
            onClick={() => decyzja("oczekuje")}
            className="rounded px-2 py-0.5 text-xs text-slate-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Cofnij decyzję
          </button>
        </div>
      )}
    </li>
  );
}
