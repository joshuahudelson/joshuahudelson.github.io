const width = 900;
const height = 700;

const nodeCount = 14;
const nodeRadius = 30;

const hexSizeX = 170;
const hexSizeY = 150;

let nodes = [];
let edges = [];
let activeNode = null;
let nextUnitId = 1;

const UNIT_TYPES = {
  infantry: {
    movement: 1,
    attack: 2,
    canEnterEnemy: false
  },
  cavalry: {
    movement: 2,
    attack: 3,
    canEnterEnemy: false
  },
  spy: {
    movement: 2,
    attack: 0,
    canEnterEnemy: true
  }
};

const svg = document.getElementById("map");
svg.setAttribute("width", width);
svg.setAttribute("height", height);

const edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
const nodeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");

svg.appendChild(edgeLayer);
svg.appendChild(nodeLayer);

function generateHexBoard() {
  nodes = [];

  const coords = [];
  const radius = 2;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        coords.push({ q, r });
      }
    }
  }

  coords.sort(() => Math.random() - 0.5);
  const selected = coords.slice(0, nodeCount);

  const centerX = width / 2;
  const centerY = height / 2;

  selected.forEach((c, i) => {
    const x = centerX + (c.q * hexSizeX);
    const y = centerY + (c.r * hexSizeY + c.q * hexSizeY * 0.5);

    nodes.push({
      id: i,
      q: c.q,
      r: c.r,
      x,
      y,
      owner: null,
      units: [],
      production: Math.floor(Math.random() * 3) + 1
    });
  });
}

function assignOwnershipDiagonal() {
  const angle = Math.random() * Math.PI;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const sorted = [...nodes].sort((a, b) => {
    const pa = a.x * dx + a.y * dy;
    const pb = b.x * dx + b.y * dy;
    return pa - pb;
  });

  const half = nodes.length / 2;

  sorted.forEach((node, i) => {
    node.owner = i < half ? 1 : 2;
  });
}

function spawnStartingUnits() {
  nodes.forEach(node => {
    node.units.push(createUnit("infantry", node.owner));
    node.units.push(createUnit("cavalry", node.owner));
  });
}

function createUnit(type, owner) {
  return {
    id: nextUnitId++,
    type,
    owner,
    moved: false
  };
}

function generateEdges() {
  edges = [];

  const coordMap = new Map();
  nodes.forEach(n => coordMap.set(`${n.q},${n.r}`, n.id));

  const directions = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1]
  ];

  nodes.forEach(node => {
    directions.forEach(d => {
      const key = `${node.q + d[0]},${node.r + d[1]}`;
      if (coordMap.has(key)) {
        const other = coordMap.get(key);
        if (node.id < other) {
          edges.push({ a: node.id, b: other });
        }
      }
    });
  });

  randomlyRemoveEdges();
  ensureGraphConnected();
}

function friendlyConnectionExists(nodeId, edgeList) {
  const node = nodes[nodeId];

  return edgeList.some(e => {
    const other =
      e.a === nodeId ? nodes[e.b] :
      e.b === nodeId ? nodes[e.a] :
      null;

    return other && other.owner === node.owner;
  });
}

function randomlyRemoveEdges() {
  const shuffled = [...edges].sort(() => Math.random() - 0.5);
  const removeTarget = Math.floor(edges.length / 3);

  let removed = 0;

  for (let edge of shuffled) {
    if (removed >= removeTarget) break;

    const testEdges = edges.filter(e => e !== edge);

    if (
      friendlyConnectionExists(edge.a, testEdges) &&
      friendlyConnectionExists(edge.b, testEdges)
    ) {
      edges = testEdges;
      removed++;
    }
  }
}

function getNeighbors(nodeId, edgeList = edges) {
  const result = [];
  edgeList.forEach(e => {
    if (e.a === nodeId) result.push(e.b);
    if (e.b === nodeId) result.push(e.a);
  });
  return result;
}

function getComponents() {
  const visited = new Set();
  const components = [];

  for (let node of nodes) {
    if (visited.has(node.id)) continue;

    const stack = [node.id];
    const comp = [];
    visited.add(node.id);

    while (stack.length) {
      const current = stack.pop();
      comp.push(current);

      getNeighbors(current).forEach(n => {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      });
    }

    components.push(comp);
  }

  return components;
}

function ensureGraphConnected() {
  let comps = getComponents();

  while (comps.length > 1) {
    const A = comps[0];
    const B = comps[1];

    let best = null;
    let bestDist = Infinity;

    A.forEach(a => {
      B.forEach(b => {
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        const d = Math.hypot(dx, dy);

        if (d < bestDist) {
          bestDist = d;
          best = { a, b };
        }
      });
    });

    edges.push(best);
    comps = getComponents();
  }
}

function countCombatUnits(node) {
  return node.units.filter(u => u.type !== "spy").length;
}

function drawEdges() {
  edgeLayer.innerHTML = "";

  edges.forEach(edge => {
    const a = nodes[edge.a];
    const b = nodes[edge.b];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", "#666");
    line.setAttribute("stroke-width", "3");

    edgeLayer.appendChild(line);
  });
}

function nodeColor(node) {
  if (activeNode === node.id) return "yellow";
  return node.owner === 1 ? "#d94a4a" : "#4a6fd9";
}

function drawNodes() {
  nodeLayer.innerHTML = "";

  nodes.forEach(node => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", nodeRadius);
    circle.setAttribute("fill", nodeColor(node));
    circle.setAttribute("stroke", "#222");
    circle.setAttribute("stroke-width", "2");

    circle.onclick = () => {
      activeNode = node.id;
      drawNodes();
    };

    const units = document.createElementNS("http://www.w3.org/2000/svg", "text");
    units.setAttribute("x", node.x);
    units.setAttribute("y", node.y - 8);
    units.setAttribute("text-anchor", "middle");
    units.setAttribute("font-size", "18");
    units.textContent = countCombatUnits(node);

    const production = document.createElementNS("http://www.w3.org/2000/svg", "text");
    production.setAttribute("x", node.x);
    production.setAttribute("y", node.y + 16);
    production.setAttribute("text-anchor", "middle");
    production.setAttribute("font-size", "14");
    production.textContent = node.production;

    group.appendChild(circle);
    group.appendChild(units);
    group.appendChild(production);

    nodeLayer.appendChild(group);
  });
}

function init() {
  generateHexBoard();
  assignOwnershipDiagonal();
  spawnStartingUnits();
  generateEdges();
  drawEdges();
  drawNodes();
}

init();
