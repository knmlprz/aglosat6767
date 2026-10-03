"use client";

// Jak często model się myli: macierz pomyłek i trzy liczby z koncepcji.

import { KLASY, procent, type OcenaModelu } from "@/lib/aglosat/metryki.ts";
import { formatujWartosc } from "@/lib/aglosat/vocabulary.ts";

export function OcenaModeluKarta({
  ocena,
  naZywo = false,
  porownanie = [],
}: {
  ocena: OcenaModelu;
  naZywo?: boolean;
  /** Ta sama próbka dla wszystkich wersji promptu. */
  porownanie?: OcenaModelu[];
}) {
  return (
    <section aria-labelledby="ocena-modelu-tytul" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 id="ocena-modelu-tytul" className="text-sm font-bold text-slate-800">
        Jak często model się myli
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Model {ocena.model}
        {ocena.wersjaPromptu ? ` (prompt v${ocena.wersjaPromptu})` : ""} kontra człowiek na {ocena.n} {ocena.n === 1 ? "wycinku" : "wycinkach"}
        {naZywo ? " (liczone na żywo z bieżących etykiet)" : " opisanych ręcznie"}
        {ocena.zbior === "testowy" ? ", zbiór testowy: nie używany przy poprawianiu promptu" : ""}. Zgodność z obrazem to nie to samo co stan w
        terenie: rozstrzyga kontrola.
      </p>
      {(porownanie.length > 1 || !!ocena.zgodnoscLudzi?.n) && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
          {porownanie.length > 1 &&
            porownanie.filter((p) => p.zbior === ocena.zbior).map((p) => (
              <li key={p.wersjaPromptu}>
                prompt v{p.wersjaPromptu}: trafność <strong>{procent(p.trafnosc)}</strong>, precyzja „przerwany”{" "}
                {procent(p.precyzjaPrzerwany)}
              </li>
            ))}
          {ocena.zgodnoscLudzi && ocena.zgodnoscLudzi.n > 0 && (
            <li>
              zgodność dwóch osób: <strong>{procent(ocena.zgodnoscLudzi.zgodnosc)}</strong> na {ocena.zgodnoscLudzi.n} wycinkach
            </li>
          )}
        </ul>
      )}
      {ocena.n === 0 ? (
        <p className="mt-2 text-sm text-slate-700">Brak wycinków opisanych przez człowieka.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Liczba nazwa="trafność" wartosc={procent(ocena.trafnosc)} />
            <Liczba nazwa="precyzja „przerwany”" wartosc={procent(ocena.precyzjaPrzerwany)} opis="ile wskazań przerwy było trafnych" />
            <Liczba nazwa="czułość „przerwany”" wartosc={procent(ocena.czuloscPrzerwany)} opis="ile przerw model zauważył" />
            <Liczba nazwa="poprawne „niewidoczny”" wartosc={procent(ocena.poprawneNiewidoczny)} opis="czy model wie, czego nie widać" />
          </dl>
          <table className="mt-3 w-full text-left text-xs">
            <caption className="mb-1 text-left text-xs text-slate-600">Macierz pomyłek: wiersze to człowiek, kolumny to model</caption>
            <thead>
              <tr>
                <th scope="col" className="p-1" />
                {KLASY.map((m) => (
                  <th key={m} scope="col" className="p-1 font-semibold text-slate-700">
                    model: {formatujWartosc("ciaglosc", m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KLASY.map((c) => (
                <tr key={c} className="border-t border-slate-100">
                  <th scope="row" className="p-1 font-semibold text-slate-700">
                    człowiek: {formatujWartosc("ciaglosc", c)}
                  </th>
                  {KLASY.map((m) => (
                    <td key={m} className={`p-1 tabular-nums ${c === m ? "font-bold text-emerald-800" : ocena.macierz[c][m] ? "text-rose-800" : "text-slate-600"}`}>
                      {ocena.macierz[c][m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function Liczba({ nazwa, wartosc, opis }: { nazwa: string; wartosc: string; opis?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <dt className="text-xs text-slate-600">{nazwa}</dt>
      <dd className="text-lg font-black text-slate-900">{wartosc}</dd>
      {opis && <dd className="text-[11px] text-slate-600">{opis}</dd>}
    </div>
  );
}
