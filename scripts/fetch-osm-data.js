/**
 * Pobiera dane OSM z Overpass API dla regionu Stalowa Wola / Nisko.
 * Uruchom: node scripts/fetch-osm-data.js
 */
const fs = require("fs");
const path = require("path");

const BBOX = "50.36,21.84,50.83,22.27"; // south,west,north,east
const DATA_DIR = path.join(__dirname, "..", "data");

async function overpass(query, label) {
  console.log(`Fetching ${label}...`);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Aglometer/1.0 (transport analysis)",
    },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`  → ${data.elements?.length ?? 0} elements`);
  return data;
}

function osmToGeoJSON(elements, type = "Polygon") {
  const features = [];
  for (const el of elements) {
    if (el.type === "relation" && el.members) {
      // skip relations for now — handled separately for routes
      continue;
    }
    if (!el.geometry) continue;
    if (type === "Polygon" && el.type === "way") {
      features.push({
        type: "Feature",
        properties: {
          id: String(el.id),
          nazwa: el.tags?.name || el.tags?.["name:pl"] || "Bez nazwy",
          admin_level: el.tags?.admin_level,
          place: el.tags?.place,
        },
        geometry: {
          type: "Polygon",
          coordinates: [el.geometry.map((g) => [g.lon, g.lat])],
        },
      });
    } else if (type === "LineString") {
      features.push({
        type: "Feature",
        properties: { name: el.tags?.name || el.tags?.ref || "", ...el.tags },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map((g) => [g.lon, g.lat]),
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function routesToGeoJSON(relations, waysMap) {
  const features = [];
  const colors = [
    "#e11d48", "#7c3aed", "#2563eb", "#059669", "#d97706",
    "#db2777", "#0891b2", "#65a30d", "#9333ea", "#ea580c",
  ];
  let colorIdx = 0;

  for (const rel of relations) {
    if (!rel.members) continue;
    const ref = rel.tags?.ref || rel.tags?.name || `route-${rel.id}`;
    const color = colors[colorIdx % colors.length];
    colorIdx++;

    const coords = [];
    for (const m of rel.members) {
      if (m.type !== "way") continue;
      const way = waysMap.get(m.ref || m.id);
      if (!way?.geometry) continue;
      const pts = way.geometry.map((g) => [g.lon, g.lat]);
      if (m.role === "backward") pts.reverse();
      if (coords.length && pts.length) {
        const last = coords[coords.length - 1];
        const first = pts[0];
        if (last[0] === first[0] && last[1] === first[1]) pts.shift();
      }
      coords.push(...pts);
    }
    if (coords.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { ref, name: rel.tags?.name || ref, color, network: rel.tags?.network || "" },
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  return { type: "FeatureCollection", features };
}

async function main() {
  // 1. San river — broader bbox
  const sanData = await overpass(
    `[out:json][timeout:60];
     way["waterway"~"river|stream"]["name"~"San",i](50.35,21.80,50.85,22.35);
     out geom;`,
    "San river"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "san.json"),
    JSON.stringify(osmToGeoJSON(sanData.elements, "LineString"))
  );

  // 2. Sołectwa (admin_level=8) + place=village/hamlet bez granicy
  const solectwaData = await overpass(
    `[out:json][timeout:90];
     (
       relation["boundary"="administrative"]["admin_level"="8"](${BBOX});
       way["boundary"="administrative"]["admin_level"="8"](${BBOX});
     );
     out geom;`,
    "Sołectwa admin_level=8"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "stalowa-wola-solectwa.json"),
    JSON.stringify(osmToGeoJSON(solectwaData.elements, "Polygon"))
  );

  // 3. MZK bus route relations
  const busRouteData = await overpass(
    `[out:json][timeout:90];
     relation["route"="bus"]["network"~"MZK",i](${BBOX});
     out body;
     >;
     out geom;`,
    "MZK bus routes"
  );
  const relations = busRouteData.elements.filter((e) => e.type === "relation");
  const waysMap = new Map(
    busRouteData.elements.filter((e) => e.type === "way").map((w) => [w.id, w])
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "mzk-routes.json"),
    JSON.stringify(routesToGeoJSON(relations, waysMap))
  );

  // 4. Fallback: also try route=bus without network filter
  if (relations.length === 0) {
    console.log("No MZK relations found, trying all bus routes...");
    const allBus = await overpass(
      `[out:json][timeout:90];
       relation["route"="bus"](${BBOX});
       out body;
       >;
       out geom;`,
      "All bus routes"
    );
    const rels = allBus.elements.filter((e) => e.type === "relation");
    const wMap = new Map(allBus.elements.filter((e) => e.type === "way").map((w) => [w.id, w]));
    fs.writeFileSync(
      path.join(DATA_DIR, "mzk-routes.json"),
      JSON.stringify(routesToGeoJSON(rels, wMap))
    );
  }

  console.log("Done.");
}

main().catch(console.error);
