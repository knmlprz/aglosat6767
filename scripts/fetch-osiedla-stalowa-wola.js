/**
 * Pobiera granice osiedli / dzielnic Stalowej Woli z OSM (Overpass).
 *
 * Uruchom: node scripts/fetch-osiedla-stalowa-wola.js
 *
 * Wynik: data/stalowa-wola-osiedla.json
 *
 * Szukane nazwy (brief): Rozwadów, Centrum, Hutnik, Piaski, Charzewice…
 * W OSM bywają jako admin_level=10|11 LUB place=suburb|neighbourhood (bez polygonu).
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT = path.join(DATA_DIR, "stalowa-wola-osiedla.json");

/** Bbox centrum miasta — ciaśniejszy niż cała gmina */
const CITY_BBOX = "50.52,21.98,50.62,22.12"; // south,west,north,east

const EXPECTED_NAMES = [
  "Rozwadów",
  "Centrum",
  "Hutnik",
  "Piaski",
  "Charzewice",
  "Północ",
  "Municipium",
  "Krzemień",
];

async function overpass(query, label) {
  console.log(`\n→ ${label}`);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Aglometer/1.0 (fetch osiedla)",
    },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${label}: HTTP ${res.status}\n${t.slice(0, 300)}`);
  }
  const data = await res.json();
  console.log(`  elementów: ${data.elements?.length ?? 0}`);
  return data;
}

function wayToFeature(el, extra = {}) {
  if (!el.geometry?.length) return null;
  return {
    type: "Feature",
    properties: {
      id: String(el.id),
      osmType: el.type,
      nazwa: el.tags?.name || el.tags?.["name:pl"] || "Bez nazwy",
      admin_level: el.tags?.admin_level,
      place: el.tags?.place,
      ...extra,
    },
    geometry: {
      type: "Polygon",
      coordinates: [el.geometry.map((g) => [g.lon, g.lat])],
    },
  };
}

function nodeToPointFeature(el) {
  return {
    type: "Feature",
    properties: {
      id: String(el.id),
      osmType: "node",
      nazwa: el.tags?.name || el.tags?.["name:pl"] || "Bez nazwy",
      admin_level: el.tags?.admin_level,
      place: el.tags?.place,
      fallback: true,
    },
    geometry: {
      type: "Point",
      coordinates: [el.lon, el.lat],
    },
  };
}

/** Prosty składacz: outer ways relacji → jeden ring (bez dziur) */
function relationOuterRing(relation, waysById) {
  const outerWays = relation.members
    ?.filter((m) => m.type === "way" && (m.role === "outer" || m.role === ""))
    .map((m) => waysById.get(m.ref))
    .filter(Boolean);
  if (!outerWays?.length) return null;

  const coords = [];
  for (const way of outerWays) {
    const pts = way.geometry.map((g) => [g.lon, g.lat]);
    if (coords.length && pts.length) {
      const last = coords[coords.length - 1];
      const first = pts[0];
      if (last[0] === first[0] && last[1] === first[1]) pts.shift();
    }
    coords.push(...pts);
  }
  if (coords.length < 4) return null;
  return coords;
}

async function main() {
  // --- Główne zapytanie: obszar gminy miasta + admin 10/11 ---
  const primaryQuery = `
[out:json][timeout:120];
area["name"="Stalowa Wola"]["boundary"="administrative"]["admin_level"="7"]->.gmina;
(
  relation(area.gmina)["boundary"="administrative"]["admin_level"~"10|11"];
  way(area.gmina)["boundary"="administrative"]["admin_level"~"10|11"];
  relation(area.gmina)["boundary"="administrative"]["place"="suburb"];
  way(area.gmina)["place"~"suburb|neighbourhood|quarter"];
  node(area.gmina)["place"~"suburb|neighbourhood|quarter"];
);
out body;
>;
out geom;
`;

  const primary = await overpass(primaryQuery, "Osiedla w granicach gminy SW (admin 10/11 + place)");

  // --- Zapas: bbox miasta (gdy area nie zwróci nic) ---
  const fallbackQuery = `
