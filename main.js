const NODE_COUNT = 15;
const MAX_CONNECTION_DISTANCE = 220;
const MIN_CONNECTIONS = 2;

const svg = document.getElementById("map");

const width = svg.clientWidth;
const height = svg.clientHeight;

let nodes = [];
let edges = [];

startGame();

function startGame() {
  generateNodes();
  generateConnectedGraph();
  render();
}

function generateNodes() {
 function generateNodes() {
  nodes = [];

  const minDistance = 120;
  const maxAttempts = 5000;

  let attempts = 0;

  while (nodes.length < NODE_COUNT && attempts < maxAttempts) {
    attempts++;

    const candidate = {
      id: nodes.length,
      x: Math.random() * (width - 60) + 30,
      y: Math.random() * (height - 60) + 30
    };

    let valid = true;

    for (const n of nodes) {
      const dx = n.x - candidate.x;
      const dy = n.y - candidate.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        valid = false;
        break;
      }
    }

    if (valid) {
      nodes.push(candidate);
    }
  }

  // Fallback: if spacing was too strict, fill remaining normally
  while (nodes.length < NODE_COUNT) {
    nodes.push({
      id: nodes.length,
      x: Math.random() * (width - 60) + 30,
      y: Math.random() * (height - 60) + 30
    });
  }
}

// Ensure the graph is connected first, then add extra edges
function generateConnectedGraph() {
function generateConnectedGraph() {
  edges = [];

  // First ensure connectivity using a spanning tree
  let connected = [0];
  let remaining = [];

  for (let i = 1; i < nodes.length; i++) {
    remaining.push(i);
  }

  while (remaining.length > 0) {
    const a = connected[Math.floor(Math.random() * connected.length)];
    const bIndex = Math.floor(Math.random() * remaining.length);
    const b = remaining[bIndex];

    edges.push({ a, b });

    connected.push(b);
    remaining.splice(bIndex, 1);
  }

  // Now add local connections based on distance
  for (let i = 0; i < nodes.length; i++) {
    let neighbors = getNeighbors(i);

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      if (edgeExists(i, j)) continue;

      const d = distance(nodes[i], nodes[j]);

      if (d < MAX_CONNECTION_DISTANCE && neighbors.length < MIN_CONNECTIONS) {
        edges.push({ a: i, b: j });
        neighbors = getNeighbors(i);
      }
    }
  }
}

function edgeExists(a, b) {
  return edges.some(e =>
    (e.a === a && e.b === b) ||
    (e.a === b && e.b === a)
  );
}

function render() {
  svg.innerHTML = "";

  drawEdges();
  drawNodes();
}

function drawEdges() {
  for (const edge of edges) {
    const a = nodes[edge.a];
    const b = nodes[edge.b];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", "black");

    svg.appendChild(line);
  }
}

function drawNodes() {
  for (const node of nodes) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 10);
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke", "black");

    svg.appendChild(circle);
  }
}
  
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getNeighbors(nodeId) {
  const result = [];

  for (const e of edges) {
    if (e.a === nodeId) result.push(e.b);
    if (e.b === nodeId) result.push(e.a);
  }

  return result;
}
