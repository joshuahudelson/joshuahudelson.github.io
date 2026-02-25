const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const NODE_COUNT = 15;

let nodes = [];
let edges = [];

let currentPlayer = 1;
let selectedNode = null;

let movedThisTurn = new Set();

const inspector = document.getElementById("inspector");
const moveInput = document.getElementById("moveCount");
const endTurnButton = document.getElementById("endTurnButton");

function generateNodes() {
  nodes = [];

  const minDistance = 110;
  const margin = 70;

  while (nodes.length < NODE_COUNT) {
    const candidate = {
      id: nodes.length,
      x: Math.random() * (width - margin * 2) + margin,
      y: Math.random() * (height - margin * 2) + margin,
      owner: null,
      units: 3
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
    addEdge(triangles[i], triangles[i + 1], edgeSet);
    addEdge(triangles[i + 1], triangles[i + 2], edgeSet);
    addEdge(triangles[i + 2], triangles[i], edgeSet);
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

function neighbors(nodeId) {
  return edges
    .filter(e => e[0] === nodeId || e[1] === nodeId)
    .map(e => (e[0] === nodeId ? e[1] : e[0]));
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

  if (selectedNode !== null) {
    const neighborIds = neighbors(selectedNode);

    for (const nId of neighborIds) {
      const n = nodes[nId];

      ctx.beginPath();
      ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);

      if (n.owner === currentPlayer) {
        ctx.fillStyle = "rgba(0,200,0,0.3)";
      } else {
        ctx.fillStyle = "rgba(255,165,0,0.3)";
      }

      ctx.fill();
    }
  }

  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);

    ctx.fillStyle = n.owner === 1 ? "#d9534f" : "#0275d8";
    ctx.fill();

    ctx.lineWidth = selectedNode === n.id ? 4 : 2;
    ctx.strokeStyle = "black";
    ctx.stroke();

    if (n.owner === currentPlayer) {
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.units, n.x, n.y);
    }
  }

  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Player " + currentPlayer + "'s turn", 10, 20);
}

function showInspector(node) {
  inspector.innerHTML = `
    <strong>City:</strong> ${node.id}<br>
    <strong>Owner:</strong> Player ${node.owner}<br>
    <strong>Units:</strong> ${node.units}<br>
    Move units:
  `;

  moveInput.max = node.units;
  moveInput.value = Math.min(1, node.units);
}

function attemptMove(fromId, toId, movingUnits) {
  const from = nodes[fromId];
  const to = nodes[toId];

  if (!neighbors(fromId).includes(toId)) return;
  if (movingUnits <= 0) return;
  if (movingUnits > from.units) movingUnits = from.units;

  from.units -= movingUnits;

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

  movedThisTurn.add(fromId);
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
    if (
      clicked.owner === currentPlayer &&
      clicked.units > 0 &&
      !movedThisTurn.has(clicked.id)
    ) {
      selectedNode = clicked.id;
      showInspector(clicked);
    }
  } else {
    if (clicked.id === selectedNode) {
      selectedNode = null;
      inspector.innerHTML = "Click a city to see details";
    } else {
      const unitsToMove = parseInt(moveInput.value);
      attemptMove(selectedNode, clicked.id, unitsToMove);

      selectedNode = null;
      inspector.innerHTML = "Click a city to see details";
    }
  }

  draw();
}

function endTurn() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  movedThisTurn.clear();
  selectedNode = null;
  inspector.innerHTML = "Click a city to see details";
  draw();
}

canvas.addEventListener("click", handleClick);
endTurnButton.addEventListener("click", endTurn);

function init() {
  generateNodes();
  generateEdges();
  draw();
}

init();
