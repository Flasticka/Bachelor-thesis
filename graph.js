import * as Mocap from './src/mocap.js';
import * as Model from './src/model.js';
import {VisualizationParts} from "./src/MotionsDifferenceVisualiser/Entities/VisualizationParts.js";

/*
* Variables
*/
var allNodes = {};
var currentCluster = null;
var isDTW = null;
var maxDistanceInHierarchy = 1;
var labelSubTreeContainer = null;

/*
* Constats
*/
const interpolator = d3.interpolate('green', 'red');
const factory = new Mocap.VisualizationFactory();
const visualizationWidth = 240;
const visualizationHeight = 180;
const mapWidth = 0; 
const mapHeight = 0;
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataLoadButton");
const hiddenLayerRightSide = document.getElementById("hiddden-layer-right-side");
const hideHiddenLayerBody = document.getElementById("hidden-layer-body");
const contentBox  = document.getElementById("content-box");
const rightSide = document.getElementById("right-side");
const rightSideButtonGraphContainer = document.getElementById('right-side_button-graph-container');
const vp = new VisualizationParts(false, false, true, true, true, false, false);
hideHiddenLayerBody.onclick = clearAllContentBox;
loadButton.onclick = load;

/* Constants for setup dataset input, change it depending on properties of datatset 
*/
factory.model = Model.modelVicon;
const bonesStyle = Model.bonesVicon;
const FPS = 120;

/* Constants for setup the exploration preferencies, change as you wish :)
*/
const maxAlsotInLabel = 7 // the max number of images shown in Also in label section 
const maxNextInSubTree = 7 // the max number of label shown in The most frequente labels section

/*
* Constats and variables for skeleton visualization from
*  Jan Sedmidubsky, Brno, Czech Republic, sedmidubsky@gmail.com
*/

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
    constructor(name){
        this.name = name;
        this.label = name.split('_')[1];
        this.image = null;
        this.visualization = null;
        this.sameSequence = [];
        this.sameLabel= [];
        this.sequence = null;
        this.defaultDTWCluster = null;
        this.defaultLabelCluster = null;
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
    constructor(pivotNode,upperCluster,depth,number_in_branch,labelName,labels_in_branch){
        this.pivotNode = pivotNode;
        if(pivotNode == null){
            this.name = "root" + labelName;
        }else{
            this.name = pivotNode.name + labelName;
        } 
        this.nodes = {};
        this.links = []
        this.max = 1;
        this.labels = {};
        this.nextClusters = {};
        this.upperCluster = upperCluster;
        this.depth = depth;
        this.selectedNode = null;
        this.nodes_in_branch = number_in_branch;
        this.max_nodes_in_children_branches = 1;
        this.labels_in_branch = labels_in_branch;
    }
}

/**
 * Procedure for loading hierarchies.
 */
 function load() {
    loadDataFiles("output.txt","output2.txt","json.txt",loadExploration);
}

/**
 * Procedure for reading data files from files and run .
 * @param  {String} dtwFile file path with DTW Hierarchy
 * @param  {String} labelFile file path with Label Hierarchy
 * @param  {String} imagesFile file path with precomputed images
 * @param  {*} callback callback function
 */
async function loadDataFiles(dtwFile,labelFile,imagesFile,callback){
    const response = await fetch(dtwFile); 
    const result1 = await response.text();
    const response2 = await fetch(labelFile);
    const result2 = await response2.text();
    const response3 = await fetch(imagesFile);
    const result3 = await response3.text(); 
    callback(result1,result2,result3); 
}

function clearAllContentBox(){
    contentBox.innerHTML = '';
    hideHiddenLayerBody.style.display = "none";
}

/**
 * Procedure for clearing all elements from right side except hidden layer.
 */
function clearAllRightSide(){
    rightSide.innerHTML = '';
    rightSide.appendChild(hiddenLayerRightSide);
    rightSideButtonGraphContainer.innerHTML = ''
    rightSide.appendChild(rightSideButtonGraphContainer);
}

/**
 * Procedure for displaying graph of slected cluster.
 */
