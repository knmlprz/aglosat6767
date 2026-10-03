"use client";

// Mapa niewiedzy: odcinki według stanu wiedzy dla profilu, mgła nad niewiadomymi.
// Ładowana tylko w przeglądarce (Leaflet potrzebuje window).

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Pilot } from "@/lib/aglosat/types.ts";
import type { OcenaOdcinka } from "@/lib/aglosat/profile.ts";
import { CECHA_LABEL, KATEGORIA_LABEL } from "@/lib/aglosat/vocabulary.ts";
import { STYL_MAPY, kategoriaMapy, type KategoriaMapy } from "@/lib/aglosat/styl.ts";

const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Podkład: Esri World Imagery; sieć piesza: © współtwórcy OpenStreetMap (ODbL)";

const TYP_LABEL: Record<string, string> = {
  chodnik: "chodnik",
  przejscie: "przejście",
  schody: "schody",
  sciezka: "ścieżka",
  ciag_pieszy: "ciąg pieszy",
  droga_osiedlowa: "droga osiedlowa",
};

function WarstwaOdcinkow({
  pilot,
  oceny,
  widoczne,
}: {
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  widoczne: Set<KategoriaMapy>;
}) {
  const map = useMap();

  useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 });
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
        .addTo(linie);
    }

    for (const s of pilot.strefyZmian) {
      L.polygon(s.wielokat, { color: "#67e8f9", weight: 2, dashArray: "4 4", fillOpacity: 0.08, renderer })
        .bindTooltip(`<b>Sygnał możliwej zmiany (Sentinel-2)</b><br>${s.scenaPrzed} → ${s.scenaPo}<br>${s.opis}`, {
          sticky: true,
        })
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
  }, [map, pilot, oceny, widoczne]);

  return null;
}

export function MapaNiewiedzy({
  pilot,
  oceny,
  widoczne,
}: {
  pilot: Pilot;
  oceny: Map<string, OcenaOdcinka>;
  widoczne: Set<KategoriaMapy>;
}) {
  const [s, w, n, e] = pilot.meta.obszar.bbox;
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
      <WarstwaOdcinkow pilot={pilot} oceny={oceny} widoczne={widoczne} />
    </MapContainer>
  );
}
