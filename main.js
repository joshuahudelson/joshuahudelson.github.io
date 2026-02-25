console.log("Game starting...");

const NODE_COUNT = 15;
const PLAYER_COUNT = 2;

const TARGET_CONNECTIONS = 3;

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
  generatePlanarGraph();
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
   PLANAR GRAPH GENERATION
----------------------------- */

function generatePlanarGraph() {
  edges = [];

  let possibleEdges = [];

  // Build list of all possible edges
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      possibleEdges.push({
        a: i,
        b: j,
        dist: distance(nodes[i], nodes[j])
      });
    }
  }

  // Short edges first
  possibleEdges.sort((e1, e2) => e1.dist - e2.dist);

  let connections = new Array(nodes.length).fill(0);

  for (const edge of possibleEdges) {
    if (connections[edge.a] >= TARGET_CONNECTIONS &&
        connections[edge.b] >= TARGET_CONNECTIONS) {
      continue;
    }

    if (!wouldIntersect(edge.a, edge.b)) {
      edges.push({ a: edge.a, b: edge.b });
      connections[edge.a]++;
      connections[edge.b]++;
    }
  }

  ensureConnected();
}

/* -----------------------------
   ENSURE GRAPH CONNECTED
----------------------------- */

function ensureConnected() {
  let visited = new Set();
  dfs(0, visited);

  while (visited.size < nodes.length) {
    let unvisited = nodes.find(n => !visited.has(n.id));

    let closestVisited = null;
    let bestDist = Infinity;

    for (const v of visited) {
      let d = distance(nodes[v], unvisited);
      if (d < bestDist) {
        bestDist = d;
        closestVisited = v;
      }
    }

    edges.push({ a: closestVisited, b: unvisited.id });
    dfs(unvisited.id, visited);
  }
}

function dfs(nodeId, visited) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  for (const e of edges) {
    if (e.a === nodeId) dfs(e.b, visited);
    if (e.b === nodeId) dfs(e.a, visited);
  }
}

/* -----------------------------
   INTERSECTION TEST
----------------------------- */

function wouldIntersect(aIndex, bIndex) {
  const a = nodes[aIndex];
  const b = nodes[bIndex];

  for (const edge of edges) {
    const c = nodes[edge.a];
    const d = nodes[edge.b];

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
  function orient(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  let o1 = orient(p1, p2, p3);
  let o2 = orient(p1, p2, p4);
  let o3 = orient(p3, p4, p1);
  let o4 = orient(p3, p4, p2);

  return o1 * o2 < 0 && o3 * o4 < 0;
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