function displayGraph(){
    let nodes = Object.values(currentCluster.nodes);
    let links = currentCluster.links;
    let maxDistance = currentCluster.max;
    const WIDTH = window.innerWidth - 360 - 230;
    const HEIGHT = window.innerHeight - 40;    
    const NODE_WIDTH = 80;
    const NODE_HEIGHT = 60;
    const CHARGE_STRENGTH_VALUE = -250;
    const LINK_STRENGTH_VALUE = 1;
    const LINK_DISTANCE_NORMALIZING_VALUE = window.innerWidth/2;
    const RADIUS_VALUE = 85;

    var force = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(CHARGE_STRENGTH_VALUE))
        .force("link", d3.forceLink(links).distance((d) =>{
            console.assert(maxDistance != 0); 
            return (d.distance / maxDistance) * LINK_DISTANCE_NORMALIZING_VALUE;
        })
        .strength(LINK_STRENGTH_VALUE))
        .force("center", d3.forceCenter(WIDTH/2,HEIGHT/2))
        .force("collide",d3.forceCollide().radius(RADIUS_VALUE));

    var svg = d3.select("#right-side_button-graph-container").append("svg:svg")
        .attr("class","graph")
        .attr("id","graph")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);
    
    var defs = svg.append("defs");

    var link = svg.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("stroke",(l) => {
        return getColorLine(l.distance);
    })
    .on("click",(l) => {
        clickLine(l.srcElement.__data__);
    })
    .attr("class", "link")
    .lower()

    nodes.forEach((d) => {
        defs.append("pattern")
        .attr("id",d.name)
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("patternContentUnits", "objectBoundingBox")
        .append("image")
        .attr("height", 1)
        .attr("width", 1)
        .attr("xlink:href", d.image);
    });
    var node = svg.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .call(drag(force))
      .call(setUpNode);
    
    function setUpNode(n){
        n.append("rect")
        .attr("fill", "white")
        .attr("width", (d) => {
            return computeSizeNode(d,NODE_WIDTH);
        })
        .attr("height", (d) => {
            return computeSizeNode(d,NODE_HEIGHT);
        });

        n.append("rect")
        .attr("width",(d) => {
            return computeSizeNode(d,NODE_WIDTH);
        })
        .attr("height", (d) => {
            return computeSizeNode(d,NODE_HEIGHT);
        })
        .attr("fill", function(d) {
            d.currentGraphNodeVisualization = this; 
            return "url(#" + d.name  + ")";
        })
        .on("click",(d) => {
            clickNode(d.srcElement.__data__);
        })
        .on("dblclick",(d) => {
            graphLayer(d.srcElement.__data__,true); 
        });
        
        n.append("text")
        .text((d) => {
            let size = sizeNode(d);
            if(size > 0) return size;
        });
    }

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
        link.attr("x1", (d) => { 
            return d.source.x; 
        })
        .attr("y1", (d) => { 
            return d.source.y; 
        })
        .attr("x2", (d) => { 
            return d.target.x; 
        })
        .attr("y2", (d) => {
            return d.target.y; 
        });

        node.selectAll("rect").attr("x", (d) => {
            let computedWidth = computeSizeNode(d,NODE_WIDTH)/2; 
            d.x = Math.max(computedWidth, Math.min(WIDTH - computedWidth, d.x )); 
            return d.x - computedWidth;
        })
        .attr("y", (d) => { 
            let computedHeight = computeSizeNode(d,NODE_HEIGHT)/2;
            d.y = Math.max(computedHeight, Math.min(HEIGHT - computedHeight, d.y ));
            return d.y - computedHeight;
        });

        node.selectAll("text").attr("x", (d) => {
            let computedWidth = computeSizeNode(d,NODE_WIDTH)/2;
            d.x = Math.max(computedWidth, Math.min(WIDTH - computedWidth, d.x )); 
            return d.x - 2;
        })
        .attr("y", (d) => {
            let computedHeight = computeSizeNode(d,NODE_HEIGHT)/2;
            d.y = Math.max(computedHeight, Math.min(HEIGHT - computedHeight, d.y ));
            return d.y - computedHeight + computedHeight / 2;
        });
    });

    link.append("title")
    .text((d) => {
          return d.title;
    });

    node.append("title")
    .text((d) => {
        return d.label;
    });
}

