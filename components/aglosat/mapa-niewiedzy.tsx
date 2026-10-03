"use client";

// Mapa niewiedzy: odcinki według stanu wiedzy dla profilu, mgła nad niewiadomymi.
// Ładowana tylko w przeglądarce (Leaflet potrzebuje window).

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { LatLon, Pilot } from "@/lib/aglosat/types.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { CECHA_LABEL, KATEGORIA_LABEL, TYP_LABEL } from "@/lib/aglosat/vocabulary.ts";
import { STYL_MAPY, kategoriaMapy, type KategoriaMapy } from "@/lib/aglosat/styl.ts";

const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Podkład: Esri World Imagery; sieć piesza: © współtwórcy OpenStreetMap (ODbL)";

/** Użytkownik prosi o ograniczenie ruchu: mapa przeskakuje zamiast przelatywać. */
const ograniczRuch = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Wspolne = {
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  widoczne: Set<KategoriaMapy>;
  /** Odcinki wybranego miejsca: podświetlone, mapa do nich przybliża. */
  wybrane: string[];
  /** Pierwsze miejsca rankingu z numerami na mapie. */
  czolo: { odcinekId: string; pozycja: number }[];
  onWybierz: (odcinekId: string) => void;
  /** Dojście pokazywane na mapie (odcinki tras) i licznik żądań „pokaż na mapie”. */
  trasa: TrasaNaMapie | null;
  fokusTrasy: number;
  /** Trasa kontroli (spacer planisty) i licznik żądań „pokaż na mapie”. */
  kontrola?: KontrolaNaMapie | null;
  fokusKontroli?: number;
};

export type KontrolaNaMapie = {
  odcinki: string[];
  przystanki: { nr: number; polozenie: LatLon }[];
  start: LatLon;
};

export type TrasaNaMapie = {
  piesza: string[] | null;
  udokumentowana: string[] | null;
  weryfikacji: string[] | null;
  start: LatLon;
  cel: LatLon;
};

/**
 * Wszystkie warstwy rysują na jednej kanwie. Druga kanwa przykryłaby pierwszą
 * i przechwytywała kliknięcia w odcinki.
 */
type ZRendererem = { renderer: L.Canvas };

function WarstwaOdcinkow({
  pilot,
  oceny,
  widoczne,
  onWybierz,
  renderer,
}: Pick<Wspolne, "pilot" | "oceny" | "widoczne" | "onWybierz"> & ZRendererem) {
  const map = useMap();
  // Callback w refie: zmiana funkcji rodzica nie przebudowuje 4,7 tys. linii.
  const wybierz = useRef(onWybierz);
  useEffect(() => {
    wybierz.current = onWybierz;
  }, [onWybierz]);

  useEffect(() => {
    const mgla = L.layerGroup();
    const linie = L.layerGroup();
    const inne = L.layerGroup();

    for (const odc of pilot.odcinki) {
      const ocena = oceny.get(odc.id);
      if (!ocena) continue;
      const kat = kategoriaMapy(ocena);
      if (!widoczne.has(kat)) continue;
      const styl = STYL_MAPY[kat];
      if (styl.mgla) {
        L.polyline(odc.geometria, { ...styl.mgla, renderer, interactive: false, lineCap: "round" }).addTo(mgla);
      }
      const brak = ocena.nieznane.length ? `<br>brakuje: ${ocena.nieznane.map((c) => CECHA_LABEL[c]).join(", ")}` : "";
      const nie = ocena.niespelnione.length ? `<br>nie spełnia: ${ocena.niespelnione.map((c) => CECHA_LABEL[c]).join(", ")}` : "";
      L.polyline(odc.geometria, { ...styl.linia, renderer })
        .bindTooltip(
          `<b>${TYP_LABEL[odc.typ] ?? odc.typ}</b>${odc.nazwa ? ` · ${odc.nazwa}` : ""}<br>${styl.etykieta}${brak}${nie}<br>${Math.round(odc.dlugoscM)} m`,
          { sticky: true },
        )
        .on("click", () => wybierz.current(odc.id))
        .addTo(linie);
    }

    for (const s of pilot.strefyZmian) {
      L.polygon(s.wielokat, { color: "#67e8f9", weight: 2, dashArray: "4 4", fillOpacity: 0.08, renderer, interactive: false })
        .addTo(inne);
    }
    for (const u of pilot.uslugi) {
      L.circleMarker([u.lat, u.lon], {
        radius: 6,
        color: "#0f172a",
        weight: 2,
        fillColor: "#38bdf8",
        fillOpacity: 1,
        renderer,
      })
        .bindTooltip(`<b>${u.nazwa}</b><br>${KATEGORIA_LABEL[u.kategoria]}`)
        .addTo(inne);
    }

    mgla.addTo(map);
    linie.addTo(map);
    inne.addTo(map);
    return () => {
      mgla.remove();
      linie.remove();
      inne.remove();
    };
  }, [map, pilot, oceny, widoczne, renderer]);

  return null;
}