[out:json][timeout:90];
(
  relation["boundary"="administrative"]["admin_level"~"9|10|11"](${CITY_BBOX});
  way["boundary"="administrative"]["admin_level"~"9|10|11"](${CITY_BBOX});
  way["place"~"suburb|neighbourhood|quarter"](${CITY_BBOX});
  node["place"~"suburb|neighbourhood|quarter"](${CITY_BBOX});
);
out body;
>;
out geom;
`;

  let fallback = { elements: [] };
  if ((primary.elements?.length ?? 0) < 3) {
    fallback = await overpass(fallbackQuery, "Fallback: bbox centrum miasta");
  }

  const elements = [...(primary.elements || []), ...(fallback.elements || [])];
  const waysById = new Map(
    elements.filter((e) => e.type === "way").map((w) => [w.id, w])
  );

  const features = [];
  const seen = new Set();

  for (const el of elements) {
    if (el.type === "way" && el.tags?.boundary === "administrative") {
      const f = wayToFeature(el, { source: "admin_boundary" });
      if (f && !seen.has(f.properties.nazwa)) {
        seen.add(f.properties.nazwa);
        features.push(f);
      }
    }
    if (el.type === "way" && el.tags?.place) {
      const f = wayToFeature(el, { source: "place_way" });
      if (f && !seen.has(f.properties.nazwa)) {
        seen.add(f.properties.nazwa);
        features.push(f);
      }
    }
    if (el.type === "node" && el.tags?.place) {
      const f = nodeToPointFeature(el);
      if (!seen.has(f.properties.nazwa)) {
        seen.add(f.properties.nazwa);
        features.push(f);
      }
    }
    if (el.type === "relation" && el.tags?.boundary === "administrative") {
      const ring = relationOuterRing(el, waysById);
      if (ring) {
        const nazwa = el.tags?.name || el.tags?.["name:pl"] || "Bez nazwy";
        if (!seen.has(nazwa)) {
          seen.add(nazwa);
          features.push({
            type: "Feature",
            properties: {
              id: String(el.id),
              osmType: "relation",
              nazwa,
              admin_level: el.tags?.admin_level,
              source: "admin_relation",
            },
            geometry: { type: "Polygon", coordinates: [ring] },
          });
        }
      }
    }
  }

  const geojson = {
    type: "FeatureCollection",
    meta: {
      fetchedAt: new Date().toISOString(),
      polygonCount: features.filter((f) => f.geometry.type === "Polygon").length,
      pointFallbackCount: features.filter((f) => f.geometry.type === "Point").length,
      expectedNames: EXPECTED_NAMES,
      foundExpected: EXPECTED_NAMES.filter((n) =>
        features.some((f) =>
          f.properties.nazwa.toLowerCase().includes(n.toLowerCase())
        )
      ),
      missingExpected: EXPECTED_NAMES.filter(
        (n) =>
          !features.some((f) =>
            f.properties.nazwa.toLowerCase().includes(n.toLowerCase())
          )
      ),
    },
    features,
  };

  fs.writeFileSync(OUT, JSON.stringify(geojson, null, 2));
  console.log("\n✓ Zapisano:", OUT);
  console.log("  Polygony:", geojson.meta.polygonCount);
  console.log("  Punkty (fallback):", geojson.meta.pointFallbackCount);
  console.log("  Znalezione z listy:", geojson.meta.foundExpected.join(", ") || "—");
  console.log("  Brakuje z listy:", geojson.meta.missingExpected.join(", ") || "—");
  console.log("\nNazwy w pliku:");
  features.forEach((f) =>
    console.log(`  - ${f.properties.nazwa} (${f.geometry.type}, ${f.properties.source || f.properties.place || "?"})`)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
