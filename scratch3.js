const fs = require('fs');
const data = require('./data/stalowa-wola-gminy.json');
for (const f of data.features) {
  if (f.geometry.type === 'Polygon') {
    for (const ring of f.geometry.coordinates) {
       ring.reverse();
    }
  } else if (f.geometry.type === 'MultiPolygon') {
    for (const poly of f.geometry.coordinates) {
       for (const ring of poly) ring.reverse();
    }
  }
}
const { geoBounds } = require("d3-geo");
console.log("Bounds after reversing:", geoBounds(data));
fs.writeFileSync('./data/stalowa-wola-gminy-fixed.json', JSON.stringify(data));
