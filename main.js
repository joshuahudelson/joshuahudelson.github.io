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

// UI
const inspector = document.getElementById("inspector");
const moveInput = document.getElementById("moveAmount");
const moveButton = document.getElementById("moveButton");
const finishTurnButton = document.getElementById("finishTurn");
const turnInfo = document.getElementById("turnInfo");

function rand(min,max){return Math.random()*(max-min)+min;}
function distance(n1,n2){return Math.hypot(n1.x-n2.x,n1.y-n2.y);}

// ---------------------------
// Generate nodes and assign owners
// ---------------------------
function generateNodes(){
  nodes = [];
  for(let i=0;i<TOTAL_NODES;i++){
    nodes.push({
      id:i,
      x:0, y:0,
      owner: i<TOTAL_NODES/2?1:2,
      units: Math.floor(Math.random()*5),
      moved: 0
    });
  }
}

// ---------------------------
// Edge crossing check
// ---------------------------
function edgesCross(e1,e2){
  function ccw(A,B,C){return (C.y-A.y)*(B.x-A.x)>(B.y-A.y)*(C.x-A.x);}
  const A=nodes[e1.a],B=nodes[e1.b],C=nodes[e2.a],D=nodes[e2.b];
  return (ccw(A,C,D)!==ccw(B,C,D))&&(ccw(A,B,C)!==ccw(A,B,D));
}

// ---------------------------
// Generate a single connected graph
// ---------------------------
function generateEdges(){
  edges = [];
  // Start with a spanning tree connecting all nodes
  let unconnected = nodes.slice();
  let connected = [unconnected.shift()];

  while(unconnected.length>0){
    let n1 = connected[Math.floor(Math.random()*connected.length)];
    let nearest = unconnected.reduce((a,b)=>distance(n1,b)<distance(n1,a)?b:a);
    edges.push({a:n1.id,b:nearest.id});
    connected.push(nearest);
    unconnected = unconnected.filter(n=>n.id!==nearest.id);
  }

  // Add intra-player edges to form clusters
  nodes.forEach(n=>{
    const samePlayer = nodes.filter(x=>x.owner===n.owner && x.id!==n.id);
    samePlayer.forEach(target=>{
      if(edges.some(e=>e.a===n.id && e.b===target.id || e.a===target.id && e.b===n.id)) return;
      if(distance(n,target)>200) return;
      const newEdge={a:n.id,b:target.id};
      if(!edges.some(e=>edgesCross(e,newEdge))) edges.push(newEdge);
    });
  });

  // Optional extra edges (inter-player), no crossings
  let extra = TOTAL_NODES;
  for(let i=0;i<extra;i++){
    let n1 = nodes[Math.floor(Math.random()*TOTAL_NODES)];
    let n2 = nodes[Math.floor(Math.random()*TOTAL_NODES)];
    if(n1.id===n2.id) continue;
    if(edges.some(e=>e.a===n1.id && e.b===n2.id || e.a===n2.id && e.b===n1.id)) continue;
    if(distance(n1,n2)>200) continue;
    const newEdge={a:n1.id,b:n2.id};
    if(!edges.some(e=>edgesCross(e,newEdge))) edges.push(newEdge);
  }
}

// ---------------------------
// Assign positions
// ---------------------------
function assignPositions(){
  const margin = 50;
  nodes.forEach(n=>{
    n.x = rand(margin,width-margin);
    n.y = rand(margin,height-margin);
  });
}

// ---------------------------
// Draw edges and cities
// ---------------------------
function drawEdge(edge){
  const n1 = nodes[edge.a], n2 = nodes[edge.b];
  const line=document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",n1.x);
  line.setAttribute("y1",n1.y);
  line.setAttribute("x2",n2.x);
  line.setAttribute("y2",n2.y);
  line.setAttribute("stroke","#555");
  line.setAttribute("stroke-width",2);
  svg.appendChild(line);
}

function drawCity(node){
  const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");
  circle.setAttribute("cx",node.x);
  circle.setAttribute("cy",node.y);
  circle.setAttribute("r",16);
  updateCityColor(circle,node);
  circle.classList.add("city");
  circle.onclick=()=>selectCity(node);
  svg.appendChild(circle);
  node.element=circle;

  const label=document.createElementNS("http://www.w3.org/2000/svg","text");
  label.setAttribute("x",node.x);
  label.setAttribute("y",node.y+4);
  label.setAttribute("text-anchor","middle");
  label.setAttribute("font-size","12");
  svg.appendChild(label);
  node.label=label;

  updateCityLabel(node);
}

// ---------------------------
// Color and label
// ---------------------------
function updateCityColor(circle,node){
  circle.setAttribute("fill", node.owner===1?"#4a90e2":"#e94e4e");
  if(node.owner===currentPlayer && node.units-node.moved>0){
    circle.setAttribute("stroke","#222");
    circle.setAttribute("stroke-width",3);
  } else circle.setAttribute("stroke","none");
}

function updateCityLabel(node){
  if(node.owner===currentPlayer) node.label.textContent=node.units-node.moved;
  else node.label.textContent="";
}

// ---------------------------
// Inspector
// ---------------------------
function selectCity(node){
  selectedCity=node;
  updateInspector();
}

function updateInspector(){
  if(!selectedCity) return;
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
  return edges.filter(e=>e.a===nodeId || e.b===nodeId).map(e=>e.a===nodeId?e.b:e.a);
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
  if(!selectedCity) return;
  if(selectedCity.owner!==currentPlayer) return;

  const amount=parseInt(moveInput.value);
  if(isNaN(amount)) return;
  const remaining=selectedCity.units-selectedCity.moved;
  if(amount>remaining) return;

  const neigh=neighbors(selectedCity.id);
  if(neigh.length===0) return;

  const target=nodes[neigh[0]];

  selectedCity.units-=amount;
  selectedCity.moved+=amount;

  if(target.owner!==currentPlayer && amount>=target.units){
    target.owner=currentPlayer;
    target.units=amount-target.units;
  } else target.units+=amount;

  redrawCities();
  updateInspector();
};

// ---------------------------
// Finish turn
// ---------------------------
finishTurnButton.onclick = ()=>{
  currentPlayer++;
  if(currentPlayer>PLAYERS) currentPlayer=1;
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
  assignPositions();
  edges.forEach(drawEdge);
  nodes.forEach(drawCity);
}

init();

});