function clickLine(line){
    let visualization = factory.visualizeSequenceDifferences(line.source.sequence,line.target.sequence, 800, undefined, undefined,vp);
    contentBox.appendChild(visualization)
    hideHiddenLayerBody.style.display = "block";
}
/**
 * Function for setting up the color of line.
 * @param  {Number} distance distance 
 * 
 * @return  {*} color of line
 */
function getColorLine(distance){
    return interpolator(distance/maxDistanceInHierarchy);
}

/**
 * Procedure for setting stroke after click on the node.
 * @param  {*} rectangle svg element of rectangle
 * @param  {Node} node slected node
 */
function setStrokeWidth(rectangle){
    if(currentCluster.selectedNode != null){
        deleteStrokeWidth();
    }
    d3.select(rectangle).style("stroke-width", 4).style("stroke", "yellow");
    currentCluster.selectedNode = rectangle;
}

/**
 * Procedure for deleting stroke.
 */
function deleteStrokeWidth(){
    d3.select(currentCluster.selectedNode).style("stroke-width", 2).style("stroke", "#EA4C89");
}

/**
 * Function for computing numbers of nodes in branch.
 * @param  {Node} node node
 * 
 * @return  {Number} numbers of nodes in branch
 */
function sizeNode(node){
    if(!(node.name in currentCluster.nextClusters)){
        return 0;
    }
    return currentCluster.nextClusters[node.name].nodes_in_branch;
}

/**
 * Function for computing size of nodes.
 * Value is than used to set up size of node's svg element.
 * @param  {Node} node slected node
 * @param  {Number} defaultSize default size
 * 
 * @returns {Number} computed size
 */
function computeSizeNode(node,defaultSize){
    console.assert(currentCluster.max_nodes_in_children_branches != 0);
    return defaultSize + 100 * sizeNode(node) / currentCluster.max_nodes_in_children_branches;
}

/**
 * Procedure for deleting current content of show window and calling function for setting widow of selected node.
 * @param  {Node} node slected node
 */
function clickNode(node){
    const showWindow = document.getElementById("show");
    deleteContentOfWindow(showWindow);
    setStrokeWidth(node.currentGraphNodeVisualization);
    createShowWindowNode(node,showWindow);
    labelsInSubTreeOfCluster(node); 
}

/**
 * Procedure for slecting node by name.
 * Used when on node is clicked in graph visualization.
 * @param  {String} name node name
 */
function mapNodeClick(name){
    let node = allNodes[name];
    clickNode(node);
}

/**
 * Procedure for appending small images of nodes.
 * @param  {*} container html container, where nodes will be appended
 * @param  {Node} node current node
 * @param  {*} nodes nodes to be appended
 * @param  {Boolean} sorting if true nodes are sorted, otherwise no
 */
function appendImages(container,node,nodes,sorting = false){
    if(sorting){
        nodes = nodes.sort(sortNames);
    }
    let counter = 0;
    for (let n of nodes){
        if(!sorting && counter == maxAlsotInLabel){
            break
        }
        let smallImage = document.createElement("img");
        smallImage.setAttribute("name",n.name);
        smallImage.setAttribute("class", "small-image");
        smallImage.setAttribute("src",n.image);
        smallImage.onclick = function(){
            mapNodeClick(this.name);
        };
        if(n.name == node.name){
            smallImage.setAttribute("style", "border: yellow solid 2.5px; margin-right: 10px; height: 60px; width: 80px;");
        }else{
            if(n.name in currentCluster.nodes){
                smallImage.setAttribute("style", "border: #89E039 solid 1px; margin-right: 10px; height: 40px; width: 60px;");
            }else{
                smallImage.setAttribute("style", "border: #EA4C89 solid 1px; margin-right: 10px; height: 40px; width: 60px;");
            }
        }
        container.appendChild(smallImage);
        counter++;
    }
}

/**
 * Sorting function.
 * Sorting by position in sequence.
 * @param  {Node} a first node
 * @param  {Node} b second node
 * 
 * @return result < 0 a is lower than b
 */
function sortNames(a, b) {
    return a.name.split("_")[2] - b.name.split("_")[2];
}

