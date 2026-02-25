const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const NODE_COUNT = 15;

let nodes = [];
let edges = [];

let currentPlayer = 1;
let selectedNode = null;

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
      owner: null,
      units: 1
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
      owner: null,
      units: 1
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

  // edges
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

  // nodes
  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);

    if (n.owner === 1) ctx.fillStyle = "#d9534f";
    else ctx.fillStyle = "#0275d8";

    ctx.fill();

    ctx.lineWidth = selectedNode === n.id ? 4 : 2;
    ctx.strokeStyle = "black";
    ctx.stroke();

    // unit count
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.units, n.x, n.y);
  }

  drawUI();
}

function drawUI() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Player " + currentPlayer + "'s turn", 10, 20);
}

function neighbors(nodeId) {
  return edges
    .filter(e => e[0] === nodeId || e[1] === nodeId)
    .map(e => (e[0] === nodeId ? e[1] : e[0]));
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;

  const clicked = nodes.find(n => {
    const dx = n.x - mx;
    const dy = n.y - my;
    return Math.sqrt(dx * dx + dy * dy) < 18;
  });

  if (!clicked) return;

  if (selectedNode === null) {
    if (clicked.owner === currentPlayer && clicked.units > 1) {
      selectedNode = clicked.id;
    }
  } else {
    if (clicked.id === selectedNode) {
      selectedNode = null;
    } else {
      attemptMove(selectedNode, clicked.id);
      selectedNode = null;
      endTurn();
    }
  }

  draw();
}

function attemptMove(fromId, toId) {
  const from = nodes[fromId];
  const to = nodes[toId];

  if (!neighbors(fromId).includes(toId)) return;

  const movingUnits = from.units - 1;
  if (movingUnits <= 0) return;

  from.units = 1;

  if (to.owner === from.owner) {
    to.units += movingUnits;
  } else {
    if (movingUnits > to.units) {
      to.owner = from.owner;
      to.units = movingUnits - to.units;
    } else {
      to.units -= movingUnits;
    }
  }
}

function endTurn() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
}

canvas.addEventListener("click", handleClick);

function init() {
  generateNodes();
  generateEdges();
  draw();
}

init();
