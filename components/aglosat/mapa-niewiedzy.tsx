"use client";

// Mapa niewiedzy: odcinki według stanu wiedzy dla profilu, mgła nad niewiadomymi.
// Ładowana tylko w przeglądarce (Leaflet potrzebuje window).

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Pilot } from "@/lib/aglosat/types.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { CECHA_LABEL, KATEGORIA_LABEL, TYP_LABEL } from "@/lib/aglosat/vocabulary.ts";
import { STYL_MAPY, kategoriaMapy, type KategoriaMapy } from "@/lib/aglosat/styl.ts";

const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Podkład: Esri World Imagery; sieć piesza: © współtwórcy OpenStreetMap (ODbL)";

type Wspolne = {
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  widoczne: Set<KategoriaMapy>;
  /** Odcinki wybranego miejsca: podświetlone, mapa do nich przybliża. */
  wybrane: string[];
  /** Pierwsze miejsca rankingu z numerami na mapie. */
  czolo: { odcinekId: string; pozycja: number }[];
  onWybierz: (odcinekId: string) => void;
};

/**
 * Wszystkie warstwy rysują na jednej kanwie. Druga kanwa przykryłaby pierwszą
 * i przechwytywała kliknięcia w odcinki.
 */
type ZRendererem = { renderer: L.Canvas };

function WarstwaOdcinkow({ pilot, oceny, widoczne, onWybierz, renderer }: Omit<Wspolne, "wybrane" | "czolo"> & ZRendererem) {
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

function WarstwaWyboru({ pilot, wybrane, czolo, onWybierz, renderer }: Omit<Wspolne, "oceny" | "widoczne"> & ZRendererem) {
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

  // Podświetlenie wybranego miejsca i przybliżenie.
  useEffect(() => {
    if (wybrane.length === 0) return;
    const odcinki = pilot.odcinki.filter((o) => wybrane.includes(o.id));
    const grupa = L.layerGroup();
    for (const o of odcinki) {
      L.polyline(o.geometria, { color: "#22d3ee", weight: 12, opacity: 0.55, lineCap: "round", interactive: false, renderer }).addTo(grupa);
      L.polyline(o.geometria, { color: "#ecfeff", weight: 3, opacity: 1, interactive: false, renderer }).addTo(grupa);
    }
    grupa.addTo(map);
    const granice = L.latLngBounds(odcinki.flatMap((o) => o.geometria));
    map.flyToBounds(granice.pad(4), { maxZoom: 18, duration: 0.6 });
    return () => {
      grupa.remove();
    };
  }, [map, pilot, wybrane, renderer]);

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
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
    >
      <TileLayer url={ESRI_URL} attribution={ESRI_ATTR} maxZoom={19} maxNativeZoom={19} className="agl-podklad" />
      <WarstwaOdcinkow
        pilot={props.pilot}
        oceny={props.oceny}
        widoczne={props.widoczne}
        onWybierz={props.onWybierz}
        renderer={renderer}
      />
      <WarstwaWyboru
        pilot={props.pilot}
        wybrane={props.wybrane}
        czolo={props.czolo}
        onWybierz={props.onWybierz}
        renderer={renderer}
      />
    </MapContainer>
  );
}