/**
 * Procedure for setting sequence part in show window.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function actionInfoProcedure(node,showWindow){
    const sequencePattern = document.createElement("H4");
    const sequence = document.createElement("H4");
    sequencePattern.setAttribute("class", "patt");
    sequence.setAttribute("class", "val"); 
    sequencePattern.innerText = "Action:";
    sequence.innerText = node.name;
    showWindow.appendChild(sequencePattern);
    showWindow.appendChild(sequence);
    nameContainerProcedure(node,showWindow);
    showWindow.appendChild(node.visualization);
    
}

/**
 * Procedure for setting up next in sequence part in show window.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function sequenceContainerProcedure(node,showWindow){
    const sequencePattern = document.createElement("H4");
    const sequenceContainer = document.createElement("div");
    sequencePattern.innerText = "Sequence " + node.name.split("_")[0] + ":";
    sequenceContainer.appendChild(sequencePattern);
    appendImages(sequenceContainer,node,node.sameSequence,true);
    showWindow.appendChild(sequenceContainer);
}

/**
 * Procedure for setting sequence part in show window.
 * @param  {*} buttonContainer button container, html element
 */
function setUpHiddenLayerRightSideHeader(buttonContainer){
    const hiddenLayerRightSideHeader = document.createElement("h3");
    hiddenLayerRightSideHeader.setAttribute("id","hidden-layer-right-side-header");
    hiddenLayerRightSideHeader.innerText = "The chosen action is not part of the previously displayed cluster. Which cluster would you like to display?";
    buttonContainer.appendChild(hiddenLayerRightSideHeader);
}

/**
 * Procedure for setting up default clusters in hidden layer.
 * @param  {Node} node selected node
 */
function deafultClusters(node){
    hideHiddenLayerRightSide();
    if(!(node.name in currentCluster.nodes)){
        hiddenLayerRightSide.style.display = "block";
        let buttonContainer = document.createElement("div");
        buttonContainer.setAttribute("class","default-cluster-container");
        setUpHiddenLayerRightSideHeader(buttonContainer);
        if(node.defaultDTWCluster != null){
        const seeDTWCluster = document.createElement("button");
        seeDTWCluster.innerText = "See a DTW deafult cluster";
        seeDTWCluster.setAttribute("class", "loadButton");
        seeDTWCluster.onclick = () =>{
            setUpDeafultClusterDTW(node);
        }
        buttonContainer.appendChild(seeDTWCluster); 
        }
        if(node.defaultLabelCluster != null){
            const seeLabelCluster = document.createElement("button");
            seeLabelCluster.innerText = "See a Label deafult cluster";
            seeLabelCluster.setAttribute("class", "loadButton");
            seeLabelCluster.onclick = () => {
                setUpDeafultClusterLabel(node);
            } 
            buttonContainer.appendChild(seeLabelCluster); 
        }
        hiddenLayerRightSide.appendChild(buttonContainer);
    }
}

/**
 * Procedure for setting up default clusters of DTW in hidden layer.
 * @param  {Node} node selected node
 */
function setUpDeafultClusterDTW(node){
    isDTW = true;
    hideHiddenLayerRightSide();
    graphLayer(node.defaultDTWCluster);
    clickNode(node);
}

/**
 * Procedure for setting up default clusters of Label in hidden layer.
 * @param  {Node} node selected node
 */
function setUpDeafultClusterLabel(node){
    isDTW = false;
    hideHiddenLayerRightSide();
    graphLayer(node.defaultLabelCluster);
    clickNode(node);
}

/**
 * Procedure for hidding hidden layer.
 * @param  {Node} node selected node
 */
function hideHiddenLayerRightSide(){
    deleteContentOfWindow(hiddenLayerRightSide);
    hiddenLayerRightSide.style.display = "none";
}

function setUpVisulaization(node){
    if(node.visualization == null){
        node.visualization = factory.createVisualization(node.sequence, visualizationWidth,visualizationHeight, mapWidth, mapHeight);
    }
}
/**
 * Procedure for setting name part in show window.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function nameContainerProcedure(node,showWindow){
    setUpVisulaization(node)
    const namePattern = document.createElement("H4");
    const name  = document.createElement("H4");
    const nameContainer = document.createElement("div");
    namePattern.setAttribute("class", "patt");
    namePattern.innerText = "Category name:"; 
    name.setAttribute("class", "val");
    name.innerText = node.visualization.className.split("-")[1];
    nameContainer.appendChild(namePattern);
    nameContainer.appendChild(name);
    showWindow.appendChild(nameContainer);
}

/**
 * Procedure for setting depth part in show window.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function depthContainerProcedure(clusterInfoContainer){
    const depthPattern = document.createElement("H5");
    const depth = document.createElement("H5"); 
    const depthContainer = document.createElement("div"); 
    depthContainer.setAttribute("class", "depth-container");
    depthPattern.innerText = "Cluster depth: ";  
    depth.innerText = currentCluster.depth;
    depth.setAttribute('class','depth-value')
    depthContainer.appendChild(depthPattern);
    depthContainer.appendChild(depth);
    clusterInfoContainer.appendChild(depthContainer);
}

/**
 * Procedure for setting label information of cluster.
 * @param  {*} clusterInfoContainer container, html element
 */
