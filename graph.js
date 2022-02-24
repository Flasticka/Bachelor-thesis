
var allNodes = {};

/*
    Constats and variables for skeleton visualization from
        Jan Sedmidubsky, Brno, Czech Republic, sedmidubsky@gmail.com
*/
const bonesVicon = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, {a: 4, b: 5}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, {a: 9, b: 10}, // leg
    {a: 0, b: 11}, {a: 11, b: 12}, {a: 12, b: 13}, {a: 13, b: 14}, {a: 14, b: 15}, {a: 15, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 20}, {a: 20, b: 21}, {a: 21, b: 22}, {a: 20, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 27}, {a: 27, b: 28}, {a: 28, b: 29}, {a: 27, b: 30}]; // hand
const FPS = 120;

var px = 0;
var py = 0;
var rotating = false;

/** 
 * Class, used to represent a single node. 
 */
class Node{
    /**
     * Constructor of Node class.
     * @param  {string} name node name
     * @param  {Cluster} defaultCluster default cluster of node (the cluster where node appears for the first time) 
     */
    constructor(name,defaultCluster){
        this.name = name;
        this.label = name.split('_')[1];
        this.image = null;
        this.visualization = null;
        this.sameSequence = [];
        this.sameLabel= [];
        this.sequence = null;
        this.currentCluster = defaultCluster;
        this.defaultCluster = defaultCluster;
        this.currentGraphNodeVisualization = null;
    }
}

/** 
 * Class, used to represent a cluster.
 */
class Cluster{
    /**
     * Constructor of Cluster class.
     * @param  {Node} pivotNode pivot node of cluster (node behind which, is a another cluster)
     * @param  {Cluster} upperCluster upper cluster of this cluster (cluster, where is pivot node of this cluster)
     * @param  {Number} depth depth of this cluster
     */
    constructor(pivotNode,upperCluster,depth){
        this.pivotNode = pivotNode;
        if(pivotNode == null){
            this.name = "root";
        }else{
            this.name = pivotNode.name;
        } 
        this.nodes = {};
        this.links = []
        this.max = 0;
        this.labels = [];
        this.nextClusters = {};
        this.upperCluster = upperCluster;
        this.depth = depth;
        this.selectedNode = null;
    }
}

