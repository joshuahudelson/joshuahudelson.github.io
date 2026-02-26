document.addEventListener("DOMContentLoaded", () => {

  const svg = document.getElementById("map");
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));

  const nodeRadius = 30; // 60px diameter
  const totalNodes = 14;
  const rows = 4;
  const cols = Math.ceil(totalNodes / rows);

  let nodes = [];
  let edges = [];
  let selectedNode = null;
  let currentPlayer = 1;

  const nodeInfo = document.getElementById("node-info");

  // spacing (larger than before)
  const xSpacing = 5 * nodeRadius;
  const ySpacing = Math.sqrt(3) * nodeRadius * 2.2;

  // center the map
  const mapWidth = (cols - 1) * xSpacing + xSpacing;
  const mapHeight = (rows - 1) * ySpacing + ySpacing;
  const xOffset = (width - mapWidth) / 2 + nodeRadius;
  const yOffset = (height - mapHeight) / 2 + nodeRadius;

  let gridIndex = []; // track node positions in grid

  function generateNodes() {
    nodes = [];
    gridIndex = [];

    let id = 0;

    // random diagonal for ownership
    const diagAngle = Math.random() * Math.PI;

    for (let row = 0; row < rows; row++) {
      gridIndex[row] = [];

      for (let col = 0; col < cols; col++) {
        if (id >= totalNodes) break;

        let x = col * xSpacing + xOffset;
        let y = row * ySpacing + yOffset;

        if (row % 2 === 1) x += xSpacing / 2;

        // diagonal ownership split
        const value = x * Math.cos(diagAngle) + y * Math.sin(diagAngle);
        const owner = value % 2 > 1 ? 1 : 2;

        nodes.push({
          id,
          row,
          col,
          x,
          y,
          owner,
          units: Math.floor(Math.random() * 5) + 1,
          production: Math.floor(Math.random() * 3) + 1
        });

        gridIndex[row][col] = id;

        id++;
      }
    }
  }

  // Build hex-grid adjacency directly
  function generateEdges() {
    edges = [];

    const directionsEven = [
      [0, -1], [0, 1],
      [-1, 0], [-1, -1],
      [1, 0], [1, -1]
    ];

    const directionsOdd = [
      [0, -1], [0, 1],
      [-1, 1], [-1, 0],
      [1, 1], [1, 0]
    ];

    nodes.forEach(node => {
      const dirs = node.row % 2 === 0 ? directionsEven : directionsOdd;

      dirs.forEach(d => {
        const r = node.row + d[0];
        const c = node.col + d[1];

        if (
          r >= 0 &&
          r < gridIndex.length &&
          c >= 0 &&
          c < (gridIndex[r] || []).length
        ) {
          const neighborId = gridIndex[r][c];
          if (neighborId !== undefined) {
            const a = node.id;
            const b = neighborId;

            if (!edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) {
              edges.push({ a, b });
            }
          }
        }
      });
    });

    pruneEdges();
  }

  // Remove ~1/3 edges safely
  function pruneEdges() {
    const targetRemove = Math.floor(edges.length / 3);

    let attempts = 0;
    let removed = 0;

    while (removed < targetRemove && attempts < 200) {
      attempts++;

      const idx = Math.floor(Math.random() * edges.length);
      const edge = edges[idx];

      const a = nodes[edge.a];
      const b = nodes[edge.b];

      // simulate removal
      const remaining = edges.filter((_, i) => i !== idx);

      const aFriendly = remaining.some(e =>
        (e.a === a.id || e.b === a.id) &&
        nodes[e.a].owner === a.owner &&
        nodes[e.b].owner === a.owner
      );

      const bFriendly = remaining.some(e =>
        (e.a === b.id || e.b === b.id) &&
        nodes[e.a].owner === b.owner &&
        nodes[e.b].owner === b.owner
      );

      if (aFriendly && bFriendly) {
        edges.splice(idx, 1);
        removed++;
      }
    }
  }

  function drawMap() {
    svg.innerHTML = "";

    edges.forEach(e => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", nodes[e.a].x);
      line.setAttribute("y1", nodes[e.a].y);
      line.setAttribute("x2", nodes[e.b].x);
      line.setAttribute("y2", nodes[e.b].y);
      line.setAttribute("stroke", "#000");
      line.setAttribute("stroke-width", 2);
      svg.appendChild(line);
    });

    nodes.forEach(n => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", n.x);
      circle.setAttribute("cy", n.y);
      circle.setAttribute("r", nodeRadius);
      circle.setAttribute(
        "fill",
        n === selectedNode
          ? "yellow"
          : (n.owner === 1 ? "#4a90e2" : "#e94e4e")
      );

      circle.setAttribute("stroke", "#222");
      circle.setAttribute("stroke-width", 2);

      circle.onclick = () => {
        selectedNode = n;
        drawMap();
        updateInspector();
      };

      svg.appendChild(circle);

      if (n.owner === currentPlayer) {
        const values = [n.units, n.production];

        values.forEach((v, i) => {
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", n.x);
          t.setAttribute("y", n.y - 10 + i * 22);
          t.setAttribute("class", "node-text");
          t.textContent = v;
          svg.appendChild(t);
        });
      }
    });
  }

  function updateInspector() {
    if (!selectedNode) {
      nodeInfo.textContent = "Click a node.";
      return;
    }

    nodeInfo.innerHTML = `
      Node ${selectedNode.id}<br>
      Owner: ${selectedNode.owner}<br>
      Units: ${selectedNode.units}<br>
      Production: ${selectedNode.production}
    `;
  }

  generateNodes();
  generateEdges();
  drawMap();

});