function labelsInCurrentCluster(clusterInfoContainer){
    const labelInfoUL = document.createElement("ul");
    const labelPattern = document.createElement("H5");
    labelPattern.innerText = "Labels in current cluster: ";
    labelPattern.setAttribute('class','labels-current-cluster')
    clusterInfoContainer.appendChild(labelPattern);
    let orderedKeys = Object.keys(currentCluster.labels).map(x => parseInt(x)).sort((a,b) => a - b);
    for(let key of orderedKeys){
        const labelInfoLI = document.createElement("ul");
        labelInfoLI.innerText = key + ": " + currentCluster.labels[key];
        labelInfoUL.appendChild(labelInfoLI);
    }
    clusterInfoContainer.appendChild(labelInfoUL);
}

function labelsInSubTreeOfCluster(node){
    deleteContentOfWindow(labelSubTreeContainer)
    if(!(node.name in currentCluster.nextClusters)){
        return
    }
    const labels = currentCluster.nextClusters[node.name].labels_in_branch;
    if(labels){
        let counter = 0
        const labelInfoUL = document.createElement("ul");
        const labelPattern = document.createElement("H5");
        labelSubTreeContainer.appendChild(labelPattern);
        labelPattern.innerText = "The most frequent labels in subtree of node: ";
        let orderedKeys = Object.keys(labels).map(x => parseInt(x)).sort((a,b) => labels[b] - labels[a]);
        for(let key of orderedKeys){
            if(counter == maxNextInSubTree){
                break;
            }
            const labelInfoLI = document.createElement("ul");
            labelInfoLI.innerText = key + ": " + labels[key];
            labelInfoUL.appendChild(labelInfoLI);
            counter++;
        }
        labelSubTreeContainer.appendChild(labelInfoUL);
    }
    
}

function setUpLabelsInSubTreeOfCluster(clusterInfoContainer){
    const labelsInSubTreeOfClusterDiv = document.createElement("div");
    labelsInSubTreeOfClusterDiv.setAttribute("class","labels-subtree-container")
    clusterInfoContainer.appendChild(labelsInSubTreeOfClusterDiv);
    labelSubTreeContainer = labelsInSubTreeOfClusterDiv;
}

/**
 * Procedure for setting information about cluster.
 */
function setUpClusterInfo(){
    const clusterInfoContainer = document.createElement("div");
    clusterInfoContainer.setAttribute("id", "cluster-info");
    rightSide.appendChild(clusterInfoContainer);
    depthContainerProcedure(clusterInfoContainer);
    labelsInCurrentCluster(clusterInfoContainer);
    setUpLabelsInSubTreeOfCluster(clusterInfoContainer);
}

/**
 * Procedure for setting label part in show window.
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function labelContainerProcedure(node,showWindow){
    const labelPattern = document.createElement("H4");
    labelPattern.innerText = "Also in label " + node.label + ":";  
    let labelContainer = document.createElement("div");
    labelContainer.setAttribute("id","label-container");
    labelContainer.appendChild(labelPattern);
    appendImages(labelContainer,node,node.sameLabel);
    showWindow.appendChild(labelContainer);
}

/**
 * Procedure for setting animated sequence part in show window.
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
 * @param  {Node} node selected node
 * @param  {*} showWindow show window 
 */
function createShowWindowNode(node,showWindow){
    deafultClusters(node);
    actionInfoProcedure(node,showWindow);
    animatedSequenceContainerProcedure(node,showWindow);
    sequenceContainerProcedure(node,showWindow);
    labelContainerProcedure(node,showWindow);  
}

