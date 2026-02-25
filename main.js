console.log("Game starting...");

const NODE_COUNT = 15;
const PLAYER_COUNT = 2;

const MAX_CONNECTION_DISTANCE = 220;
const MIN_CONNECTIONS = 2;

const MAP_PADDING = 80;
const MIN_CITY_DISTANCE = 130;

const svg = document.getElementById("map");

const width = svg.clientWidth;
const height = svg.clientHeight;

let nodes = [];
let edges = [];
let players = [];

startGame();

function startGame() {
  createPlayers();
  generateNodes();
  generateConnectedGraph();
  assignOwnership();
  render();
}

/* -----------------------------
   PLAYERS
----------------------------- */

function createPlayers() {
  players = [
    { id: 0, color: "#3b82f6" },
    { id: 1, color: "#ef4444" }
  ];
}

/* -----------------------------
   NODE GENERATION
----------------------------- */

function generateNodes() {
  nodes = [];

  let attempts = 0;
  const maxAttempts = 5000;

  while (nodes.length < NODE_COUNT && attempts < maxAttempts) {
    attempts++;

    const candidate = {
      id: nodes.length,
      x: Math.random() * (width - MAP_PADDING * 2) + MAP_PADDING,
      y: Math.random() * (height - MAP_PADDING * 2) + MAP_PADDING,
      owner: null,
      units: 1
    };

    let valid = true;

    for (const n of nodes) {
      if (distance(n, candidate) < MIN_CITY_DISTANCE) {
        valid = false;
        break;
      }
    }

    if (valid) nodes.push(candidate);
  }

  while (nodes.length < NODE_COUNT) {
    nodes.push({
      id: nodes.length,
      x: Math.random() * (width - MAP_PADDING * 2) + MAP_PADDING,
      y: Math.random() * (height - MAP_PADDING * 2) + MAP_PADDING,
      owner: null,
      units: 1
    });
  }
}

/* -----------------------------
   GRAPH GENERATION
----------------------------- */

function generateConnectedGraph() {
  edges = [];

  let connected = [0];
  let remaining = [];

  for (let i = 1; i < nodes.length; i++) remaining.push(i);

  // Spanning tree (guarantees connectivity)
  while (remaining.length > 0) {
    const a = connected[Math.floor(Math.random() * connected.length)];
    const bIndex = Math.floor(Math.random() * remaining.length);
    const b = remaining[bIndex];

    if (!wouldIntersect(a, b)) {
      edges.push({ a, b });
      connected.push(b);
      remaining.splice(bIndex, 1);
    }
  }

  // Add nearby edges without crossings
  for (let i = 0; i < nodes.length; i++) {
    let neighbors = getNeighbors(i);

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      if (edgeExists(i, j)) continue;

      const d = distance(nodes[i], nodes[j]);

      if (
        d < MAX_CONNECTION_DISTANCE &&
        neighbors.length < MIN_CONNECTIONS &&
        !wouldIntersect(i, j)
      ) {
        edges.push({ a: i, b: j });
        neighbors = getNeighbors(i);
      }
    }
  }
}

/* -----------------------------
   INTERSECTION CHECK
----------------------------- */

function wouldIntersect(aIndex, bIndex) {
  const a = nodes[aIndex];
  const b = nodes[bIndex];

  for (const edge of edges) {
    const c = nodes[edge.a];
    const d = nodes[edge.b];

    // Ignore shared endpoints
    if (
      edge.a === aIndex ||
      edge.b === aIndex ||
      edge.a === bIndex ||
      edge.b === bIndex
    ) continue;

    if (linesIntersect(a, b, c, d)) return true;
  }

  return false;
}

function linesIntersect(p1, p2, p3, p4) {
  function ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/* -----------------------------
   OWNERSHIP
----------------------------- */

function assignOwnership() {
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);

  shuffled.forEach((node, i) => {
    node.owner = i % PLAYER_COUNT;
  });
}

/* -----------------------------
   HELPERS
----------------------------- */

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

function edgeExists(a, b) {
  return edges.some(
    e => (e.a === a && e.b === b) || (e.a === b && e.b === a)
  );
}

/* -----------------------------
   RENDER
----------------------------- */

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
    line.setAttribute("stroke", "#444");

    svg.appendChild(line);
  }
}

function drawNodes() {
  for (const node of nodes) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    const player = players[node.owner];

    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 12);
    circle.setAttribute("fill", player.color);
    circle.setAttribute("stroke", "black");

    svg.appendChild(circle);
  }
}
