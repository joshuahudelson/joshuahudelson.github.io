const width = 700;
const height = 500;
const margin = 40;

const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height);

let currentPlayer = 0;
const numPlayers = 2;

const turnIndicator = document.getElementById("turnIndicator");
const inspector = document.getElementById("inspectorContent");
const endTurnBtn = document.getElementById("endTurn");

function updateTurnText() {
  turnIndicator.textContent = "Player " + (currentPlayer + 1) + "'s turn";
}
updateTurnText();

/* ---------------------------
Generate nodes (static positions)
--------------------------- */

const nodes = d3.range(15).map(i => ({
  id: i,
  x: margin + Math.random() * (width - margin * 2),
  y: margin + Math.random() * (height - margin * 2),
  owner: i < 7 ? 0 : i < 14 ? 1 : -1,
  units: Array.from(
    { length: i < 14 ? 3 : 0 },
    () => ({ moved: false })
  )
}));

/* ---------------------------
Edge crossing detection
--------------------------- */

function linesIntersect(a, b, c, d) {
  function ccw(p1, p2, p3) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  }
  return (
    ccw(a, c, d) !== ccw(b, c, d) &&
    ccw(a, b, c) !== ccw(a, b, d)
  );
}

/* ---------------------------
Build planar-ish graph
--------------------------- */

const links = [];

nodes.forEach(a => {
  const candidates = nodes
    .filter(b => b.id !== a.id)
    .map(b => ({
      node: b,
      dist: Math.hypot(a.x - b.x, a.y - b.y)
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  candidates.forEach(entry => {
    const b = entry.node;

    const alreadyExists = links.some(
      l =>
        (l.source === a.id && l.target === b.id) ||
        (l.source === b.id && l.target === a.id)
    );

    if (alreadyExists) return;

    const newEdge = {
      source: a.id,
      target: b.id
    };

    const aNode = nodes[a.id];
    const bNode = nodes[b.id];

    const crosses = links.some(l => {
      const c = nodes[l.source];
      const d = nodes[l.target];
      return linesIntersect(aNode, bNode, c, d);
    });

    if (!crosses) {
      links.push(newEdge);
    }
  });
});

/* ---------------------------
Draw edges
--------------------------- */

const link = svg.selectAll("line")
  .data(links)
  .enter()
  .append("line")
  .attr("x1", d => nodes[d.source].x)
  .attr("y1", d => nodes[d.source].y)
  .attr("x2", d => nodes[d.target].x)
  .attr("y2", d => nodes[d.target].y)
  .attr("stroke", "#555")
  .attr("stroke-width", 2);

/* ---------------------------
Draw nodes
--------------------------- */

const node = svg.selectAll("circle")
  .data(nodes)
  .enter()
  .append("circle")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", 18)
  .on("click", onCityClick);

const labels = svg.selectAll("text")
  .data(nodes)
  .enter()
  .append("text")
  .attr("x", d => d.x)
  .attr("y", d => d.y)
  .attr("text-anchor", "middle")
  .attr("dy", ".35em")
  .style("pointer-events", "none");

/* ---------------------------
Helpers
--------------------------- */

function movableUnits(city) {
  return city.units.filter(u => !u.moved);
}

function neighbors(city) {
  return links
    .filter(l => l.source === city.id || l.target === city.id)
    .map(l => (l.source === city.id ? nodes[l.target] : nodes[l.source]));
}

function cityColor(city) {
  if (city.owner === -1) return "#cccccc";

  const base = city.owner === 0 ? "#4a90e2" : "#e24a4a";
  const remaining = movableUnits(city).length;

  if (city.owner === currentPlayer && remaining > 0) {
    return d3.color(base).brighter(0.9);
  }

  return base;
}

function updateLabels() {
  labels.text(d => {
    if (d.owner === currentPlayer) return d.units.length;
    return "";
  });
}

function updateColors() {
  node.attr("fill", d => cityColor(d));
}

updateLabels();
updateColors();

/* ---------------------------
Inspector
--------------------------- */

let selectedCity = null;

function openInspector(city) {
  selectedCity = city;

  const available = movableUnits(city).length;

  let html = "";
  html += "Owner: " + (city.owner === -1 ? "Neutral" : "Player " + (city.owner + 1)) + "<br>";
  html += "Total Units: " + city.units.length + "<br>";
  html += "Units remaining moves: " + available + "<br><br>";

  if (city.owner === currentPlayer && available > 0) {
    html += "Move units:<br>";
    html += `<input id="moveAmount" type="number" min="1" max="${available}" value="1"><br><br>`;
    html += `<button id="moveButton">Select destination</button>`;
  }

  inspector.innerHTML = html;

  if (city.owner === currentPlayer && available > 0) {
    document.getElementById("moveButton").onclick = startMoveMode;
  }
}

function onCityClick(event, city) {
  openInspector(city);
}

/* ---------------------------
Move mode
--------------------------- */

let moveAmount = 0;
let moveSource = null;

function startMoveMode() {
  moveAmount = parseInt(document.getElementById("moveAmount").value);
  moveSource = selectedCity;
  highlightNeighbors();
}

function highlightNeighbors() {
  const n = neighbors(moveSource);

  node.attr("stroke", d => n.includes(d) ? "yellow" : null)
      .attr("stroke-width", d => n.includes(d) ? 4 : 1);

  node.on("click", (event, city) => {
    if (!n.includes(city)) return;
    performMove(city);
  });
}

function performMove(dest) {
  const movable = movableUnits(moveSource);
  const movedUnits = movable.slice(0, moveAmount);

  movedUnits.forEach(u => {
    u.moved = true;
    dest.units.push(u);
  });

  moveSource.units = moveSource.units.filter(u => !movedUnits.includes(u));

  node.attr("stroke", null);
  node.on("click", onCityClick);

  updateLabels();
  updateColors();

  openInspector(moveSource);
}

/* ---------------------------
End turn
--------------------------- */

endTurnBtn.onclick = () => {
  nodes.forEach(n => {
    n.units.forEach(u => {
      u.moved = false;
    });
  });

  currentPlayer = (currentPlayer + 1) % numPlayers;

  updateTurnText();
  updateLabels();
  updateColors();

  inspector.innerHTML = "Turn ended.";
};
