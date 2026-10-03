const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/przystanki_dworce_kolejowe.json', 'utf-8'));
const withGeometry = data.elements.find(e => e.type === 'way' && e.geometry);
const withBounds = data.elements.find(e => e.type === 'way' && e.bounds);
console.log('Has geometry?', !!withGeometry);
console.log('Has bounds?', !!withBounds);
