// Pobiera wycinek OSM dla obszaru pilota i zapisuje tylko to, czego potrzebuje potok.
// Uruchomienie: node scripts/aglosat/fetch-osm.ts
// Źródło: oficjalne API OSM (/api/0.6/map), dane © współtwórcy OpenStreetMap, ODbL.

import { writeFileSync, mkdirSync } from "node:fs";
import { OBSZAR } from "./config.ts";
import { osmDostepnoscZTagow } from "../../lib/aglosat/osm.ts";

type El = { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> };

async function main() {
  const [s, w, n, e] = OBSZAR.bboxPobrania;
  const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${w},${s},${e},${n}`;
  const res = await fetch(url, { headers: { "User-Agent": "AgloSat-hackathon/0.1" } });
  if (!res.ok) throw new Error(`OSM API ${res.status}`);
  const { elements } = (await res.json()) as { elements: El[] };

  const potrzebneWays = elements.filter(
    (x) =>
      x.type === "way" &&
      x.tags &&
      (x.tags.highway || x.tags.building || x.tags.amenity || x.tags.shop || x.tags.railway === "tram"),
  );
  const wezlyWays = new Set(potrzebneWays.flatMap((x) => x.nodes ?? []));
  const potrzebneNodes = elements.filter(
    (x) => x.type === "node" && (wezlyWays.has(x.id) || x.tags?.amenity || x.tags?.shop),
  );

  const wynik = {
    pobrano: new Date().toISOString().slice(0, 10),
    zrodlo: url,
    licencja: "© OpenStreetMap contributors, ODbL",
    nodes: potrzebneNodes.map(({ id, lat, lon, tags }) => (tags ? { id, lat, lon, tags } : { id, lat, lon })),
    ways: potrzebneWays.map(({ id, nodes, tags }) => ({
      id,
      nodes,
      ...osmDostepnoscZTagow(tags),
      tags,
    })),
  };
  mkdirSync("data/aglosat", { recursive: true });
  writeFileSync("data/aglosat/osm-extract.json", JSON.stringify(wynik));
  console.log(`zapisano ${wynik.nodes.length} węzłów, ${wynik.ways.length} linii`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
