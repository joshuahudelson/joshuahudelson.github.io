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
// Generate planar edges using MST + optional extra edges
// ---------------------------
function generateEdges(){
  edges = [];

  // 1. Build all possible edges with distances
  let allEdges = [];
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      allEdges.push({a:i,b:j,dist:distance(nodes[i],nodes[j])});
    }
  }

  // 2. Sort edges by distance (shortest first)
  allEdges.sort((e1,e2)=>e1.dist - e2.dist);

  // 3. MST via Union-Find
  const parent = Array(nodes.length).fill(0).map((_,i)=>i);
  function find(u){ return parent[u]===u?u:(parent[u]=find(parent[u])); }
  function union(u,v){ parent[find(u)]=find(v); }

  for(let e of allEdges){
    if(find(e.a)!==find(e.b)){
      edges.push({a:e.a,b:e.b});
      union(e.a,e.b);
    }
  }

  // 4. Optional extra edges to make map less tree-like
  let extraEdges = 5; // tweak this number
  for(let e of allEdges){
    if(extraEdges<=0) break;
    if(!edges.some(edge=> (edge.a===e.a && edge.b===e.b) || (edge.a===e.b && edge.b===e.a))){
      edges.push({a:e.a,b:e.b});
      extraEdges--;
    }
  }

  // 5. Extra edges **inside each cluster** to strengthen cluster connectivity
  const clusters = [nodes.filter(n=>n.owner===1), nodes.filter(n=>n.owner===2)];
  clusters.forEach(cluster=>{
    let added = 0;
    while(added<3){ // add up to 3 extra intra-cluster edges
      const a = cluster[Math.floor(Math.random()*cluster.length)].id;
      const b = cluster[Math.floor(Math.random()*cluster.length)].id;
      if(a===b) continue;
      if(!edges.some(e=> (e.a===a && e.b===b) || (e.a===b && e.b===a))){
        edges.push({a,b});
        added++;
      }
    }
  });

  // 6. Multiple edges between clusters
  const cluster1 = clusters[0];
  const cluster2 = clusters[1];
  let clusterEdges = 3; // tweak this number
  for(let i=0;i<clusterEdges;i++){
    const a = cluster1[Math.floor(Math.random()*cluster1.length)].id;
    const b = cluster2[Math.floor(Math.random()*cluster2.length)].id;
    if(!edges.some(e=> (e.a===a && e.b===b) || (e.a===b && e.b===a))){
      edges.push({a,b});
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
  if(selectedCity && node.id === selectedCity.id){
    circle.setAttribute("fill", "yellow"); // active city
    circle.setAttribute("stroke", "#222");
    circle.setAttribute("stroke-width", 3);
  } else {
    circle.setAttribute("fill", node.owner===1?"#4a90e2":"#e94e4e");
    if(node.owner===currentPlayer && node.units-node.moved>0){
      circle.setAttribute("stroke","#222");
      circle.setAttribute("stroke-width",3);
    } else circle.setAttribute("stroke","none");
  }
}

function updateCityLabel(node){
  if(node.owner===currentPlayer) node.label.textContent=node.units-node.moved;
  else node.label.textContent="";
}

// ---------------------------
// Inspector
// ---------------------------
function selectCity(node){
  selectedCity = node;
  updateInspector();
  redrawCities();  // ensure colors update
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
