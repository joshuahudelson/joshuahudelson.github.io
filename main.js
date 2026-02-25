const NODE_COUNT = 15;
const EXTRA_EDGE_CHANCE = 0.25;

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
  nodes = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      id: i,
      x: Math.random() * (width - 60) + 30,
      y: Math.random() * (height - 60) + 30
    });
  }
}

// Ensure the graph is connected first, then add extra edges
function generateConnectedGraph() {
  edges = [];

  let connected = [0];
  let remaining = [];

  for (let i = 1; i < nodes.length; i++) {
    remaining.push(i);
  }

  // Create a spanning tree
  while (remaining.length > 0) {
    const a = connected[Math.floor(Math.random() * connected.length)];
    const bIndex = Math.floor(Math.random() * remaining.length);
    const b = remaining[bIndex];

    edges.push({ a, b });

    connected.push(b);
    remaining.splice(bIndex, 1);
  }

  // Add extra random edges
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (!edgeExists(i, j) && Math.random() < EXTRA_EDGE_CHANCE) {
        edges.push({ a: i, b: j });
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