/**
 * Procedure for setting pivot part in show window.
 */

function setUpperClusterButton(){
    let pivot = currentCluster.pivotNode;
    if(pivot == null){
        return;
    }
    const seeAUpperCluster = document.createElement("button");
    seeAUpperCluster.innerText = "See an upper cluster";
    seeAUpperCluster.setAttribute("class", "loadButton");
    seeAUpperCluster.setAttribute("id", "upper-cluster");
    seeAUpperCluster.onclick = () => {
        graphLayer(currentCluster.upperCluster,null);
        clickNode(pivot);
    };
    rightSideButtonGraphContainer.append(seeAUpperCluster);
}

/**
 * Procedure for deleting window.
 * @param  {*} showWindow show window 
 */
function deleteContentOfWindow(showWindow){
    while (showWindow.firstChild) {
        showWindow.removeChild(showWindow.lastChild);
      }
}

/**
 * Procedure for setting up label hierarchy.
 * @param  {*} LabelHierarchy label hierarchy
 */
function setLabelHierarchy(LabelHierarchy){
    const showWindow = document.getElementById("show");
    const selectSelect = document.getElementById("select");
    const button = document.getElementById("select-label");
    button.onclick  = () => {
        deleteContentOfWindow(showWindow);
        graphLayer(LabelHierarchy[selectSelect.value],null);
    };
    for(let key in LabelHierarchy){
        const selectOption = document.createElement("option")
        selectOption.innerText = key;
        selectSelect.appendChild(selectOption);
    }
}

/**
 * Procedure for setting up show of thelabel hierarchie.
 * @param  {*} showWindow show window
 */
function showLabelHierarchy(showWindow){
    deleteContentOfWindow(showWindow);
    hideHiddenLayerRightSide();
    clearAllRightSide();
    const chooseLabelWindow = document.getElementById("choose-label");
    chooseLabelWindow.style.display = "inline-block";
    isDTW = false;
}

/**
 * Procedure for setting up hierarchy buttons.
 * @param  {*} DTWHierarchy DTW hierarchy
 * @param  {*} LabelHierarchy label hierarchy
 */
function createHierarchyButtons(DTWHierarchy,LabelHierarchy){
    const showWindow = document.getElementById("show");
    const buttonDiv = document.getElementById('choose-hierarchy');
    buttonDiv.style.display = "inline-block";
    const buttonDTWHierarchy = document.getElementById('DTW-hierarchy');
    const buttonLabelHierarchy = document.getElementById('label-hierarchy');
    buttonDTWHierarchy.onclick = () => {
        isDTW = true; 
        hideHiddenLayerRightSide(); 
        deleteContentOfWindow(showWindow); 
        graphLayer(DTWHierarchy,null);
    };
    setLabelHierarchy(LabelHierarchy)
    buttonLabelHierarchy.onclick = function(){showLabelHierarchy(showWindow)};  
}

/**
 * Procedure for responsing after files load.
 * @param  {String} DTWHierarchyStringData DTW hierarchy data
 * @param  {String} labelHierarchyStringData label hierarchy data
 */
function loadExploration(DTWHierarchyStringData,labelHierarchyStringData,jsonData){
    if (dataFileInput.files.length == 0){
        console.log("No file selected!");
        return;
    }
    allNodes = {};
    currentCluster = null;
    isDTW = null;
    maxDistanceInHierarchy = 1;
    parseClusterData(DTWHierarchyStringData,labelHierarchyStringData,JSON.parse(jsonData));  
}


/**
 * Procedure for parsing data and creating images.
 * @param  {*} DTWHierarchyStringData DTW input data
 * @param  {*} labelHierarchyStringData label input data
 */
function parseClusterData(DTWHierarchyStringData,labelHierarchyStringData,jsonData){
    let maxLength = 0;
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let DTWHierarchyClusters = DTWparser(DTWHierarchyStringData);
        let LabelHierarchyClusters = LabelParser(labelHierarchyStringData);
        for (const key in jsonData) {
            if(!(key in allNodes)){
                continue;
            }
            allNodes[key].image = jsonData[key]
        }
        //console.log(allNodes)
        for(let sequence of sequences){
            if(!(sequence[0].split(' ')[2].trim() in allNodes)){
                continue;
            }
            if(maxLength < sequence.length){
                maxLength = sequence.length;
            }
            allNodes[sequence[0].split(' ')[2].trim()].sequence = sequence;
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
        createHierarchyButtons(DTWHierarchyClusters,LabelHierarchyClusters);
    },null,20,3000);
}

