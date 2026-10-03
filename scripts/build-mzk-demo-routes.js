/**
 * Buduje ~10 linii MZK demo z platform OSM (ref) — semi-real fugazi.
 * Pełne GTFS/shapes podmienisz później w data/mzk-routes.json
 *
 * Uruchom: node scripts/build-mzk-demo-routes.js
 */
const fs = require("fs");
const path = require("path");

const drogi = require("../data/drogi_autobusow.json");
const OUT = path.join(__dirname, "..", "data", "mzk-routes-demo.json");

const COLORS = [
  "#e11d48", "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#db2777", "#0891b2", "#65a30d", "#9333ea", "#ea580c",
];

/** Linie MZK które często występują w regionie — priorytet jeśli są w OSM */
const PREFERRED_REFS = ["5", "7", "10", "15", "17", "22", "30", "34", "102", "103"];

function wayLine(way) {
  if (!way.geometry?.length) return null;
  return way.geometry.map((g) => [g.lon, g.lat]);
}

function main() {
  const byRef = new Map();

  for (const way of drogi.elements) {
    if (way.tags?.public_transport !== "platform") continue;
    const ref = way.tags?.ref || way.tags?.route_ref;
    if (!ref || !/^\d+$/.test(String(ref).trim())) continue;
    const r = String(ref).trim();
    if (!byRef.has(r)) byRef.set(r, []);
    byRef.get(r).push(way);
  }

  // Sortuj refs: preferred first, potem po liczbie segmentów
  const refs = [...byRef.keys()].sort((a, b) => {
    const pa = PREFERRED_REFS.indexOf(a);
    const pb = PREFERRED_REFS.indexOf(b);
    if (pa >= 0 && pb >= 0) return pa - pb;
    if (pa >= 0) return -1;
    if (pb >= 0) return 1;
    return byRef.get(b).length - byRef.get(a).length;
  });

  const picked = refs.slice(0, 10);
  const features = [];

  picked.forEach((ref, idx) => {
    const ways = byRef.get(ref);
    const color = COLORS[idx % COLORS.length];
    for (const way of ways) {
      const coords = wayLine(way);
      if (!coords || coords.length < 2) continue;
      features.push({
        type: "Feature",
        properties: {
          ref,
          name: `MZK linia ${ref}`,
          color,
          network: "MZK Stalowa Wola",
          source: "osm_platform_demo",
          fugazi: true,
        },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  });

  const geojson = {
    type: "FeatureCollection",
    meta: {
      description:
        "Semi-demo: segmenty platform przystankowych z OSM pogrupowane po ref. Nie pełne trasy GTFS.",
      lineRefs: picked,
      fugazi: true,
    },
    features,
  };

  fs.writeFileSync(OUT, JSON.stringify(geojson));
  console.log("Zapisano", OUT);
  console.log("Linie:", picked.join(", "));
  console.log("Segmentów:", features.length);
}

main();
