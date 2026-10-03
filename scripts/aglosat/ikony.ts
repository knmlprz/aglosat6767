// Ikony aplikacji instalowalnej. Uruchomienie: npm run aglosat:ikony.
// Znak jest ten sam co na mapie: biała kropka startu, zielona trasa udokumentowana, niebieski cel.

import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const TLO = "#0f172a";
const KATALOG = "public/ikony";

/** Znak w układzie 512×512, wyśrodkowany: trasa z dwoma zakrętami między startem a celem. */
const znak = (skala: number) => `
  <g transform="translate(256 256) scale(${skala}) translate(-223 -277)">
    <path d="M150 390 V320 Q150 290 180 290 H260 Q290 290 290 260 V170"
          fill="none" stroke="#4ade80" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="150" cy="390" r="40" fill="#ffffff" stroke="${TLO}" stroke-width="14"/>
    <circle cx="290" cy="170" r="46" fill="#38bdf8" stroke="${TLO}" stroke-width="14"/>
  </g>`;

const svg = (promien: number, skala: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${promien}" fill="${TLO}"/>${znak(skala)}
  </svg>`;

// „maskable”: system przycina ikonę do własnego kształtu, więc znak mieści się w bezpiecznym kole (80%).
const pliki: { nazwa: string; rozmiar: number; svg: string }[] = [
  { nazwa: "ikona-192.png", rozmiar: 192, svg: svg(112, 1.25) },
  { nazwa: "ikona-512.png", rozmiar: 512, svg: svg(112, 1.25) },
  { nazwa: "ikona-maskowalna-512.png", rozmiar: 512, svg: svg(0, 0.95) },
  { nazwa: "apple-touch-icon.png", rozmiar: 180, svg: svg(0, 1.1) },
];

mkdirSync(KATALOG, { recursive: true });
for (const p of pliki) {
  const png = await sharp(Buffer.from(p.svg)).resize(p.rozmiar, p.rozmiar).png().toBuffer();
  writeFileSync(`${KATALOG}/${p.nazwa}`, png);
  console.log(`${KATALOG}/${p.nazwa} (${p.rozmiar}px, ${(png.length / 1024).toFixed(1)} kB)`);
}
