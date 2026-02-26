const width = 900;
const height = 600;
const numPlayers = 2;
const citiesPerPlayer = 10;
const maxConnections = 3;

const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height);

let cities = [];
let edges = [];

/* -----------------------
   Create clustered cities
----------------------- */
function generateCities() {
  cities = [];
  const regionWidth = width / numPlayers;

  let id = 0;
  for (let p = 0; p < numPlayers; p++) {
    const startX = p * regionWidth;
    const endX = startX + regionWidth;

    for (let i = 0; i < citiesPerPlayer; i++) {
      cities.push({
        id: id++,
        player: p,
        x: startX + 60 + Math.random() * (regionWidth - 120),
        y: 60 + Math.random() * (height - 120),
        units: 5,
        movedUnits: 0
      });
    }
  }
}

/* -----------------------
   Geometry helpers
----------------------- */
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function linesIntersect(a, b, c, d) {
  function ccw(p1, p2, p3) {
    return (p3.y - p1.y) * (p2.x - p1.x) >
           (p2.y - p1.y) * (p3.x - p1.x);
  }
  return (
    ccw(a, c, d) !== ccw(b, c, d) &&
    ccw(a, b, c) !== ccw(a, b, d)
  );
}

function edgeWouldCross(a, b) {
  for (const e of edges) {
    const c = cities[e.source];
    const d = cities[e.target];

    if (a === c || a === d || b === c || b === d) continue;

    if (linesIntersect(a, b, c, d)) return true;
  }
  return false;
}

/* -----------------------
   Create connections
----------------------- */
function generateEdges() {
  edges = [];

  for (const city of cities) {
    const neighbors = cities
      .filter(c => c !== city)
      .sort((a, b) => distance(city, a) - distance(city, b));

    let connections = 0;

    for (const n of neighbors) {
      if (connections >= maxConnections) break;

      if (city.player !== n.player && Math.random() > 0.2) {
        continue; // mostly connect inside cluster
      }

      const exists = edges.some(e =>
        (e.source === city.id && e.target === n.id) ||
        (e.source === n.id && e.target === city.id)
      );
      if (exists) continue;

      if (edgeWouldCross(city, n)) continue;

      edges.push({ source: city.id, target: n.id });
      connections++;
    }
  }
}

/* -----------------------
   Draw map
----------------------- */
function drawMap() {
  svg.selectAll("*").remove();

  svg.selectAll("line")
    .data(edges)
    .enter()
    .append("line")
    .attr("x1", d => cities[d.source].x)
    .attr("y1", d => cities[d.source].y)
    .attr("x2", d => cities[d.target].x)
    .attr("y2", d => cities[d.target].y)
    .attr("stroke", "#888");

  const nodes = svg.selectAll("circle")
    .data(cities)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 10)
    .attr("fill", d => colorForCity(d))
    .on("click", cityClicked);

  svg.selectAll("text.cityLabel")
    .data(cities)
    .enter()
    .append("text")
    .attr("class", "cityLabel")
    .attr("x", d => d.x + 12)
    .attr("y", d => d.y + 4)
    .text(d => visibleUnitsText(d));
}

/* -----------------------
   City coloring
----------------------- */
let currentPlayer = 0;

function colorForCity(city) {
  const remaining = city.units - city.movedUnits;

  if (city.player === currentPlayer) {
    return remaining > 0 ? "#4caf50" : "#a5d6a7";
  } else {
    return "#888";
  }
}

function visibleUnitsText(city) {
  if (city.player === currentPlayer) {
    return city.units;
  }
  return "";
}

/* -----------------------
   Inspector
----------------------- */
const inspector = document.getElementById("inspector");
const moveInput = document.getElementById("moveAmount");
const moveButton = document.getElementById("moveButton");

let selectedCity = null;

function cityClicked(city) {
  selectedCity = city;
  updateInspector();
}

function updateInspector() {
  if (!selectedCity) return;

  const remaining = selectedCity.units - selectedCity.movedUnits;

  inspector.innerHTML =
    "City " + selectedCity.id +
    "<br>Units: " + selectedCity.units +
    "<br>Remaining moves: " + remaining;
}

moveButton.onclick = () => {
  if (!selectedCity) return;
  const amount = parseInt(moveInput.value);

  if (isNaN(amount)) return;

  const remaining = selectedCity.units - selectedCity.movedUnits;
  if (amount > remaining) return;

  selectedCity.movedUnits += amount;

  updateInspector();
  drawMap();
};

/* -----------------------
   Turn system
----------------------- */
document.getElementById("finishTurn").onclick = () => {
  currentPlayer = (currentPlayer + 1) % numPlayers;

  cities.forEach(c => {
    c.movedUnits = 0;
  });

  drawMap();
};

/* -----------------------
   Init
----------------------- */
generateCities();
generateEdges();
drawMap();
