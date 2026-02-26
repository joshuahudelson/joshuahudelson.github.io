document.addEventListener("DOMContentLoaded", () => {

const svg = document.getElementById("map");
const width = svg.clientWidth;
const height = svg.clientHeight;

const TOTAL_NODES = 15;
const PLAYERS = 2;

let nodes = [];
let edges = [];

let selectedCity = null;
let currentPlayer = 1;

// UI Elements
const inspector = document.getElementById("inspector");
const moveInput = document.getElementById("moveAmount");
const moveButton = document.getElementById("moveButton");
const finishTurnButton = document.getElementById("finishTurn");
const turnInfo = document.getElementById("turnInfo");

function rand(min, max) { return Math.random() * (max - min) + min; }

// ---------------------------
// Generate random nodes
// ---------------------------
function generateNodes() {
  nodes = [];
  for (let i = 0; i < TOTAL_NODES; i++) {
    nodes.push({
      id: i,
      x: rand(50, width-50),
      y: rand(50, height-50),
      owner: i < TOTAL_NODES/2 ? 1 : 2,  // roughly half-half
      units: Math.floor(Math.random()*5),
      moved: 0
    });
  }
}

// ---------------------------
// Edge helpers
// ---------------------------
function edgesCross(e1, e2) {
  function ccw(A,B,C){
    return (C.y-A.y)*(B.x-A.x) > (B.y-A.y)*(C.x-A.x);
  }
  const A = nodes[e1.a], B = nodes[e1.b];
  const C = nodes[e2.a], D = nodes[e2.b];
  return (ccw(A,C,D) != ccw(B,C,D)) && (ccw(A,B,C) != ccw(A,B,D));
}

// ---------------------------
// Generate edges ensuring no crossings
// ---------------------------
function generateEdges() {
  edges = [];

  // 1. Ensure each node has at least one edge to same-player node
  nodes.forEach(n => {
    let sameOwner = nodes.filter(x => x.owner === n.owner && x.id !== n.id);
    if (sameOwner.length === 0) return;

    let target = sameOwner[Math.floor(Math.random() * sameOwner.length)];
    // avoid duplicates
    if (!edges.some(e => (e.a===n.id && e.b===target.id) || (e.a===target.id && e.b===n.id))) {
      edges.push({a:n.id, b:target.id});
    }
  });

  // 2. Add some extra edges (intra or inter-player) randomly
  const extraEdges = TOTAL_NODES; // adjust for density
  for (let i=0;i<extraEdges;i++){
    let n1 = nodes[Math.floor(Math.random()*TOTAL_NODES)];
    let n2 = nodes[Math.floor(Math.random()*TOTAL_NODES)];
    if (n1.id===n2.id) continue;
    if (edges.some(e => (e.a===n1.id && e.b===n2.id) || (e.a===n2.id && e.b===n1.id))) continue;

    // check crossings
    const newEdge = {a:n1.id, b:n2.id};
    if (!edges.some(e => edgesCross(e,newEdge))) edges.push(newEdge);
  }
}

// ---------------------------
// Draw edges and nodes
// ---------------------------
function drawEdge(edge) {
  const n1 = nodes[edge.a], n2 = nodes[edge.b];
  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",n1.x);
  line.setAttribute("y1",n1.y);
  line.setAttribute("x2",n2.x);
  line.setAttribute("y2",n2.y);
  line.setAttribute("stroke","#555");
  line.setAttribute("stroke-width",2);
  svg.appendChild(line);
}

function drawCity(node) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
  circle.setAttribute("cx",node.x);
  circle.setAttribute("cy",node.y);
  circle.setAttribute("r",16);
  updateCityColor(circle,node);
  circle.classList.add("city");
  circle.onclick = ()=>selectCity(node);
  svg.appendChild(circle);
  node.element = circle;

  const label = document.createElementNS("http://www.w3.org/2000/svg","text");
  label.setAttribute("x",node.x);
  label.setAttribute("y",node.y+4);
  label.setAttribute("text-anchor","middle");
  label.setAttribute("font-size","12");
  svg.appendChild(label);
  node.label = label;

  updateCityLabel(node);
}

// ---------------------------
// Color and label
// ---------------------------
function updateCityColor(circle,node){
  circle.setAttribute("fill", node.owner===1?"#4a90e2":"#e94e4e");
  if (node.owner===currentPlayer && node.units-node.moved>0){
    circle.setAttribute("stroke","#222");
    circle.setAttribute("stroke-width",3);
  } else {
    circle.setAttribute("stroke","none");
  }
}

function updateCityLabel(node){
  if (node.owner===currentPlayer) node.label.textContent = node.units-node.moved;
  else node.label.textContent = "";
}

// ---------------------------
// Inspector
// ---------------------------
function selectCity(node){
  selectedCity=node;
  updateInspector();
}

function updateInspector(){
  if (!selectedCity) return;
  const remaining = selectedCity.units-selectedCity.moved;
  inspector.innerHTML=
    "City "+selectedCity.id+
    "<br>Owner: Player "+selectedCity.owner+
    "<br>Units: "+selectedCity.units+
    "<br>Units left to move: "+remaining;
}

// ---------------------------
// Neighbor helper
// ---------------------------
function neighbors(nodeId){
  return edges
    .filter(e=>e.a===nodeId || e.b===nodeId)
    .map(e=>e.a===nodeId?e.b:e.a);
}

function redrawCities(){
  nodes.forEach(n=>{
    updateCityColor(n.element,n);
    updateCityLabel(n);
  });
}

// ---------------------------
// Move units
// ---------------------------
moveButton.onclick = ()=>{
  if (!selectedCity) return;
  if (selectedCity.owner!==currentPlayer) return;

  const amount = parseInt(moveInput.value);
  if (isNaN(amount)) return;

  const remaining = selectedCity.units-selectedCity.moved;
  if (amount>remaining) return;

  const neigh = neighbors(selectedCity.id);
  if (neigh.length===0) return;

  const target = nodes[neigh[0]];

  selectedCity.units-=amount;
  selectedCity.moved+=amount;

  if (target.owner!==currentPlayer && amount>=target.units){
    target.owner=currentPlayer;
    target.units=amount-target.units;
  } else {
    target.units+=amount;
  }

  redrawCities();
  updateInspector();
};

// ---------------------------
// Finish turn
// ---------------------------
finishTurnButton.onclick = ()=>{
  currentPlayer++;
  if (currentPlayer>PLAYERS) currentPlayer=1;
  nodes.forEach(n=>n.moved=0);
  turnInfo.textContent="Current Player: "+currentPlayer;
  redrawCities();
};

// ---------------------------
// Initialize
// ---------------------------
function init(){
  generateNodes();
  generateEdges();
  edges.forEach(drawEdge);
  nodes.forEach(drawCity);
}

init();

}); // DOMContentLoaded end