/**
 * Procedure for creating visualization for setting up current cluster.
 * @param  {*} node input node or cluster
 * @param  {*} goingDeep true if we are going down in hierarchy
 */
function graphLayer(node,goingDeep){ 
    if(goingDeep == null){
        currentCluster = node;
    }else{
        if(goingDeep){
            if(Object.keys(currentCluster.nextClusters).length == 0 || !(node.name in currentCluster.nextClusters)){
                return;
            }
            if(currentCluster.selectedNode != null){
                deleteStrokeWidth();
            }
            currentCluster = currentCluster.nextClusters[node.name];
        }else{
            if(currentCluster.selectedNode != null){
                deleteStrokeWidth();
            }
            currentCluster = currentCluster.upperCluster;
        
        }   
    }
    clearAllRightSide();
    const selectWindowLabel = document.getElementById('choose-label');
    if(isDTW){
        selectWindowLabel.style.display = "none";
    }else{
        selectWindowLabel.style.display = "block"; 
    }
    displayGraph();
    setUpperClusterButton();
    setUpClusterInfo();
}

/**
 * Function for parsing label data.
 * @param  {*} data input label data
 * 
 * @return parsed label data
 */
function LabelParser(data){
    let jsonData = JSON.parse(data);
    var depth = 1;
    let result = {};
    for(var key in jsonData){
        result[key] = recursiveParse(jsonData[key],null,depth,null,false,0," (Label " + key + ")")
    }
    return result;
}

/**
 * Function for parsing DTW data.
 * @param  {*} data input DTW data
 * 
 * @return parsed DTW data
 */
function DTWparser(data){
    let jsonData = JSON.parse(data);
    var depth = 1;
    return recursiveParse(jsonData.root,null,depth,null,true,0,"",{}); 
}


/**
 * Function for parsing data into clusters.
 * @param  {*} layerData input data on current layer
 * @param  {*} upperCluster upper cluster
 * @param  {Number} depth current depth
 * @param  {*} pivotNode pivot node of current cluster
 * @param  {Boolean} dtw true if parsing DTW hierarchy
 * 
 * @return new cluster
 */
function recursiveParse(layerData,upperCluster,depth,pivotNode,dtw,number_in_branch,label,labels_in_branch){
    let currCluster = new Cluster(pivotNode,upperCluster,depth,number_in_branch,label,labels_in_branch);
    let clusterDistannces = {};
    for(let action of layerData){
        let distancesInFormat = {};
        let distances = [];
        for(let distance of action.distances){
            let splitLineSecondtLayer = distance.split(':');
            if(parseFloat(splitLineSecondtLayer[1]) > currCluster.max){
                currCluster.max = parseFloat(splitLineSecondtLayer[1]);
            }
            distancesInFormat[splitLineSecondtLayer[0]] = parseFloat(splitLineSecondtLayer[1]);
            distances.push(parseFloat(splitLineSecondtLayer[1]));
        }
        clusterDistannces[action.name] = [distancesInFormat,distances];
        let node = setUpNode(action,currCluster,dtw)
        currCluster.nodes[action.name] = node;
        if(currCluster.max_nodes_in_children_branches < action.number_in_branch){
            currCluster.max_nodes_in_children_branches = action.number_in_branch;
        }
        if(typeof action.children !== 'undefined' && action.children.length > 1) {
            currCluster.nextClusters[action.name] = recursiveParse(action.children,currCluster,depth + 1,node,dtw,action.number_in_branch,label,action.labels_in_branch);
        }
        currCluster.labels[node.label] = (currCluster.labels[node.label] || 0) + 1;
    }
    computeLinks(clusterDistannces,currCluster); 
    return currCluster; 
}

