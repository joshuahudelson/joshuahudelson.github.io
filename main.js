const width = 900;
const height = 700;

const nodeCount = 14;
const cols = 4; // hex layout columns
const rows = Math.ceil(nodeCount / cols);

const spacingX = 160;
const spacingY = 140;
const nodeRadius = 30;

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

function generateNodes() {
  nodes = [];

  let startX = width / 2 - ((cols - 1) * spacingX) / 2;
  let startY = height / 2 - ((rows - 1) * spacingY) / 2;

  let id = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (id >= nodeCount) break;

      const offset = r % 2 === 0 ? 0 : spacingX / 2;

      const x = startX + c * spacingX + offset;
      const y = startY + r * spacingY;

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

  const maxNeighborDist = spacingX * 1.1;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (distance(nodes[i], nodes[j]) < maxNeighborDist) {
        edges.push({
          a: nodes[i].id,
          b: nodes[j].id
        });
      }
    }
  }

  randomlyRemoveEdges();
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

    const text1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text1.setAttribute("x", node.x);
    text1.setAttribute("y", node.y - 6);
    text1.setAttribute("text-anchor", "middle");
    text1.setAttribute("font-size", "16");
    text1.textContent = node.units;

    const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text2.setAttribute("x", node.x);
    text2.setAttribute("y", node.y + 14);
    text2.setAttribute("text-anchor", "middle");
    text2.setAttribute("font-size", "14");
    text2.textContent = node.production;

    group.appendChild(circle);
    group.appendChild(text1);
    group.appendChild(text2);

    nodeLayer.appendChild(group);
  });
}

function init() {
  generateNodes();
  assignOwnershipDiagonal();
  generateEdges();
  drawEdges();
  drawNodes();
}

init();
