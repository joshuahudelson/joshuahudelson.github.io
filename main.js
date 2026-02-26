const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cityInfo = document.getElementById("cityInfo");

canvas.width = 900;
canvas.height = 700;

const NODE_SIZE = 60;
const GRID_COLS = 4;
const GRID_ROWS = 4; // gives 16 possible positions, we'll use 14
const TOTAL_NODES = 14;

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
  constructor(id, x, y, owner) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.units = [];
    this.production = Math.floor(Math.random() * 3) + 1;
  }
}

function generateHexGrid() {
  nodes = [];
  edges = [];

  const spacingX = 180;
  const spacingY = 150;
  const offsetX = canvas.width / 2 - spacingX * 1.5;
  const offsetY = canvas.height / 2 - spacingY * 1.5;

  let id = 0;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (id >= TOTAL_NODES) continue;

      const x = offsetX + c * spacingX + (r % 2) * spacingX / 2;
      const y = offsetY + r * spacingY;

      nodes.push(new Node(
        id,
        x,
        y,
        id < TOTAL_NODES / 2 ? "red" : "blue"
      ));

      id++;
    }
  }

  createEdges();
  ensureConnectedGraph();
  seedUnits();
}

function createEdges() {
  const maxDist = 200;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDist) {
        edges.push([i, j]);
      }
    }
  }
}

function ensureConnectedGraph() {
  const visited = new Set();

  function dfs(n) {
    visited.add(n);
    edges.forEach(e => {
      if (e[0] === n && !visited.has(e[1])) dfs(e[1]);
      if (e[1] === n && !visited.has(e[0])) dfs(e[0]);
    });
  }

  dfs(0);

  if (visited.size !== nodes.length) {
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i)) {
        edges.push([0, i]);
      }
    }
  }
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

    if (selectedNode === n) {
      ctx.fillStyle = "yellow";
    } else {
      ctx.fillStyle = n.owner;
    }

    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();

    const combatUnits = n.units.filter(u => u.type === "combat").length;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(combatUnits, n.x, n.y - 8);
    ctx.fillText(n.production, n.x, n.y + 12);
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

generateHexGrid();
draw();