function callAjax(url, callback){
    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            callback(xmlhttp.responseText);
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function clearAll(){
    d3.select("svg").remove();
}

/**
 * Function for computing colors.
 * @param  {Number} numOfColors number of colors to be computed
 * 
 * @returns {Array} array of colors
 */
function getColors(numOfColors){
    let colors = []
    let start = 0;
    let step = 1 / (numOfColors - 1);
    while(start < 1){
        colors.push(d3.interpolateTurbo(start))
        start += step;
    }
    return colors;
}

/**
 * Function for displaying graph of slected cluster.
 * @param  {cluster} cluster selected cluster
 */
function displayGraph(cluster){   
    let nodes = Object.values(cluster.nodes);
    let links = cluster.links;
    let maxDistance = cluster.max;
    let labels = cluster.labels;  
    const WIDTH = window.innerWidth - 450;
    const HEIGHT = window.innerHeight - 40;    
    const NODE_WIDTH = 80;
    const NODE_HEIGHT = 60;
    const CHARGE_STRENGTH_VALUE = -250;
    const LINK_STRENGTH_VALUE = 1;
    const LINK_DISTANCE_NORMALIZING_VALUE = 650;
    const RADIUS_VALUE = 50;

    var force = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(CHARGE_STRENGTH_VALUE))
        .force("link", d3.forceLink(links).distance(function(d){ return (d.distance / maxDistance) * LINK_DISTANCE_NORMALIZING_VALUE}).strength(LINK_STRENGTH_VALUE))
        .force("center", d3.forceCenter(WIDTH/2,HEIGHT/2))
        .force("collide",d3.forceCollide().radius(RADIUS_VALUE));

    var svg = d3.select(".container").append("svg:svg")
        .attr("class","graph")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);
    
    var defs = svg.append("defs");

    var link = svg.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link").lower();

    var color = d3.scaleOrdinal(getColors(30))
    .domain(labels);

    nodes.forEach(function(d){
        defs.append("pattern")
        .attr("id",d.name)
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("patternContentUnits", "objectBoundingBox")
        .append("image")
        .attr("height", 1)
        .attr("width", 1)
        .attr("xlink:href", d.image)
    });
    var node = svg.selectAll(".node")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("width", function(d) {return computeSizeNode(d,NODE_WIDTH)})
      .attr("height", function(d) {return computeSizeNode(d,NODE_HEIGHT)})
      .attr("fill", function(d) { return "url(#" + d.name  + ")"}  )
      .attr("stroke", function(d) { d.currentGraphNodeVisualization = this; return color(d.label); })
      .on("click",function(d){setStrokeWidth(this,d.path[0].__data__); clickNode(d.path[0].__data__)} )
      .on("dblclick",function(d){graphLayer(d.path[0].__data__,true); })
      .call(drag(force));


    // https://observablehq.com/@martinascharrer/d3-force-directed-graph-with-small-circles-around-nodes  
    function drag(simulation){
        function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }
        
        function dragended(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
       .attr("y1", function(d) { return d.source.y; })
       .attr("x2", function(d) { return d.target.x; })
       .attr("y2", function(d) { return d.target.y; });

      node.attr("x", function(d) { d.x = Math.max((computeSizeNode(d,NODE_WIDTH)/2), Math.min(WIDTH - (computeSizeNode(d,NODE_WIDTH)/2), d.x )); return d.x - (computeSizeNode(d,NODE_WIDTH)/2)} )
        .attr("y", function(d) {  d.y = Math.max((computeSizeNode(d,NODE_HEIGHT)/2), Math.min(HEIGHT - (computeSizeNode(d,NODE_HEIGHT)/2), d.y )); return d.y - (computeSizeNode(d,NODE_HEIGHT)/2)} );
    });

    link.append("title")
      .text(function(d) { return d.title; });

    node.append("title")
      .text(function(d) { return d.label; });
}

/**
 * Function for setting stroke after click on the node.
 * @param  {*} rectangle svg element of rectangle
 * @param  {Node} node slected node
 */
function setStrokeWidth(rectangle,node){
    if(node.currentCluster.selectedNode != null){
        d3.select(node.currentCluster.selectedNode).style("stroke-width", 2)
    }
    d3.select(rectangle).style("stroke-width", 4)
    node.currentCluster.selectedNode = rectangle;
}

/**
 * Function for computing size of node's cluster.
 * Value is than used to set up size of node's svg element.
 * @param  {Node} node slected node
 * @param  {Number} defaultSize default size
 * 
 * @returns {Number} computed size
 */
function computeSizeNode(node,defaultSize){
    if(Object.keys(node.currentCluster.nextClusters).length == 0){
        return defaultSize;
    }
    return defaultSize + Object.keys(node.currentCluster.nextClusters[node.name].nodes).length;
}

/**
 * Function for deleting current content of show window and calling function for setting widow of selected node.
 * @param  {Node} node slected node
 */
function clickNode(node){
    const showWindow = document.getElementById("show")
    while (showWindow.firstChild) {
        showWindow.removeChild(showWindow.lastChild);
      }
    createShowWindowNode(node,showWindow);  
}

/**
 * Function for slecting node by name.
 * Used when on node is clicked in graph visualization.
 * @param  {String} name node name
 */
function mapNodeClick(name){
    let node = allNodes[name];
    clickNode(node);
}

/**
 * Function for slecting node by name.
 * Used when on node is clicked in cluster show window visualization.
 * @param  {String} name node name
 */
function mapNodeClickCluster(name){
    let node = allNodes[name];
    clickNode(node);
    setStrokeWidth(node.currentGraphNodeVisualization,node);
}

