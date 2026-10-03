const fs = require('fs');
const query = `
[out:json];
way["waterway"="river"]["name"="San"](50.4, 21.9, 50.7, 22.3);
out geom;
`;
fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Aglometer NextJS Mapping App (test@example.com)",
    "Accept": "application/json"
  },
  body: "data=" + encodeURIComponent(query)
}).then(r => r.json()).then(data => {
  const geojson = { type: "FeatureCollection", features: [] };
  data.elements.forEach(el => {
    if (el.geometry) {
      geojson.features.push({
        type: "Feature",
        properties: { name: "San" },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map(g => [g.lon, g.lat])
        }
      });
    }
  });
  fs.writeFileSync('data/san.json', JSON.stringify(geojson));
  console.log('San downloaded. Features:', geojson.features.length);
}).catch(console.error);
