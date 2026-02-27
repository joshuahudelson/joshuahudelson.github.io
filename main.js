const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const cityInfo = document.getElementById("cityInfo");

const NODE_SIZE = 60;
const TOTAL_NODES = 14;
const HEX_SPACING = 130;

let nodes = [];
let edges = [];
let selectedNode = null;

class Node {
  constructor(id, q, r, x, y, owner) {
    this.id = id;
    this.q = q;
    this.r = r;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.units = [];
    this.production = Math.floor(Math.random() * 3) + 1;
  }
}

function axialToPixel(q, r) {
  return {
    x: HEX_SPACING * (q + r / 2),
    y: HEX_SPACING * (r * 0.86)
  };
}

function generatePositions() {
  const radius = 3;
  const positions = [];

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        positions.push({ q, r });
      }
    }
  }

  positions.sort(() => Math.random() - 0.5);
  return positions.slice(0, TOTAL_NODES);
}

function generateMap() {
  nodes = [];
  edges = [];

  const positions = generatePositions();
  const pixels = positions.map(p => axialToPixel(p.q, p.r));

  const minX = Math.min(...pixels.map(p => p.x));
  const maxX = Math.max(...pixels.map(p => p.x));
  const minY = Math.min(...pixels.map(p => p.y));
  const maxY = Math.max(...pixels.map(p => p.y));

  const offsetX = canvas.width / 2 - (minX + maxX) / 2;
  const offsetY = canvas.height / 2 - (minY + maxY) / 2;

  const angle = Math.random() * Math.PI;

  positions.forEach((p, i) => {
    const pix = axialToPixel(p.q, p.r);

    const x = pix.x + offsetX;
    const y = pix.y + offsetY;

    const split = x * Math.cos(angle) + y * Math.sin(angle);
    const owner = split > 0 ? "red" : "blue";

    nodes.push(new Node(i, p.q, p.r, x, y, owner));
  });

  balanceTeams();
  buildHexEdges();
  pruneEdges();
  repairConnectivity();
}

function balanceTeams() {
  let red = nodes.filter(n => n.owner === "red");
  let blue = nodes.filter(n => n.owner === "blue");

  while (red.length > TOTAL_NODES / 2) {
    red.pop().owner = "blue";
  }

  while (blue.length > TOTAL_NODES / 2) {
    blue.pop().owner = "red";
  }
}

function buildHexEdges() {
  const dirs = [
    [1, 0], [-1, 0],
    [0, 1], [0, -1],
    [1, -1], [-1, 1]
  ];

  const map = new Map();
  nodes.forEach(n => map.set(`${n.q},${n.r}`, n));

  nodes.forEach(n => {
    dirs.forEach(d => {
      const key = `${n.q + d[0]},${n.r + d[1]}`;
      const neighbor = map.get(key);

      if (neighbor && n.id < neighbor.id) {
        edges.push([n.id, neighbor.id]);
      }
    });
  });
}

function pruneEdges() {
  edges = edges.filter(e => Math.random() > 0.33);
}

function getComponents() {
  const visited = new Set();
  const components = [];

  nodes.forEach(n => {
    if (visited.has(n.id)) return;

    const stack = [n.id];
    const comp = [];

    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;

      visited.add(id);
      comp.push(id);

      edges.forEach(e => {
        if (e[0] === id && !visited.has(e[1])) stack.push(e[1]);
        if (e[1] === id && !visited.has(e[0])) stack.push(e[0]);
      });
    }

    components.push(comp);
  });

  return components;
}

function repairConnectivity() {
  let comps = getComponents();

  while (comps.length > 1) {
    const a = comps[0];
    const b = comps[1];

    let bestEdge = null;
    let bestDist = Infinity;

    a.forEach(idA => {
      b.forEach(idB => {
        const dx = nodes[idA].x - nodes[idB].x;
        const dy = nodes[idA].y - nodes[idB].y;
        const dist = dx * dx + dy * dy;

        if (dist < bestDist) {
          bestDist = dist;
          bestEdge = [idA, idB];
        }
      });
    });

    edges.push(bestEdge);
    comps = getComponents();
  }
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

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "16px sans-serif";

    ctx.fillText(n.production, n.x, n.y + 5);
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
      cityInfo.innerHTML = `
Owner: ${n.owner}<br>
Production: ${n.production}
`;
    }
  });

  draw();
};

generateMap();
draw();