/**
 * Function for appending small images of nodes.
 * Used for node.
 * @param  {*} container html container, where nodes will be appended
 * @param  {Node} node current node
 * @param  {*} nodes nodes to be appended
 * @param  {Boolean} sorting if true nodes are sorted, otherwise no
 */
function appendImages(container,node,nodes,sorting = false){
    if(sorting){
        nodes = nodes.sort(sortNames);
    }
    for (let n of nodes){
        let smallImage = document.createElement("img");
        smallImage.setAttribute("name",n.name);
        smallImage.setAttribute("class", "small-image");
        smallImage.setAttribute("src",n.visualization.children[1].src);
        smallImage.setAttribute('onclick',"mapNodeClick(this.name)");
        if(n.name == node.name){
            smallImage.setAttribute("style", "border: yellow solid 2.5px; margin-right: 10px; height: 60px; width: 80px;");
        }else{
            smallImage.setAttribute("style", "border: black solid 1px; margin-right: 10px; height: 40px; width: 60px;");
        }
        container.appendChild(smallImage);
    }
}

/**
 * Sorting function.
 * Sorting by position in sequence.
 * @param  {Node} a first node
 * @param  {Node} b second node
 */
function sortNames(a, b) {
    return a.name.split("_")[2] - b.name.split("_")[2];
}

/**
 * Procedure for setting sequence part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function sequenceContainerProcedure(node,showWindow){
    const sequencePattern = document.createElement("H4");
    const sequence = document.createElement("H4");
    const sequencePattern2 = document.createElement("H4");
    const sequenceContainer = document.createElement("div");
    sequencePattern.setAttribute("class", "patt");
    sequence.setAttribute("class", "val"); 
    sequencePattern.innerText = "Action:";
    sequence.innerText = node.name;
    sequencePattern2.innerText = "Sequence " + node.name.split("_")[0] + ":";
    showWindow.appendChild(sequencePattern);
    showWindow.appendChild(sequence);
    nameContainerProcedure(node,showWindow);
    showWindow.appendChild(document.createElement("br"));
    showWindow.appendChild(node.visualization);
    depthContainerProcedure(node,showWindow);
    upperClusterProcedure(node,showWindow);
    thisClusterProcedure(node,showWindow);
    sequenceContainer.appendChild(sequencePattern2);
    appendImages(sequenceContainer,node,node.sameSequence,true);
    showWindow.appendChild(sequenceContainer);
}

/**
 * Procedure for setting upper cluster part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function upperClusterProcedure(node,showWindow){
    if(node.currentCluster.depth != 1){
        const seeAUpperCluster = document.createElement("H4");
        seeAUpperCluster.innerText = "See an upper cluster";
        seeAUpperCluster.onclick = function(){graphLayer(node,false);}
        showWindow.append(seeAUpperCluster);
    }
}

/**
 * Procedure for setting this cluster part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function thisClusterProcedure(node,showWindow){
    const seeACurrentCluster = document.createElement("H4");
    seeACurrentCluster.innerText = "See a this cluster";
    seeACurrentCluster.onclick = function(){clickCluster(node.currentCluster)};
    showWindow.append(seeACurrentCluster);
}

/**
 * Procedure for setting name part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function nameContainerProcedure(node,showWindow){
    const namePattern = document.createElement("H4");
    const name  = document.createElement("H4");
    const nameContainer = document.createElement("div");
    namePattern.setAttribute("class", "patt");
    namePattern.innerText = "Name:"; 
    name.setAttribute("class", "val");
    name.innerText = node.visualization.className.split("-")[1];
    nameContainer.appendChild(namePattern);
    nameContainer.appendChild(name);
    showWindow.appendChild(nameContainer);
}

/**
 * Procedure for setting depth part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function depthContainerProcedure(node,showWindow){
    const depthPattern = document.createElement("H4");
    const depth = document.createElement("H4");
    const depthContainer = document.createElement("div");
    depthPattern.setAttribute("class", "patt");
    depthPattern.innerText = "Cluster depth: "; 
    depth.setAttribute("class", "val");
    depth.innerText = node.currentCluster.depth
    depthContainer.appendChild(depthPattern);
    depthContainer.appendChild(depth);
    showWindow.appendChild(depthContainer);
}

/**
 * Procedure for setting label part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function labelContainerProcedure(node,showWindow){
    const labelPattern = document.createElement("H4");
    labelPattern.innerText = "Next in label " + node.label + ":";  
    let labelContainer = document.createElement("div");
    labelContainer.appendChild(labelPattern);
    appendImages(labelContainer,node,node.sameLabel);
    showWindow.appendChild(labelContainer);
}

/**
 * Procedure for setting animated sequence part in show window.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function animatedSequenceContainerProcedure(node,showWindow){
    let animatedSequence = document.createElement("canvas"); 
    animatedSequence.setAttribute("class","animated-sequence");
    animatedSequence.setAttribute("id","animated-sequence");
    let button = document.createElement("button");
    button.setAttribute("id","run-sequence-button");
    button.option = "stopAnimation";
    let slidingWindow = document.createElement("div");
    slidingWindow.setAttribute("class","sliding-window"); 
    let slider = document.createElement("canvas");
    slider.setAttribute("class","slider"); 
    slidingWindow.appendChild(slider);
    let times = document.createElement("div");
    times.setAttribute("class","times");
    setFrame(parseInToCords(node.sequence),animatedSequence,button,slider,times); 
    showWindow.appendChild(animatedSequence);
    showWindow.appendChild(document.createElement("br"));
    showWindow.appendChild(button);
    showWindow.appendChild(slidingWindow);
    showWindow.appendChild(document.createElement("br"));
    showWindow.appendChild(times);
}

/**
 * Function for creating show window for node.
 * Used for node.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function createShowWindowNode(node,showWindow){
    sequenceContainerProcedure(node,showWindow);
    labelContainerProcedure(node,showWindow);
    animatedSequenceContainerProcedure(node,showWindow);
}

/**
 * Procedure for setting name part in show window.
 * Used for cluster.
 * @param  {Cluster} cluster selected cluster
 * @param  {*} showWindow show window 
 */
