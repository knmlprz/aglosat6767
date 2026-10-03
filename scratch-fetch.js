const fs = require('fs');
async function run() {
  const query = `
[out:json][timeout:25];
(
  node["highway"="bus_stop"](50.36,21.84,50.83,22.27);
  node["railway"="station"](50.36,21.84,50.83,22.27);
  node["railway"="halt"](50.36,21.84,50.83,22.27);
);
out body;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  console.log("Fetching GET...");
  
  const res = await fetch(url);
  const text = await res.text();
  fs.writeFileSync('./data/stops.json', text);
  console.log("Saved bytes:", text.length, "Code:", res.status);
}
run();
