document.addEventListener("DOMContentLoaded", () => {

  const svg = document.getElementById("map");
  const width = svg.getAttribute("width");
  const height = svg.getAttribute("height");

  const nodeRadius = 20; // 40px diameter
  const totalNodes = 14;
  const rows = 4;
  const cols = Math.ceil(totalNodes / rows);

  let nodes = [];
  let edges = [];
  let selectedNode = null;
  let currentPlayer = 1; // starting player

  const nodeInfo = document.getElementById("node-info");

  // ----------------------------
  // Generate nodes on hex grid
  // ----------------------------
  function generateNodes() {
    nodes = [];
    const xSpacing = 2 * nodeRadius * 1.1;
    const ySpacing = Math.sqrt(3) * nodeRadius * 1.1;
    let id = 0;

    for (let row = 0; row < rows; row++) {
      let y = row * ySpacing + nodeRadius;
      for (let col = 0; col < cols; col++) {
        if (id >= totalNodes) break;
        let x = col * xSpacing + nodeRadius;
        if (row % 2 === 1) x += xSpacing / 2; // stagger for hex layout

        // assign player based on random diagonal
        let diag = Math.random();
        let owner = (row + col < diag * (rows + cols)) ? 1 : 2;

        nodes.push({
          id: id++,
          x, y,
          owner,
          units: Math.floor(Math.random() * 5) + 1,
          spies: Math.floor(Math.random() * 3),
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
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= nodeRadius * 2.1) { // nearest neighbors
          edges.push({a: i, b: j});
        }
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
      circle.setAttribute("fill", n.owner===1 ? "#4a90e2" : "#e94e4e");
      circle.setAttribute("stroke", n===selectedNode ? "yellow" : "#222");
      circle.setAttribute("stroke-width", n===selectedNode ? 3 : 2);

      circle.onclick = () => {
        selectedNode = n;
        drawMap();
        updateInspector();
      };
      svg.appendChild(circle);

      // show numbers only for current player
      if (n.owner === currentPlayer) {
        const texts = [`${n.units}`, `${n.spies}`, `${n.production}`];
        texts.forEach((txt, idx) => {
          const t = document.createElementNS("http://www.w3.org/2000/svg","text");
          t.setAttribute("x", n.x);
          t.setAttribute("y", n.y - 12 + idx*10);
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
      Spies: ${selectedNode.spies}<br>
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
