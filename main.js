const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const cityInfo = document.getElementById("cityInfo");

canvas.width = 950;
canvas.height = 720;

const NODE_SIZE = 60;
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

function generateMap() {
  nodes = [];
  edges = [];

  const spacing = 150;

  // small random shift so map changes each game
  const offsetX = canvas.width / 2 + (Math.random() - 0.5) * 120;
  const offsetY = canvas.height / 2 + (Math.random() - 0.5) * 120;

  // hex grid template positions
  let positions = [];

  const radius = 2;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const x = offsetX + (q + r / 2) * spacing;
      const y = offsetY + r * spacing * 0.85;
      positions.push({ x, y });
    }
  }

  // shuffle positions
  positions.sort(() => Math.random() - 0.5);

  positions = positions.slice(0, TOTAL_NODES);

  // ownership diagonal split
  const angle = Math.random() * Math.PI;

  positions.forEach((p, i) => {
    const value = p.x * Math.cos(angle) + p.y * Math.sin(angle);
    const owner = value > 0 ? "red" : "blue";

    nodes.push(new Node(i, p.x, p.y, owner));
  });

  balanceTeams();
  createEdges();
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

function createEdges() {
  const maxDist = 170;

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

function ensureConnected() {
  const visited = new Set();

  function dfs(n) {
    visited.add(n);
    edges.forEach(e => {
      if (e[0] === n && !visited.has(e[1])) dfs(e[1]);
      if (e[1] === n && !visited.has(e[0])) dfs(e[0]);
    });
  }

  dfs(0);

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      edges.push([0, n.id]);
    }
  });
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

    const combatUnits = n.units.filter(u => u.type === "combat").length;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(combatUnits, n.x, n.y - 8);
    ctx.fillText(n.production, n.x, n.y + 14);
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
