window.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const NODE_COUNT = 14;
const NODE_RADIUS = 30; // diameter = 60
const MIN_DISTANCE = 160;

let nodes = [];
let edges = [];
let units = [];
let selectedNode = null;
let currentPlayer = 0;

class Unit {
  constructor(type, owner, nodeId) {
    this.type = type;
    this.owner = owner;
    this.nodeId = nodeId;
    this.hasMoved = false;

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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function generateNodes() {
  nodes = [];

  let attempts = 0;
  while (nodes.length < NODE_COUNT && attempts < 10000) {
    attempts++;

    let x = Math.random() * (canvas.width - 200) + 100;
    let y = Math.random() * (canvas.height - 200) + 100;

    let valid = true;
    for (let n of nodes) {
      if (distance({ x, y }, n) < MIN_DISTANCE) {
        valid = false;
        break;
      }
    }

    if (valid) {
      nodes.push({
        id: nodes.length,
        x,
        y,
        owner: null
      });
    }
  }
}

function connectNeighbors() {
  edges = [];

  for (let i = 0; i < nodes.length; i++) {
    let distances = nodes
      .map((n, j) => ({
        j,
        d: distance(nodes[i], n)
      }))
      .filter(o => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    for (let item of distances) {
      let a = i;
      let b = item.j;

      if (!edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) {
        edges.push({ a, b });
      }
    }
  }
}

function removeRandomEdges() {
  let removeCount = Math.floor(edges.length / 3);

  for (let i = 0; i < removeCount; i++) {
    let index = Math.floor(Math.random() * edges.length);
    edges.splice(index, 1);
  }
}

function ensureConnectedGraph() {
  let visited = new Set();

  function dfs(id) {
    visited.add(id);
    for (let e of edges) {
      let next = null;
      if (e.a === id) next = e.b;
      if (e.b === id) next = e.a;
      if (next !== null && !visited.has(next)) {
        dfs(next);
      }
    }
  }

  dfs(0);

  for (let i = 0; i < nodes.length; i++) {
    if (!visited.has(i)) {
      edges.push({ a: i, b: 0 });
      dfs(i);
    }
  }
}

function assignOwnership() {
  let sorted = [...nodes].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  let half = Math.floor(nodes.length / 2);

  for (let i = 0; i < sorted.length; i++) {
    sorted[i].owner = i < half ? 0 : 1;
  }
}

function createStartingUnits() {
  units = [];

  for (let node of nodes) {
    units.push(new Unit("combat", node.owner, node.id));
  }
}

function getUnitsAtNode(nodeId) {
  return units.filter(u => u.nodeId === nodeId);
}

function getCombatUnitsAtNode(nodeId) {
  return units.filter(u => u.nodeId === nodeId && u.type === "combat");
}

function getDefendingUnit(nodeId, attackerOwner) {
  return units.find(
    u =>
      u.nodeId === nodeId &&
      u.owner !== attackerOwner &&
      u.type === "combat"
  );
}

function removeUnit(unit) {
  units = units.filter(u => u !== unit);
}

function resolveCombat(attacker, defender) {
  let attackRoll = attacker.attack + Math.floor(Math.random() * 3);
  let defenseRoll = defender.defense + Math.floor(Math.random() * 3);

  return attackRoll >= defenseRoll ? "attackerWins" : "defenderWins";
}

function captureCity(attacker, nodeId) {
  nodes[nodeId].owner = attacker.owner;
  attacker.nodeId = nodeId;
  attacker.hasMoved = true;
}

function attackCity(attacker, nodeId) {
  let defender = getDefendingUnit(nodeId, attacker.owner);

  if (!defender) {
    captureCity(attacker, nodeId);
    return;
  }

  let result = resolveCombat(attacker, defender);

  if (result === "attackerWins") {
    removeUnit(defender);

    let anotherDefender = getDefendingUnit(nodeId, attacker.owner);

    if (!anotherDefender) {
      captureCity(attacker, nodeId);
    } else {
      attacker.hasMoved = true;
    }
  } else {
    removeUnit(attacker);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;

  for (let e of edges) {
    let a = nodes[e.a];
    let b = nodes[e.b];

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);

    if (selectedNode === n.id) {
      ctx.fillStyle = "yellow";
    } else {
      ctx.fillStyle = n.owner === 0 ? "#4a90e2" : "#e94e4e";
    }

    ctx.fill();
    ctx.stroke();

    // show ONLY combat units
    let combatCount = getCombatUnitsAtNode(n.id).length;

    if (combatCount > 0) {
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "16px sans-serif";
      ctx.fillText(combatCount, n.x, n.y);
    }
  }
}

canvas.onclick = function (e) {
  let rect = canvas.getBoundingClientRect();
  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;

  for (let n of nodes) {
    if (distance({ x: mx, y: my }, n) < NODE_RADIUS) {
      selectedNode = n.id;
      draw();
      return;
    }
  }
};

function generateMap() {
  generateNodes();
  connectNeighbors();
  removeRandomEdges();
  ensureConnectedGraph();
  assignOwnership();
  createStartingUnits();
  draw();
}

generateMap();

});