function createShowWindowClusterNameContainerProcedure(cluster,showWindow){
    const namePattern = document.createElement("H4");
    const name  = document.createElement("H4");
    const nameContainer = document.createElement("div");
    namePattern.setAttribute("class", "patt");
    namePattern.innerText = "Cluster of node:"; 
    name.setAttribute("class", "val");
    name.innerText = cluster.name
    nameContainer.appendChild(namePattern);
    nameContainer.appendChild(name);
    showWindow.appendChild(nameContainer);
}

/**
 * Procedure for setting pivot part in show window.
 * Used for cluster.
 * @param  {Cluster} cluster selected cluster
 * @param  {*} showWindow show window 
 */
function createShowWindowClusterPivotContainerProcedure(cluster,showWindow){
    if(cluster.pivotNode == null){
        return;
    }
    let pivot = cluster.pivotNode;
    let pivotImage = document.createElement("img");
    pivotImage.setAttribute("name",pivot.name);
    pivotImage.setAttribute("class", "large-image");
    pivotImage.setAttribute("src",pivot.visualization.children[1].src);
    pivotImage.setAttribute('onclick',"mapNodeClick(this.name)");
    showWindow.appendChild(pivotImage);
    const seeAUpperCluster = document.createElement("H4");
    seeAUpperCluster.innerText = "See an upper cluster";
    seeAUpperCluster.onclick = function(){setUpPivotNodeCluster(cluster);}
    showWindow.append(seeAUpperCluster);
}

/**
 * Procedure for setting nodes part in show window.
 * Used for cluster.
 * @param  {Cluster} cluster selected cluster
 * @param  {*} showWindow show window 
 */
