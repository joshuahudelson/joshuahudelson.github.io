const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const cityInfo = document.getElementById("cityInfo");

canvas.width = 950;
canvas.height = 720;

const NODE_SIZE = 60;
const TOTAL_NODES = 14;

const HEX_SPACING = 120;

let nodes = [];
let edges = [];
let selectedNode = null;

class Unit {
  constructor(type, owner) {
    this.type = type;
    this.owner = owner;

    if (type === "combat") {
      this.attack = 2;
      this.defense = 2;
      this.movement = 1;
    }

    if (type === "spy") {
      this.skill = 2;
      this.movement = 2;
    }
  }
}

class Node {
  constructor(id, q, r, x, y, owner) {
    this.id = id;
    this.q = q;
    this.r = r;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.units = [];
    this.production = Math.floor(Math.random() * 3) + 1;
  }
}

/*
Generate a hex grid that always fits in the canvas
*/
function generateHexPositions() {
  const positions = [];

  const radius = 3; // gives enough positions to sample from

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        positions.push({ q, r });
      }
    }
  }

  return positions;
}

function axialToPixel(q, r) {
  const x = HEX_SPACING * (q + r / 2);
  const y = HEX_SPACING * (r * 0.86);

  return { x, y };
}

function generateMap() {
  nodes = [];
  edges = [];

  const hexPositions = generateHexPositions();

  // shuffle
  hexPositions.sort(() => Math.random() - 0.5);

  const chosen = hexPositions.slice(0, TOTAL_NODES);

  // center the grid
  const pixels = chosen.map(p => axialToPixel(p.q, p.r));

  const minX = Math.min(...pixels.map(p => p.x));
  const maxX = Math.max(...pixels.map(p => p.x));
  const minY = Math.min(...pixels.map(p => p.y));
  const maxY = Math.max(...pixels.map(p => p.y));

  const offsetX = canvas.width / 2 - (minX + maxX) / 2;
  const offsetY = canvas.height / 2 - (minY + maxY) / 2;

  // diagonal ownership
  const angle = Math.random() * Math.PI;

  chosen.forEach((p, i) => {
    const pixel = axialToPixel(p.q, p.r);

    const x = pixel.x + offsetX;
    const y = pixel.y + offsetY;

    const value = x * Math.cos(angle) + y * Math.sin(angle);
    const owner = value > 0 ? "red" : "blue";

    nodes.push(new Node(i, p.q, p.r, x, y, owner));
  });

  balanceTeams();
  buildHexEdges();
  ensureConnected();
  seedUnits();
}

function balanceTeams() {
  let red = nodes.filter(n => n.owner === "red");
  let blue = nodes.filter(n => n.owner === "blue");

  while (red.length > TOTAL_NODES / 2) {
    const n = red.pop();
    n.owner = "blue";
    blue.push(n);
  }

  while (blue.length > TOTAL_NODES / 2) {
    const n = blue.pop();
    n.owner = "red";
    red.push(n);
  }
}

/*
Only connect real hex neighbors
*/
function buildHexEdges() {
  const neighborDirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1]
  ];

  const map = new Map();

  nodes.forEach(n => {
    map.set(`${n.q},${n.r}`, n);
  });

  nodes.forEach(n => {
    neighborDirs.forEach(dir => {
      const q = n.q + dir[0];
      const r = n.r + dir[1];

      const neighbor = map.get(`${q},${r}`);

      if (neighbor && n.id < neighbor.id) {
        edges.push([n.id, neighbor.id]);
      }
    });
  });

  randomlyRemoveEdges();
}

/*
Remove about 1/3 edges but keep friendly connection
*/
function randomlyRemoveEdges() {
  const keep = [];

  edges.forEach(e => {
    if (Math.random() < 0.33) {
      const a = nodes[e[0]];
      const b = nodes[e[1]];

      const friendly =
        a.owner === b.owner &&
        friendlyConnections(a.id) <= 1 &&
        friendlyConnections(b.id) <= 1;

      if (friendly) keep.push(e);
    } else {
      keep.push(e);
    }
  });

  edges = keep;
}

function friendlyConnections(id) {
  let count = 0;
  edges.forEach(e => {
    const a = nodes[e[0]];
    const b = nodes[e[1]];
    if (
      (e[0] === id || e[1] === id) &&
      a.owner === b.owner
    ) {
      count++;
    }
  });
  return count;
}

/*
Ensure entire graph is connected
*/
function ensureConnected() {
  const visited = new Set();

  function dfs(id) {
    visited.add(id);
    edges.forEach(e => {
      if (e[0] === id && !visited.has(e[1])) dfs(e[1]);
      if (e[1] === id && !visited.has(e[0])) dfs(e[0]);
    });
  }

  dfs(nodes[0].id);

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const nearest = findNearestConnected(n.id);
      edges.push([n.id, nearest]);
      dfs(n.id);
    }
  });
}

function findNearestConnected(id) {
  let best = 0;
  let bestDist = Infinity;

  nodes.forEach(n => {
    if (n.id === id) return;
    const dx = nodes[id].x - n.x;
    const dy = nodes[id].y - n.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = n.id;
    }
  });

  return best;
}

function seedUnits() {
  nodes.forEach(n => {
    n.units.push(new Unit("combat", n.owner));
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  edges.forEach(e => {
    const a = nodes[e[0]];
    const b = nodes[e[1]];

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "#555";
    ctx.stroke();
  });

  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, NODE_SIZE / 2, 0, Math.PI * 2);

    ctx.fillStyle = selectedNode === n ? "yellow" : n.owner;
    ctx.fill();

    ctx.strokeStyle = "#000";
    ctx.stroke();

    const combat = n.units.filter(u => u.type === "combat").length;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "16px sans-serif";

    ctx.fillText(combat, n.x, n.y - 8);
    ctx.fillText(n.production, n.x, n.y + 16);
  });
}

canvas.onclick = function (e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  nodes.forEach(n => {
    const dx = n.x - mx;
    const dy = n.y - my;

    if (Math.sqrt(dx * dx + dy * dy) < NODE_SIZE / 2) {
      selectedNode = n;
      updateInspector();
    }
  });

  draw();
};

function updateInspector() {
  if (!selectedNode) return;

  const combat = selectedNode.units.filter(u => u.type === "combat").length;

  cityInfo.innerHTML = `
Owner: ${selectedNode.owner}<br>
Combat Units: ${combat}<br>
Production: ${selectedNode.production}
`;
}

generateMap();
draw();
