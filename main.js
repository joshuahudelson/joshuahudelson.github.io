const svg = document.getElementById("map");
const width = svg.clientWidth;
const height = svg.clientHeight;

const TOTAL_NODES = 15;
const PLAYERS = 2;
const NODES_PER_CLUSTER = Math.floor(TOTAL_NODES / PLAYERS);

let nodes = [];
let edges = [];

let selectedCity = null;
let currentPlayer = 1;

// UI
const inspector = document.getElementById("inspector");
const moveInput = document.getElementById("moveAmount");
const moveButton = document.getElementById("moveButton");
const finishTurnButton = document.getElementById("finishTurn");
const turnInfo = document.getElementById("turnInfo");

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function generateClusters() {
  const margin = 80;

  for (let p = 0; p < PLAYERS; p++) {
    const clusterCenterX =
      p === 0 ? width * 0.3 : width * 0.7;
    const clusterCenterY = height / 2;

    let clusterNodes = [];

    for (let i = 0; i < NODES_PER_CLUSTER; i++) {
      const node = {
        id: nodes.length,
        x: clusterCenterX + rand(-120, 120),
        y: clusterCenterY + rand(-120, 120),
        owner: p + 1,
        units: Math.floor(Math.random() * 3),
        moved: 0
      };

      nodes.push(node);
      clusterNodes.push(node);
    }

    // Connect cluster as a tree (no crossings)
    for (let i = 1; i < clusterNodes.length; i++) {
      edges.push({
        a: clusterNodes[i - 1].id,
        b: clusterNodes[i].id
      });
    }
  }

  // One bridge between clusters
  edges.push({
    a: 0,
    b: NODES_PER_CLUSTER
  });
}

function drawEdge(edge) {
  const n1 = nodes[edge.a];
  const n2 = nodes[edge.b];

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", n1.x);
  line.setAttribute("y1", n1.y);
  line.setAttribute("x2", n2.x);
  line.setAttribute("y2", n2.y);
  line.setAttribute("stroke", "#555");
  line.setAttribute("stroke-width", 2);

  svg.appendChild(line);
}

function drawCity(node) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

  circle.setAttribute("cx", node.x);
  circle.setAttribute("cy", node.y);
  circle.setAttribute("r", 16);

  updateCityColor(circle, node);

  circle.classList.add("city");

  circle.onclick = () => selectCity(node);

  svg.appendChild(circle);

  node.element = circle;

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", node.x);
  label.setAttribute("y", node.y + 4);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "12");

  svg.appendChild(label);

  node.label = label;

  updateCityLabel(node);
}

function updateCityColor(circle, node) {
  if (node.owner === 1) circle.setAttribute("fill", "#4a90e2");
  else circle.setAttribute("fill", "#e94e4e");

  if (node.owner === currentPlayer && node.units > node.moved) {
    circle.setAttribute("stroke", "#222");
    circle.setAttribute("stroke-width", 3);
  } else {
    circle.setAttribute("stroke", "none");
  }
}

function updateCityLabel(node) {
  if (node.owner === currentPlayer) {
    node.label.textContent = node.units;
  } else {
    node.label.textContent = "";
  }
}

function selectCity(node) {
  selectedCity = node;

  inspector.innerHTML =
    "City " + node.id +
    "<br>Owner: Player " + node.owner +
    "<br>Units: " + node.units +
    "<br>Units with moves left: " + (node.units - node.moved);
}

function redrawCities() {
  nodes.forEach(n => {
    updateCityColor(n.element, n);
    updateCityLabel(n);
  });
}

function neighbors(nodeId) {
  return edges
    .filter(e => e.a === nodeId || e.b === nodeId)
    .map(e => (e.a === nodeId ? e.b : e.a));
}

moveButton.onclick = () => {
  if (!selectedCity) return;
  if (selectedCity.owner !== currentPlayer) return;

  const amount = parseInt(moveInput.value);
  if (isNaN(amount)) return;

  if (selectedCity.moved + amount > selectedCity.units) return;

  const neigh = neighbors(selectedCity.id);
  if (neigh.length === 0) return;

  const target = nodes[neigh[0]];

  selectedCity.units -= amount;
  selectedCity.moved += amount;

  if (target.owner !== currentPlayer && amount >= target.units) {
    target.owner = currentPlayer;
    target.units = amount - target.units;
  } else {
    target.units += amount;
  }

  redrawCities();
  selectCity(selectedCity);
};

finishTurnButton.onclick = () => {
  currentPlayer++;
  if (currentPlayer > PLAYERS) currentPlayer = 1;

  nodes.forEach(n => {
    n.moved = 0;
  });

  turnInfo.textContent = "Current Player: " + currentPlayer;
  redrawCities();
};

function init() {
  generateClusters();

  edges.forEach(drawEdge);
  nodes.forEach(drawCity);
}

init();