function setUpNode(action,currCluster,dtw){
    let node;
    if(action.name in allNodes){
        node = allNodes[action.name];
        if(dtw){
            if(node.defaultDTWCluster == null){
                node.defaultDTWCluster = currCluster;
            }
        }else{
            if(node.defaultLabelCluster == null){
                node.defaultLabelCluster = currCluster;
            }
        }
    }else{
        node = new Node(action.name);
        if(dtw){
            node.defaultDTWCluster = currCluster;
        }else{
            node.defaultLabelCluster = currCluster;   
        }
        allNodes[action.name] = node;
    }
    return node
}

function computeLinks(clusterDistannces,currCluster){
    for(let key in clusterDistannces){
        let distancesInFormat = clusterDistannces[key][0];
        let distances = clusterDistannces[key][1];
        distances.sort(function(a,b){return a - b});
        for(var key2 in distancesInFormat){
            if(currCluster.nodes[key] == currCluster.nodes[key2]){
                continue;
            }
            var dist = distancesInFormat[key2];
            if(distances.length > 3 && dist > distances[2]){
                continue;
            }   
            if(!currCluster.nodes[key2]){
                continue;
            }
            if(dist > maxDistanceInHierarchy){
                maxDistanceInHierarchy = dist;
            }     
            currCluster.links.push({source: currCluster.nodes[key], target : currCluster.nodes[key2], distance : dist, title: dist});
        }
    }  
}

/**
 * Function for parsing sequnce into cords k3d.
 * @param  {*} sequence sequence
 * 
 * @return sequence parsed into cords
 */
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

/**
 * Procedure for timeouting frames.
 * @param  {*} controller controller
 * @param  {*} frames frames of sequence
 * @param  {Number} frame index of frame
 * @param  {*} button button html element
 * @param  {*} slider slider html element#
 * @param  {Number} marginGap margin between two timers
 * @param  {Number} fps fps
 */
function showInTime(controller,frames,frame,button,slider,marginGap,fps){
        showFrame(controller,frames,frame);
        slider.style.marginLeft = (parseFloat(slider.style.marginLeft) + marginGap) + "px";
        if(button.option == "runAnimation"){
            setTimeout(() => {
                frameQueue(controller,frames,frame+Math.floor(fps/10),button,slider,marginGap,fps);
            },100);  
        }
        
}

/**
 * Procedures for selecting frames from queue.
 * @param  {*} controller controller
 * @param  {*} frames frames of sequence
 * @param  {Number} frame index of frame
 * @param  {*} button button html element
 * @param  {*} slider slider html element#
 * @param  {Number} marginGap margin between two timers
 * @param  {Number} fps fps
 */
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
    button.addEventListener('click', () => {
        if(button.option == "runAnimation"){
            button.setAttribute("id","run-sequence-button");
            button.option = "stopAnimation";
        }else{
            slider.style.marginLeft = '0px';
            button.setAttribute("id","stop-sequence-button");
            button.option = "runAnimation";
            setTimeout(() => {
                frameQueue(controller,frames,Math.floor(FPS / 10),button,slider,marginGap,FPS)
            },10);
        }
        
    },);
    frames[0] = new K3D.K3DObject();
    frames[0].color = [29,248,190];
    frames[0].drawmode = "wireframe";
    frames[0].shademode = "depthcue";
    frames[0].scale = 3.2;
    frames[0].init(sequence[0],bonesStyle,[]);
    showFrame(controller, frames, 0);
    for (let index = Math.floor(FPS/10); index < sequence.length ;index += Math.floor(FPS/10)) {
        frames[index] = new K3D.K3DObject();
        frames[index].color = [29,248,190];
        frames[index].drawmode = "wireframe";
        frames[index].shademode = "depthcue";
        frames[index].scale = 3.2;
        frames[index].init(sequence[index],bonesStyle,[]);    
    }
    var marginGap =  285 / (Math.floor(frames.length / Math.floor(FPS/10)));
    var numOfTimes = Math.floor(frames.length / FPS );
    var marginTimesGap = (300 - ((frames.length % FPS) * (300 /  frames.length))) / numOfTimes;
    let firstTime = document.createElement("span");
    firstTime.innerText = "00:00";
    times.appendChild(firstTime);
    for(let i = 1; i < Math.ceil(frames.length / FPS); i++){
        let current = document.createElement("span");
        current.style.marginLeft = marginTimesGap - 32.54 + 'px';
        current.innerText = "00:" + i.toString().padStart(2, '0');
        times.appendChild(current);
    }
}