function createShowWindowClusterNodesContainerProcedure(cluster,showWindow){
    const nodesPattern = document.createElement("H4");
    nodesPattern.setAttribute("class", "patt");
    nodesPattern.innerText = "Nodes in cluster (" + Object.keys(cluster.nodes).length + "):";
    showWindow.appendChild(nodesPattern);
    createShowWindowClusterNodesAppendImagesProcedure(cluster,showWindow);
}

/**
 * Function for appending small images of nodes.
 * Used for cluster.
 * @param  {Cluster} cluster selected cluster
 * @param  {*} showWindow show window
 */
function createShowWindowClusterNodesAppendImagesProcedure(cluster,showWindow){
    showWindow.appendChild(document.createElement("br"));
    for (let key of Object.keys(cluster.nodes)){
        const imageNodeName = document.createElement("H4");
        const smallImage = document.createElement("img");
        const imageContainer = document.createElement("div");
        imageNodeName.innerText = key + " :";
        imageNodeName.setAttribute("class","small-image-cluster-pattern")
        smallImage.setAttribute("name",key);
        smallImage.setAttribute("class","small-image-cluster");
        smallImage.setAttribute("src",cluster.nodes[key].visualization.children[1].src);
        smallImage.setAttribute('onclick',"mapNodeClickCluster(this.name)");
        imageContainer.setAttribute("class", "small-image-cluster-container");
        imageContainer.appendChild(imageNodeName);
        imageContainer.appendChild(smallImage);
        showWindow.appendChild(imageContainer);
        showWindow.appendChild(imageContainer);
        showWindow.appendChild(document.createElement("br"));
    }
}

/**
 * Function for creating show window for cluster.
 * Used for cluster.
 * @param  {Cluster} cluster selected cluster
 * @param  {*} showWindow show window 
 */
function createShowWindowCluster(cluster,showWindow){
   createShowWindowClusterNameContainerProcedure(cluster,showWindow);
   createShowWindowClusterPivotContainerProcedure(cluster,showWindow);
   createShowWindowClusterNodesContainerProcedure(cluster,showWindow);
}

/**
 * Function for setting current cluster of pivot node.
 * @param  {Cluster} cluster selected cluster
 */
function setUpPivotNodeCluster(cluster){
    if(cluster.pivotNode.name in cluster.nodes){
        cluster.pivotNode.currentCluster = cluster.upperCluster;
    }
    graphLayer(cluster.upperCluster);
}

/**
 * Function for deleting current content of show window and calling function for setting widow of selected cluster.
 * @param  {Cluster} cluster slected cluster
 */
function clickCluster(cluster){
    const showWindow = document.getElementById("show")
    while (showWindow.firstChild) {
        showWindow.removeChild(showWindow.lastChild);
      }
    createShowWindowCluster(cluster,showWindow);  
}

function processResponse(stringData){
    if (dataFileInput.files.length == 0) {
        console.log("No file selected!");
        return;
        }
    allNodes = {}
    parseClusterData(stringData);
    
    
}
function parseClusterData(stringData){
    let maxLength = 0;
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let result = parser(stringData);
        let factory = new Mocap.VisualizationFactory();
        for(let sequence of sequences){
            if(!(sequence[0].split(' ')[2].trim() in allNodes)){
                continue;
            }
            if(maxLength < sequence.length){
                maxLength = sequence.length;
            }
            let visualizationElement = factory.createVisualization(sequence, 80*3,60*3, 75, 75);
            allNodes[sequence[0].split(' ')[2].trim()].sequence = sequence;
            allNodes[sequence[0].split(' ')[2].trim()].image = visualizationElement.children[1].src;
            allNodes[sequence[0].split(' ')[2].trim()].visualization = visualizationElement;
        }
        for(var key in allNodes){
            for (var key2 in allNodes) {
                let first = allNodes[key];
                let second = allNodes[key2];
                if(first.name.split('_')[0] == second.name.split('_')[0]){
                    second.sameSequence.push(first);
                }
                if(first.label == second.label && first != second){
                    second.sameLabel.push(first);
                }   
            }  
        }
        graphLayer(result);
    },null,20,3000);
}

