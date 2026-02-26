document.addEventListener("DOMContentLoaded", () => {

  const svg = document.getElementById("map");
  const width = svg.getAttribute("width");
  const height = svg.getAttribute("height");

  const nodeRadius = 30; // 60px diameter
  const totalNodes = 14;
  const rows = 4;
  const cols = Math.ceil(totalNodes / rows);

  let nodes = [];
  let edges = [];
  let selectedNode = null;
  let currentPlayer = 1;

  const nodeInfo = document.getElementById("node-info");

  // ----------------------------
  // Generate nodes on hex grid
  // ----------------------------
  function generateNodes() {
    nodes = [];
    const xSpacing = 4 * nodeRadius; // farther apart
    const ySpacing = Math.sqrt(3) * nodeRadius * 2; // farther apart

    // Calculate offsets to center the map
    const mapWidth = (cols - 1) * xSpacing + 2 * nodeRadius;
    const mapHeight = (rows - 1) * ySpacing + 2 * nodeRadius;
    const xOffset = (width - mapWidth) / 2 + nodeRadius;
    const yOffset = (height - mapHeight) / 2 + nodeRadius;

    let id = 0;

    for (let row = 0; row < rows; row++) {
      let y = row * ySpacing + yOffset;
      for (let col = 0; col < cols; col++) {
        if (id >= totalNodes) break;
        let x = col * xSpacing + xOffset;
        if (row % 2 === 1) x += xSpacing / 2; // stagger for hex layout

        // assign player based on random diagonal
        let diag = Math.random();
        let owner = (row + col < diag * (rows + cols)) ? 1 : 2;

        nodes.push({
          id: id++,
          x, y,
          owner,
          units: Math.floor(Math.random() * 5) + 1,
          production: Math.floor(Math.random() * 3) + 1
        });
      }
    }
  }

  // ----------------------------
  // Generate edges to nearest neighbors (hex adjacency)
  // ----------------------------
  function generateEdges() {
    edges = [];

    // Step 1: connect all immediate neighbors
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= nodeRadius * 2.1) { // immediate neighbors threshold
          edges.push({a: i, b: j});
        }
      }
    }

    // Step 2: remove ~1/3 of edges randomly, but keep friendly connections intact
    let removableEdges = edges.filter(e => {
      const na = nodes[e.a];
      const nb = nodes[e.b];
      return na.owner !== nb.owner; // only consider edges between different owners for removal
    });

    const edgesToRemove = Math.floor(removableEdges.length / 3);

    for (let k = 0; k < edgesToRemove; k++) {
      if (removableEdges.length === 0) break;
      const idx = Math.floor(Math.random() * removableEdges.length);
      const e = removableEdges[idx];

      // Check if removal would leave either node disconnected from all friendly neighbors
      const na = nodes[e.a];
      const nb = nodes[e.b];

      const aFriendlyNeighbors = edges.filter(edge => (edge.a===e.a||edge.b===e.a) &&
        (nodes[edge.a].owner===na.owner || nodes[edge.b].owner===na.owner) &&
        !(edge.a===e.a && edge.b===e.b) && !(edge.a===e.b && edge.b===e.a)
      ).length;

      const bFriendlyNeighbors = edges.filter(edge => (edge.a===e.a||edge.b===e.a) &&
        (nodes[edge.a].owner===nb.owner || nodes[edge.b].owner===nb.owner) &&
        !(edge.a===e.a && edge.b===e.b) && !(edge.a===e.b && edge.b===e.a)
      ).length;

      if (aFriendlyNeighbors>0 && bFriendlyNeighbors>0) {
        edges = edges.filter(edge => !(edge.a===e.a && edge.b===e.b) && !(edge.a===e.b && edge.b===e.a));
        removableEdges.splice(idx,1);
      } else {
        removableEdges.splice(idx,1);
      }
    }
  }

  // ----------------------------
  // Draw map
  // ----------------------------
  function drawMap() {
    svg.innerHTML = "";

    // draw edges
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

    // draw nodes
    nodes.forEach(n => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", n.x);
      circle.setAttribute("cy", n.y);
      circle.setAttribute("r", nodeRadius);
      circle.setAttribute("fill", n===selectedNode ? "yellow" : (n.owner===1 ? "#4a90e2" : "#e94e4e"));
      circle.setAttribute("stroke", "#222");
      circle.setAttribute("stroke-width", 2);

      circle.onclick = () => {
        selectedNode = n;
        drawMap();
        updateInspector();
      };
      svg.appendChild(circle);

      // show numbers only for current player: units + production
      if (n.owner === currentPlayer) {
        const texts = [`${n.units}`, `${n.production}`];
        texts.forEach((txt, idx) => {
          const t = document.createElementNS("http://www.w3.org/2000/svg","text");
          t.setAttribute("x", n.x);
          t.setAttribute("y", n.y - 7 + idx*20);
          t.setAttribute("class","node-text");
          t.textContent = txt;
          svg.appendChild(t);
        });
      }
    });
  }

  // ----------------------------
  // Update inspector info
  // ----------------------------
  function updateInspector() {
    if (!selectedNode) {
      nodeInfo.textContent = "Click a node to see details.";
      return;
    }
    nodeInfo.innerHTML = `
      Node ID: ${selectedNode.id}<br>
      Owner: ${selectedNode.owner}<br>
      Units: ${selectedNode.units}<br>
      Production: ${selectedNode.production}
    `;
  }

  // ----------------------------
  // Initialize map
  // ----------------------------
  generateNodes();
  generateEdges();
  drawMap();

});
