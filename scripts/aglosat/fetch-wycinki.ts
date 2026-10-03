// Pobiera wycinki ortofotomapy (WMS Geoportalu) dla listy wycinki z pilot.json.
// Uruchomienie: npm run aglosat:wycinki (po aglosat:build). Pobiera tylko brakujące pliki.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ORTO } from "./config.ts";
import type { PilotZapisany } from "../../lib/aglosat/data.ts";

const pilot = JSON.parse(readFileSync("public/aglosat/pilot.json", "utf8")) as PilotZapisany;
mkdirSync("public/aglosat/wycinki", { recursive: true });

const doPobrania = pilot.wycinki.filter((w) => !existsSync(`public${w.plik}`));
console.log(`wycinki: ${pilot.wycinki.length}, do pobrania: ${doPobrania.length}`);

async function pobierz(w: (typeof pilot.wycinki)[number]): Promise<void> {
  const [s, zach, n, wsch] = w.bbox;
  // CRS:84 ma kolejność osi lon, lat
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: ORTO.warstwa,
    STYLES: "",
    CRS: "CRS:84",
    BBOX: `${zach},${s},${wsch},${n}`,
    WIDTH: String(ORTO.rozmiarPx),
    HEIGHT: String(ORTO.rozmiarPx),
    FORMAT: "image/jpeg",
  });
  for (let proba = 1; proba <= 3; proba++) {
    const res = await fetch(`${ORTO.wms}?${params}`, { headers: { "User-Agent": "AgloSat-hackathon/0.1" } });
    const typ = res.headers.get("content-type") ?? "";
    if (res.ok && typ.startsWith("image/")) {
      writeFileSync(`public${w.plik}`, Buffer.from(await res.arrayBuffer()));
      return;
    }
    console.warn(`  ${w.id}: HTTP ${res.status} ${typ}, próba ${proba}`);
    await new Promise((r) => setTimeout(r, 1000 * proba));
  }
  throw new Error(`nie udało się pobrać ${w.id}`);
}

const kolejka = [...doPobrania];
let gotowe = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let w = kolejka.shift(); w; w = kolejka.shift()) {
      await pobierz(w);
      if (++gotowe % 10 === 0) console.log(`  ${gotowe}/${doPobrania.length}`);
    }
  }),
);
console.log(`pobrano ${gotowe}`);
