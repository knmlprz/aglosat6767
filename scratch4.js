const { geoMercator, geoPath } = require("d3-geo");
const gminyRaw = require("./data/stalowa-wola-gminy.json");

const FEATURES = gminyRaw.features;
const projection = geoMercator().fitSize(
  [960 - 32, 760 - 32],
  { type: "FeatureCollection", features: FEATURES }
);
const pathGen = geoPath(projection);

for (const f of FEATURES) {
  console.log(f.properties.nazwa, pathGen(f).substring(0, 100));
}