function WarstwaWyboru({
  pilot,
  oceny,
  wybrane,
  czolo,
  onWybierz,
  renderer,
}: Pick<Wspolne, "pilot" | "oceny" | "wybrane" | "czolo" | "onWybierz"> & ZRendererem) {
  const map = useMap();
  const wybierz = useRef(onWybierz);
  useEffect(() => {
    wybierz.current = onWybierz;
  }, [onWybierz]);

  // Numery pierwszych miejsc rankingu.
  useEffect(() => {
    const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const grupa = L.layerGroup();
    for (const { odcinekId, pozycja } of czolo) {
      const o = odcinki.get(odcinekId);
      if (!o) continue;
      L.marker(o.geometria[Math.floor(o.geometria.length / 2)], {
        icon: L.divIcon({
          className: "agl-pin-icon",
          html: `<span class="agl-numer">${pozycja}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 30],
        }),
        title: `Miejsce ${pozycja} w rankingu`,
        keyboard: false,
      })
        .on("click", () => wybierz.current(odcinekId))
        .addTo(grupa);
    }
    grupa.addTo(map);
    return () => {
      grupa.remove();
    };
  }, [map, pilot, czolo]);

  // Podświetlenie wybranego miejsca. Odrysowane po każdym przeliczeniu (oceny), żeby leżało nad siecią.
  useEffect(() => {
    if (wybrane.length === 0) return;
    const odcinki = pilot.odcinki.filter((o) => wybrane.includes(o.id));
    const grupa = L.layerGroup();
    for (const o of odcinki) {
      L.polyline(o.geometria, { color: "#22d3ee", weight: 12, opacity: 0.55, lineCap: "round", interactive: false, renderer }).addTo(grupa);
      L.polyline(o.geometria, { color: "#ecfeff", weight: 3, opacity: 1, interactive: false, renderer }).addTo(grupa);
    }
    const srodek = odcinki[0]?.geometria[Math.floor(odcinki[0].geometria.length / 2)];
    if (srodek) {
      L.marker(srodek, {
        icon: L.divIcon({ className: "agl-pin-icon", html: '<span class="agl-puls"></span>', iconSize: [36, 36] }),
        interactive: false,
        keyboard: false,
      }).addTo(grupa);
    }
    grupa.addTo(map);
    return () => {
      grupa.remove();
    };
  }, [map, pilot, oceny, wybrane, renderer]);

  // Przybliżenie tylko przy zmianie wyboru.
  useEffect(() => {
    if (wybrane.length === 0) return;
    const geometrie = pilot.odcinki.filter((o) => wybrane.includes(o.id)).flatMap((o) => o.geometria);
    map.flyToBounds(L.latLngBounds(geometrie).pad(4), { maxZoom: 18, duration: 0.6, animate: !ograniczRuch() });
  }, [map, pilot, wybrane]);

  return null;
}

function WarstwaTrasy({ pilot, trasa, fokusTrasy, renderer }: Pick<Wspolne, "pilot" | "trasa" | "fokusTrasy"> & ZRendererem) {
  const map = useMap();

  useEffect(() => {
    if (!trasa) return;
    const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const linie = (ids: string[] | null) => (ids ?? []).map((id) => odcinki.get(id)!.geometria);
    const grupa = L.layerGroup();
    const rysuj = (ids: string[] | null, kolor: string, waga: number, dash?: string) => {
      for (const g of linie(ids)) {
        L.polyline(g, { color: "#0f172a", weight: waga + 3, opacity: 0.9, interactive: false, renderer }).addTo(grupa);
        L.polyline(g, { color: kolor, weight: waga, opacity: 1, dashArray: dash, interactive: false, renderer }).addTo(grupa);
      }
    };
    rysuj(trasa.piesza, "#cbd5e1", 2, "2 5");
    rysuj(trasa.weryfikacji, "#fbbf24", 5, "8 6");
    rysuj(trasa.udokumentowana, "#4ade80", 6);
    L.circleMarker(trasa.start, { radius: 8, color: "#0f172a", weight: 3, fillColor: "#ffffff", fillOpacity: 1, renderer })
      .bindTooltip("start: budynek mieszkalny")
      .addTo(grupa);
    L.circleMarker(trasa.cel, { radius: 9, color: "#0f172a", weight: 3, fillColor: "#38bdf8", fillOpacity: 1, renderer })
      .bindTooltip("cel: usługa")
      .addTo(grupa);
    grupa.addTo(map);
    return () => {
      grupa.remove();
    };
  }, [map, pilot, trasa, renderer]);

  // Przybliżenie do dojścia tylko na żądanie, nie po każdym przeliczeniu.
  useEffect(() => {
    if (!fokusTrasy || !trasa) return;
    const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const ids = [...(trasa.piesza ?? []), ...(trasa.weryfikacji ?? []), ...(trasa.udokumentowana ?? [])];
    const punkty = [trasa.start, trasa.cel, ...ids.flatMap((id) => odcinki.get(id)!.geometria)];
    map.flyToBounds(L.latLngBounds(punkty).pad(0.15), { maxZoom: 18, duration: 0.6, animate: !ograniczRuch() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na nowe żądanie
  }, [map, fokusTrasy]);

  return null;
}

function WarstwaKontroli({
  pilot,
  oceny,
  kontrola,
  fokusKontroli,
  renderer,
}: { pilot: Pilot; oceny: Map<string, OcenaOdcinka>; kontrola: KontrolaNaMapie | null; fokusKontroli: number } & ZRendererem) {
  const map = useMap();

  useEffect(() => {
    if (!kontrola) return;
    const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const grupa = L.layerGroup();
    for (const id of kontrola.odcinki) {
      const g = odcinki.get(id)?.geometria;
      if (!g) continue;
      L.polyline(g, { color: "#0f172a", weight: 8, opacity: 0.85, interactive: false, renderer }).addTo(grupa);
      L.polyline(g, { color: "#a78bfa", weight: 5, opacity: 1, interactive: false, renderer }).addTo(grupa);
    }
    L.circleMarker(kontrola.start, { radius: 8, color: "#0f172a", weight: 3, fillColor: "#ffffff", fillOpacity: 1, renderer })
      .bindTooltip("start i powrót kontroli")
      .addTo(grupa);
    for (const p of kontrola.przystanki) {
      L.marker(p.polozenie, {
        icon: L.divIcon({
          className: "agl-pin-icon",
          html: `<span class="agl-numer agl-numer-kontrola">K${p.nr}</span>`,
          iconSize: [30, 24],
          iconAnchor: [15, 30],
        }),
        title: `Przystanek kontroli ${p.nr}`,
        keyboard: false,
        interactive: false,
      }).addTo(grupa);
    }
    grupa.addTo(map);
    return () => {
      grupa.remove();
    };
    // oceny: odrysowanie po przeliczeniu sieci, żeby spacer leżał nad nią
  }, [map, pilot, oceny, kontrola, renderer]);

  useEffect(() => {
    if (!fokusKontroli || !kontrola) return;
    const odcinki = new Map(pilot.odcinki.map((o) => [o.id, o]));
    const punkty = [kontrola.start, ...kontrola.odcinki.flatMap((id) => odcinki.get(id)?.geometria ?? [])];
    map.flyToBounds(L.latLngBounds(punkty).pad(0.1), { maxZoom: 18, duration: 0.6, animate: !ograniczRuch() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na nowe żądanie
  }, [map, fokusKontroli]);

  return null;
}

/** Mapa zmienia rozmiar razem z panelem, bez zmiany rozmiaru okna; sam Leaflet tego nie zauważa. */
function ObserwatorRozmiaru() {
  const map = useMap();
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    obs.observe(map.getContainer());
    return () => obs.disconnect();
  }, [map]);
  return null;
}

export function MapaNiewiedzy(props: Wspolne) {
  const [s, w, n, e] = props.pilot.meta.obszar.bbox;
  const [renderer] = useState(() => L.canvas({ padding: 0.5, tolerance: 6 }));
  return (
    <MapContainer
      bounds={[
        [s, w],
        [n, e],
      ]}
      maxZoom={19}
      preferCanvas
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
    >
      <ZoomControl position="topleft" zoomInTitle="Przybliż mapę" zoomOutTitle="Oddal mapę" />
      <ObserwatorRozmiaru />
      {/* crossOrigin: kafelki pobrane po CORS może zapisać service worker, więc raz obejrzana mapa działa bez sieci */}
      <TileLayer
        url={ESRI_URL}
        attribution={ESRI_ATTR}
        maxZoom={19}
        maxNativeZoom={19}
        className="agl-podklad"
        crossOrigin="anonymous"
      />
      <WarstwaOdcinkow
        pilot={props.pilot}
        oceny={props.oceny}
        widoczne={props.widoczne}
        onWybierz={props.onWybierz}
        renderer={renderer}
      />
      <WarstwaTrasy pilot={props.pilot} trasa={props.trasa} fokusTrasy={props.fokusTrasy} renderer={renderer} />
      <WarstwaKontroli
        pilot={props.pilot}
        oceny={props.oceny}
        kontrola={props.kontrola ?? null}
        fokusKontroli={props.fokusKontroli ?? 0}
        renderer={renderer}
      />
      <WarstwaWyboru
        pilot={props.pilot}
        oceny={props.oceny}
        wybrane={props.wybrane}
        czolo={props.czolo}
        onWybierz={props.onWybierz}
        renderer={renderer}
      />
    </MapContainer>
  );
}
