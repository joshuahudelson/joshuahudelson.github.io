const width = 900;
const height = 700;

const nodeCount = 14; // must be even
const nodeRadius = 30;

const spacingX = 180;
const spacingY = 155;

let nodes = [];
let edges = [];
let activeNode = null;

const svg = document.getElementById("map");
svg.setAttribute("width", width);
svg.setAttribute("height", height);

const edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
const nodeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
svg.appendChild(edgeLayer);
svg.appendChild(nodeLayer);

function generateHexGrid() {
  nodes = [];

  let cols = 4;
  let rows = Math.ceil(nodeCount / cols);

  let startX = width / 2 - ((cols - 1) * spacingX) / 2;
  let startY = height / 2 - ((rows - 1) * spacingY) / 2;

  let id = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (id >= nodeCount) break;

      let offset = r % 2 === 0 ? 0 : spacingX / 2;

      let x = startX + c * spacingX + offset;
      let y = startY + r * spacingY;

      nodes.push({
        id,
        x,
        y,
        owner: null,
        units: Math.floor(Math.random() * 4) + 1,
        production: Math.floor(Math.random() * 3) + 1
      });

      id++;
    }
  }
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function generateEdges() {
  edges = [];

  const neighborDist = spacingX * 1.15;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (distance(nodes[i], nodes[j]) < neighborDist) {
        edges.push({ a: nodes[i].id, b: nodes[j].id });
      }
    }
  }

  randomlyRemoveEdges();
  ensureGraphConnected();
}

function friendlyConnectionExists(nodeId, testEdges) {
  const node = nodes[nodeId];

  return testEdges.some(e => {
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
  const neighbors = [];

  edgeList.forEach(e => {
    if (e.a === nodeId) neighbors.push(e.b);
    if (e.b === nodeId) neighbors.push(e.a);
  });

  return neighbors;
}

function getConnectedComponents() {
  const visited = new Set();
  const components = [];

  for (let node of nodes) {
    if (visited.has(node.id)) continue;

    const stack = [node.id];
    const component = [];

    visited.add(node.id);

    while (stack.length) {
      const current = stack.pop();
      component.push(current);

      for (let n of getNeighbors(current)) {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }

    components.push(component);
  }

  return components;
}

function ensureGraphConnected() {
  let components = getConnectedComponents();

  while (components.length > 1) {
    let compA = components[0];
    let compB = components[1];

    let bestPair = null;
    let bestDist = Infinity;

    for (let a of compA) {
      for (let b of compB) {
        let d = distance(nodes[a], nodes[b]);
        if (d < bestDist) {
          bestDist = d;
          bestPair = { a, b };
        }
      }
    }

    edges.push(bestPair);
    components = getConnectedComponents();
  }
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

    const unitsText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    unitsText.setAttribute("x", node.x);
    unitsText.setAttribute("y", node.y - 6);
    unitsText.setAttribute("text-anchor", "middle");
    unitsText.setAttribute("font-size", "16");
    unitsText.textContent = node.units;

    const prodText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    prodText.setAttribute("x", node.x);
    prodText.setAttribute("y", node.y + 14);
    prodText.setAttribute("text-anchor", "middle");
    prodText.setAttribute("font-size", "14");
    prodText.textContent = node.production;

    group.appendChild(circle);
    group.appendChild(unitsText);
    group.appendChild(prodText);

    nodeLayer.appendChild(group);
  });
}

function init() {
  generateHexGrid();
  assignOwnershipDiagonal();
  generateEdges();
  drawEdges();
  drawNodes();
}

init();
