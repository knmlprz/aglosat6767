"use client";

// Dowód obrazowy: wycinek ortofotomapy z naniesionym przebiegiem odcinka z OSM.
// Przebieg rysujemy w przeglądarce (SVG), więc obraz zostaje surowy i można go porównać bez nakładki.

import { useState } from "react";
import type { LatLon, Obserwacja, Wycinek } from "@/lib/aglosat/types.ts";
import { ETYKIETA_PRZYKLADOWE, formatujWartosc, nazwaModelu } from "@/lib/aglosat/vocabulary.ts";

export function WycinekObrazu({
  wycinek,
  przebiegi,
  obserwacje,
  odrzucone,
  ukryjModel = false,
}: {
  wycinek: Wycinek;
  /** Geometrie odcinków miejsca. */
  przebiegi: LatLon[][];
  /** Obserwacje modelu dla tych odcinków. */
  obserwacje: Obserwacja[];
  /** Identyfikatory obserwacji odrzuconych w terenie. */
  odrzucone: Set<string>;
  /** Przy etykietowaniu ukrywamy odpowiedź modelu, żeby nie sugerowała człowiekowi. */
  ukryjModel?: boolean;
}) {
  const [nakladka, setNakladka] = useState(true);
  const [brak, setBrak] = useState(false);
  const [s, w, n, e] = wycinek.bbox;
  // Krótkie odcinki (np. przejście 3 m) giną na wycinku, więc zaznaczamy też środek miejsca.
  const punkty = przebiegi.flat();
  const srodek: LatLon | null = punkty.length
    ? [punkty.reduce((a, p) => a + p[0], 0) / punkty.length, punkty.reduce((a, p) => a + p[1], 0) / punkty.length]
    : null;
  const xy = ([lat, lon]: LatLon) => `${(((lon - w) / (e - w)) * 100).toFixed(2)},${(((n - lat) / (n - s)) * 100).toFixed(2)}`;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-200">
        {brak ? (
          <p className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-600">
            Brak pliku wycinka. Uruchom npm run aglosat:wycinki.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- plik statyczny o znanym rozmiarze, bez optymalizacji
          <img
            src={wycinek.plik}
            alt={`Ortofotomapa wokół odcinka, nalot ${wycinek.dataObrazu}`}
            className="h-full w-full object-cover"
            onError={() => setBrak(true)}
          />
        )}
        {nakladka && !brak && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {srodek && (
              <ellipse
                cx={xy(srodek).split(",")[0]}
                cy={xy(srodek).split(",")[1]}
                rx="9"
                ry="9"
                fill="none"
                stroke="#ecfeff"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4 3"
              />
            )}
            {przebiegi.map((g, i) => (
              <g key={i}>
                <polyline points={g.map(xy).join(" ")} fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.7" />
                <polyline points={g.map(xy).join(" ")} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        )}
      </div>
      <figcaption className="flex flex-col gap-1 text-xs text-slate-600">
        <span>
          {wycinek.zrodlo}, data nalotu {wycinek.dataObrazu}. Linia: przebieg odcinka w OpenStreetMap; okrąg: środek
          miejsca.
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={nakladka} onChange={(e) => setNakladka(e.target.checked)} className="accent-slate-900" />
          pokaż przebieg z OSM
        </label>
        {!ukryjModel && obserwacje.map((o) => (
          <span key={o.id} className={odrzucone.has(o.id) ? "text-slate-500" : "text-slate-700"}>
            {odrzucone.has(o.id) ? <s>Model wizyjny{o.model && ` (${nazwaModelu(o.model)})`}</s> : `Model wizyjny${o.model ? ` (${nazwaModelu(o.model)})` : ""}`}: <strong>{formatujWartosc("ciaglosc", o.klasa)}</strong>, ocena{" "}
            {o.ocena.toFixed(2).replace(".", ",")}. {o.uzasadnienie}.
            {odrzucone.has(o.id) && " Odrzucone w terenie."}
            {o.przykladowe && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">klasa: {ETYKIETA_PRZYKLADOWE}</span>}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
