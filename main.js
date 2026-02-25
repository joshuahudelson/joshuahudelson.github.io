const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const NODE_COUNT = 15;

let nodes = [];
let edges = [];

function generateNodes() {
  nodes = [];

  const minDistance = 110;
  const margin = 70;
  const maxAttempts = 5000;

  let attempts = 0;

  while (nodes.length < NODE_COUNT && attempts < maxAttempts) {
    attempts++;

    const candidate = {
      id: nodes.length,
      x: Math.random() * (width - margin * 2) + margin,
      y: Math.random() * (height - margin * 2) + margin
    };

    let valid = true;

    for (const n of nodes) {
      const dx = n.x - candidate.x;
      const dy = n.y - candidate.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        valid = false;
        break;
      }
    }

    if (valid) nodes.push(candidate);
  }

  while (nodes.length < NODE_COUNT) {
    nodes.push({
      id: nodes.length,
      x: Math.random() * (width - margin * 2) + margin,
      y: Math.random() * (height - margin * 2) + margin
    });
  }
}

function generateEdges() {
  edges = [];

  const points = nodes.map(n => [n.x, n.y]);
  const delaunay = d3.Delaunay.from(points);
  const triangles = delaunay.triangles;

  const edgeSet = new Set();

  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i];
    const b = triangles[i + 1];
    const c = triangles[i + 2];

    addEdge(a, b, edgeSet);
    addEdge(b, c, edgeSet);
    addEdge(c, a, edgeSet);
  }
}

function addEdge(a, b, edgeSet) {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (!edgeSet.has(key)) {
    edgeSet.add(key);
    edges.push([a, b]);
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  // draw edges
  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";

  for (const [a, b] of edges) {
    const n1 = nodes[a];
    const n2 = nodes[b];

    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
  }

  // draw nodes
  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
  }
}

function init() {
  generateNodes();
  generateEdges();
  draw();
}

init();
