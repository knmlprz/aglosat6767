"use client";

// Model kontra teren: każda kontrola ciągłości na odcinku z wynikiem modelu jest też etykietą.
// Liczone na żywo z kontroli wpisanych w tej sesji.

import type { Obserwacja, Weryfikacja } from "@/lib/aglosat/types.ts";

type Wynik = { trafione: number; falszyweAlarmy: number; przeoczenia: number; niewidoczne: number; razem: number };

export function policzModelKontraTeren(obserwacje: Obserwacja[], weryfikacje: Weryfikacja[]): Wynik {
  const w: Wynik = { trafione: 0, falszyweAlarmy: 0, przeoczenia: 0, niewidoczne: 0, razem: 0 };
  const kontrole = weryfikacje.filter((x) => x.cecha === "ciaglosc");
  for (const o of obserwacje) {
    const teren = kontrole.filter((k) => k.odcinekId === o.odcinekId).sort((a, b) => b.dataKontroli.localeCompare(a.dataKontroli))[0];
    if (!teren) continue;
    w.razem++;
    if (o.klasa === "niewidoczny") w.niewidoczne++;
    else if (o.klasa === teren.wartosc) w.trafione++;
    else if (o.klasa === "przerwany") w.falszyweAlarmy++;
    else w.przeoczenia++;
  }
  return w;
}

export function ModelKontraTeren({ obserwacje, weryfikacje }: { obserwacje: Obserwacja[]; weryfikacje: Weryfikacja[] }) {
  const w = policzModelKontraTeren(obserwacje, weryfikacje);
  return (
    <section aria-labelledby="model-teren-tytul" className="rounded-2xl border border-slate-200 bg-white p-4" aria-live="polite">
      <h3 id="model-teren-tytul" className="text-sm font-bold text-slate-800">
        Model kontra teren
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Kontrole ciągłości wpisane w tej sesji na odcinkach, które ocenił model. Każda kontrola to kolejna etykieta do oceny
        modelu.
      </p>
      {w.razem === 0 ? (
        <p className="mt-2 text-sm text-slate-700">Żadna kontrola nie dotyczy jeszcze odcinka ocenionego przez model.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Pole nazwa="trafione" wartosc={w.trafione} />
          <Pole nazwa="fałszywe alarmy" wartosc={w.falszyweAlarmy} opis="model: przerwa, teren: ciągły" />
          <Pole nazwa="przeoczenia" wartosc={w.przeoczenia} opis="model: ciągły, teren: przerwa" />
          <Pole nazwa="model nie widział" wartosc={w.niewidoczne} opis="i uczciwie to powiedział" />
        </dl>
      )}
    </section>
  );
}

function Pole({ nazwa, wartosc, opis }: { nazwa: string; wartosc: number; opis?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <dt className="text-xs text-slate-600">{nazwa}</dt>
      <dd className="text-lg font-black tabular-nums text-slate-900">{wartosc}</dd>
      {opis && <dd className="text-[11px] text-slate-600">{opis}</dd>}
    </div>
  );
}