function graphLayer(node,goingDeep){
    let cluster;
    if(goingDeep == null){
        cluster = node;
    }else{
        if(goingDeep){
            if(Object.keys(node.currentCluster.nextClusters).length == 0){
                return;
            }
            if(node.currentCluster.selectedNode != null){
                d3.select(node.currentCluster.selectedNode).style("stroke-width", 2);
            }
            cluster = node.currentCluster.nextClusters[node.name];
            if(node.name in cluster.nodes){
                node.currentCluster = cluster
            }
        }else{
            if(node.currentCluster.selectedNode != null){
                d3.select(node.currentCluster.selectedNode).style("stroke-width", 2);
            }
            cluster = node.currentCluster.upperCluster;
            if(node.currentCluster.pivotNode.name in cluster.nodes){
                node.currentCluster.pivotNode.currentCluster = cluster;
            }
        }   
    }
    clearAll();
    displayGraph(cluster);
    clickCluster(cluster) 
}


function parser(data){
    let jsonData = JSON.parse(data);
    var depth = 1;
    return recursiveParse(jsonData.output,null,depth,null); 
}


function recursiveParse(layerData,upperCluster,depth,pivotNode){
    let currCluster = new Cluster(pivotNode,upperCluster,depth);
    let clusterDistannces = {}
    for(let action of layerData){
        let distancesInFormat = {};
        let distances = []
        for(let distance of action.distances){
            let splitLineSecondtLayer = distance.split(':');
            if(parseFloat(splitLineSecondtLayer[1]) > currCluster.max){
                currCluster.max = parseFloat(splitLineSecondtLayer[1]);
            }
            distancesInFormat[splitLineSecondtLayer[0]] = parseFloat(splitLineSecondtLayer[1]);
            distances.push(parseFloat(splitLineSecondtLayer[1]))
        }
        clusterDistannces[action.name] = [distancesInFormat,distances];
        let node;
        if(action.name in allNodes){
            node = allNodes[action.name];
        }else{
            node = new Node(action.name,currCluster);
            allNodes[action.name] = node;
        }
        currCluster.nodes[action.name] = node;
        if(typeof action.children !== 'undefined') {
            currCluster.nextClusters[action.name] = recursiveParse(action.children,currCluster,depth + 1,node);
        }
        currCluster.labels.push(node.label);
    }
    for(let key in clusterDistannces){
        let distancesInFormat = clusterDistannces[key][0]
        let distances = clusterDistannces[key][1] 
        distances.sort(function(a,b){return a - b});
        for(var key2 in distancesInFormat){
            if(currCluster.nodes[key] == currCluster.nodes[key2]){
                continue;
            }
            var dist = distancesInFormat[key2];
            if((distances.length > 2 && dist > distances[2]))
                continue;
            if(!currCluster.nodes[key2])
                continue;
            currCluster.links.push({source: currCluster.nodes[key], target : currCluster.nodes[key2], distance : dist, title: dist});
        }
    }  
    return currCluster; 
}
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataLoadButton");
loadButton.onclick = load;

function load() {
        callAjax("./output.txt",processResponse)
}

function parseInToCords(sequence){
    let result = [];
    for (let index = 2; index < sequence.length; index++) {
        sequence[index].trim();
        if(sequence[index] == ""){
            continue;
        }
        let current = [];
        let currentCords = sequence[index].split(';');
        for(let cords of currentCords){
            let splitCords = cords.split(',');
            let currentCords = {};
            currentCords['x'] = parseInt(splitCords[0]);
            currentCords['y'] = parseInt(splitCords[1]);
            currentCords['z'] = parseInt(splitCords[2]);
            current.push(currentCords);
        }
        result.push(current);
    }
    return result;
}

