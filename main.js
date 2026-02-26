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

// ---------------------------
// Utility
// ---------------------------
function rand(min,max){return Math.random()*(max-min)+min;}
function distance(n1,n2){return Math.hypot(n1.x-n2.x,n1.y-n2.y);}

// ---------------------------
// Generate nodes with clusters
// ---------------------------
function generateNodes(){
  nodes = [];
  const margin = 50;

  const playerZones = [
    {xMin: margin, xMax: width/2 - margin},   // Player 1
    {xMin: width/2 + margin, xMax: width - margin} // Player 2
  ];

  for(let i=0;i<TOTAL_NODES;i++){
    const owner = i<TOTAL_NODES/2?1:2;
    const zone = playerZones[owner-1];

    let valid=false;
    let x,y;
    while(!valid){
      x=rand(zone.xMin,zone.xMax);
      y=rand(margin,height-margin);
      valid = nodes.every(n=>distance(n,{x,y})>50);
    }

    nodes.push({
      id:i,
      x,y,
      owner,
      units: Math.floor(Math.random()*5),
      moved: 0
    });
  }
}

// ---------------------------
// Generate planar edges using Delaunay triangulation
// ---------------------------
function generateEdges(){
  edges = [];
  const points = nodes.map(n=>[n.x,n.y]);
  const delaunay = Delaunator.from(points);
  const triangles = delaunay.triangles;

  for(let i=0;i<triangles.length;i+=3){
    const a = triangles[i], b = triangles[i+1], c = triangles[i+2];
    addEdge(a,b); addEdge(b,c); addEdge(c,a);
  }

  // Ensure at least one connection between clusters
  const cluster1 = nodes.filter(n=>n.owner===1);
  const cluster2 = nodes.filter(n=>n.owner===2);
  edges.push({a:cluster1[0].id, b:cluster2[0].id});

  function addEdge(i,j){
    if(!edges.some(e=> (e.a===i && e.b===j) || (e.a===j && e.b===i))){
      edges.push({a:i,b:j});
    }
  }
}

// ---------------------------
// Draw edges and nodes
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
// Neighbors
// ---------------------------
function neighbors(nodeId){
  return edges.filter(e=>e.a===nodeId || e.b===nodeId)
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
  edges.forEach(drawEdge);
  nodes.forEach(drawCity);
}

init();

});
