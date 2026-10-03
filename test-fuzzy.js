const stops = require('./data/stops.json');
const target = [
'DĄBROWSKIEGO - DWORZEC PKP-01',
'ROZWADÓW  RYNEK-01',
'KLASZTORNA - KLASZTOR',
'PRZEMYSŁOWA - SKŁADY BUDOWLANE',
'NIEZŁOMNYCH - SALON SAMOCHODOWY',
'KEN - STACJA PALIW',
'OFIAR KATYNIA - CMENTARZ',
'OFIAR KATYNIA - JUBILAT',
'ORZESZKOWEJ - JUBILAT',
'KWIATKOWSKIEGO -  SP ZOZ-02',
'KWIATKOWSKIEGO - URZĄD MIASTA',
'KWIATKOWSKIEGO - STREFA',
'KWIATKOWSKIEGO - KUL',
'MICKIEWICZA - LO',
'HUTNICZA - PRZYCHODNIA',
'OKULICKIEGO - HALA TARGOWA',
'KEN - PARKING',
'KEN - RONDO',
'PONIATOWSKIEGO -  BANK',
'PONIATOWSKIEGO -  SUPERMARKET-02',
'CZARNIECKIEGO - Os.FLISAKÓW',
'POPIEŁUSZKI - BAZYLIKA',
'STASZICA - WZORCOWY',
'STASZICA - LO',
'ENERGETYKÓW - MLECZARNIA',
'ENERGETYKÓW - PRZEJAZD KOLEJOWY',
'ENERGETYKÓW - SZKOŁA',
'SOPOCKA - KOMIS',
'SOPOCKA - KOŚCIÓŁ-02',
'SOPOCKA - LEGIONÓW-02',
'OSIEDLE - BLOKI-02',
'NISKO - JEDNOSTKA WOJSKOWA-02',
'NISKO - APTEKA',
'NISKO - DOM HANDLOWY-02',
'NISKO - WOLNOŚCI PRZYCHODNIA-02',
'RACŁAWICE - KOŚCIÓŁ-02'
];

function normalizewords(s) {
  if (!s) return [];
  return s.toUpperCase()
          .replace(/[-_.,/0-9]/g, ' ')
          .replace(/PKP/g, '')
          .replace(/ZOZ/g, '')
          .replace(/KUL/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2); // ignore tiny words
}

const osmNames = stops.elements
  .filter(s => s.tags && s.tags.name)
  .map(s => ({ original: s.tags.name, norm: normalizewords(s.tags.name), lat: s.lat, lon: s.lon }));

const matched = target.map(t => {
  const normT = normalizewords(t);
  if (normT.length === 0) return null;
  
  let best = null;
  let bestScore = 0;
  
  osmNames.forEach(n => {
    let score = 0;
    // Count matches
    normT.forEach(tw => {
      if (n.norm.some(nw => nw.includes(tw) || tw.includes(nw))) score++;
    });
    
    // Penalize missing words from target
    const lengthDiff = Math.abs(n.norm.length - normT.length);
    const finalScore = score - (lengthDiff * 0.2);
    
    if (finalScore > bestScore) {
       bestScore = finalScore;
       best = n;
    }
  });
  return { q: t, matchName: best ? best.original : 'NONE', score: bestScore, lat: best?best.lat:0, lon: best?best.lon:0 }
});

console.log(matched.map(m => `${m.score.toFixed(1)} -> ${m.q} === ${m.matchName}`).join('\n'));