function showInTime(controller,frames,frame,button,slider,marginGap,fps){
        showFrame(controller,frames,frame);
        slider.style.marginLeft = (parseFloat(slider.style.marginLeft) + marginGap) + "px";
        if(button.option == "runAnimation"){
            setTimeout(function(){frameQueue(controller,frames,frame+Math.floor(fps/10),button,slider,marginGap,fps);},100);  
        }
        
}
   
function frameQueue(controller,frames,frame,button,slider,marginGap,fps){
    if(frame < frames.length){
        showInTime(controller,frames,frame,button,slider,marginGap,fps);    
    }else{
        button.setAttribute("id","run-sequence-button");
        button.option = "stopAnimation";
        slider.style.marginLeft = '0px';
    } 
}
/*
    Author of this functions:
        Jan Sedmidubsky, Brno, Czech Republic, sedmidubsky@gmail.com
*/

function showFrame(k3dController, frames, frameIndex) {
    k3dController.objects = [];
    k3dController.addK3DObject(frames[frameIndex]);
    k3dController.frame();
}

function setFrame(sequence,canvas,button,slider,times){ 
    var controller = new K3D.Controller(canvas, true); 
    var frames = new Array();
    var rotating = false;
    function onCanvasMouseDown(event) {
        event.preventDefault();
        px = event.pageX;
        py = event.pageY;
        rotating = true;
    }
    
    function onCanvasMouseUp(event) {
        event.preventDefault();
        rotating = false;
    }

    function onCanvasMouseMove(event) {
        event.preventDefault();
        if (rotating) {
            var diffx = px - event.pageX;
            var diffy = py - event.pageY;
            px = event.pageX;
            py = event.pageY;
            for (key in frames) {
                frames[key].ophi = frames[key].ophi + diffx;
                frames[key].ogamma = frames[key].ogamma + diffy;
            }
            showFrame(controller, frames, 0);
        }
    }

    canvas.addEventListener('mousedown',onCanvasMouseDown);
    canvas.addEventListener('mousemove',onCanvasMouseMove);
    canvas.addEventListener('mouseup',onCanvasMouseUp);
    canvas.addEventListener('mouseleave',onCanvasMouseUp);
    button.addEventListener('click', function(){
        if(button.option == "runAnimation"){
            button.setAttribute("id","run-sequence-button");
            button.option = "stopAnimation";
        }else{
            slider.style.marginLeft = '0px';
            button.setAttribute("id","stop-sequence-button");
            button.option = "runAnimation";
            setTimeout(function(){frameQueue(controller,frames,Math.floor(FPS / 10),button,slider,marginGap,FPS)},10);
        }
        
    },);
    frames[0] = new K3D.K3DObject();
    console.log(frames[0])
    with (frames[0]) {
        color = [29,248,190];
        drawmode = "wireframe";
        shademode = "depthcue";
        scale = 3.2;
        init(sequence[0],bonesVicon,[]
        );
    }
    showFrame(controller, frames, 0);
    for (let index = Math.floor(FPS/10); index < sequence.length ;index += Math.floor(FPS/10)) {
        frames[index] = new K3D.K3DObject();
        with (frames[index]) {
            color = [29,248,190];
            drawmode = "wireframe";
            shademode = "depthcue";
            scale = 3.2;
            init(sequence[index],bonesVicon,[]);
        }      
    }
    var marginGap =  285 / (Math.floor(frames.length / Math.floor(FPS/10)));
    var numOfTimes = Math.floor(frames.length / FPS );
    var marginTimesGap = (300 - ((frames.length % FPS) * (300 /  frames.length))) / numOfTimes ;
    let firstTime = document.createElement("span");
    firstTime.innerText = "00:00";
    times.appendChild(firstTime);
    for (let i = 1; i < Math.ceil(frames.length / FPS); i++) {
        let current = document.createElement("span");
        current.style.marginLeft = marginTimesGap - 32.54 + 'px';
        current.innerText = "00:" + i.toString().padStart(2, '0');
        times.appendChild(current);
    }
}