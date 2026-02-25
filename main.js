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
      y: Math.random() * (height - margin * 2) + margin,
      owner: null
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
      y: Math.random() * (height - margin * 2) + margin,
      owner: null
    });
  }

  assignOwnership();
}

function assignOwnership() {
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);

  shuffled.forEach((node, i) => {
    node.owner = i < NODE_COUNT / 2 ? 1 : 2;
  });
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

  pruneEdges();
}

function addEdge(a, b, edgeSet) {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (!edgeSet.has(key)) {
    edgeSet.add(key);
    edges.push([a, b]);
  }
}

function pruneEdges() {
  const keepProbability = 0.6;

  edges = edges.filter(() => Math.random() < keepProbability);

  // Ensure every node has at least one connection
  for (const node of nodes) {
    const connected = edges.some(e => e[0] === node.id || e[1] === node.id);

    if (!connected) {
      let nearest = null;
      let bestDist = Infinity;

      for (const other of nodes) {
        if (other.id === node.id) continue;

        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < bestDist) {
          bestDist = d;
          nearest = other.id;
        }
      }

      edges.push([node.id, nearest]);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#444";

  for (const [a, b] of edges) {
    const n1 = nodes[a];
    const n2 = nodes[b];

    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
  }

  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);

    if (n.owner === 1) ctx.fillStyle = "#d9534f";
    else ctx.fillStyle = "#0275d8";

    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function init() {
  generateNodes();
  generateEdges();
  draw();
}

init();
