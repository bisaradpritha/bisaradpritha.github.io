// =====================================
// Connectome Engine
// =====================================

const canvas = document.getElementById("connectomeCanvas");
const ctx = canvas.getContext("2d");

let width, height;

function resizeCanvas() {

    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    if (nodes.length > 0) {

        generateNodes();
        buildConnections();

    }

}

window.addEventListener("resize", resizeCanvas);

// =====================================
// Node Class
// =====================================

class Node {

    constructor(id, x, y, radius) {

        this.id = id;

       // Home position
        this.homeX = x;
        this.homeY = y;
        
        // Current position
        this.x = x;
        this.y = y;
        
        this.radius = radius;
        
        this.neighbors = [];
        
        // Motion parameters
        this.phaseX = Math.random() * Math.PI * 2;
        this.phaseY = Math.random() * Math.PI * 2;
        
        this.freqX = 0.18 + Math.random() * 0.08;
        this.freqY = 0.18 + Math.random() * 0.08;
        
        this.ampX = 4 + Math.random() * 2;
        this.ampY = 4 + Math.random() * 2;
    }

}

// =====================================
// Edge Class
// =====================================

class Edge {

 constructor(nodeA, nodeB){

    this.nodeA = nodeA;
    this.nodeB = nodeB;

}

}

// =====================================
// Generate Nodes
// =====================================

const nodes = [];

const edges = [];

let elapsedTime = 0;

const NODE_COUNT = 70;

function generateNodes() {

    nodes.length = 0;

    for (let i = 0; i < NODE_COUNT; i++) {

        const x = Math.random() * width;
        const y = Math.random() * height;

        let radius;

        const r = Math.random();

        if (r < 0.65)
            radius = 2;

        else if (r < 0.90)
            radius = 4;

        else
            radius = 7;

        nodes.push(new Node(i, x, y, radius));

    }

}

// =====================================
// Distance Helper
// =====================================

function distance(nodeA, nodeB) {

    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;

    return Math.sqrt(dx * dx + dy * dy);

}

// =====================================
// Build Connections
// =====================================

function buildConnections() {

    edges.length = 0;

    const edgeSet = new Set();

    for (const node of nodes) {

        const sorted = [...nodes]
            .filter(other => other.id !== node.id)
            .sort((a, b) =>
                distance(node, a) - distance(node, b)
            );

        const neighbors = sorted.slice(0, 3);

        for (const neighbor of neighbors) {

            const key = [node.id, neighbor.id]
                .sort((a, b) => a - b)
                .join("-");

            if (!edgeSet.has(key)) {

                edgeSet.add(key);

                edges.push(new Edge(node, neighbor));

            }

        }

    }

}

// =====================================
// Update Nodes
// =====================================

function updateNodes() {

    for (const node of nodes) {

        node.x =
            node.homeX +
            node.ampX *
            Math.sin(
                elapsedTime * node.freqX * Math.PI * 2
                + node.phaseX
            );

        node.y =
            node.homeY +
            node.ampY *
            Math.cos(
                elapsedTime * node.freqY * Math.PI * 2
                + node.phaseY
            );

    }

}

// =====================================
// Draw Edges
// =====================================

function drawEdges() {

    ctx.strokeStyle = "rgba(187, 85, 121, 0.3)";
    ctx.lineWidth = 1.2;

    for (const edge of edges) {

        ctx.beginPath();

        ctx.moveTo(
            edge.nodeA.x,
            edge.nodeA.y
        );

        const ax = edge.nodeA.x;
        const ay = edge.nodeA.y;
        
        const bx = edge.nodeB.x;
        const by = edge.nodeB.y;
        
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2;
        
        const dx = bx - ax;
        const dy = by - ay;
        
        const length = Math.hypot(dx, dy);
        
        const nx = -dy / length;
        const ny = dx / length;
        
        // gentle curve
        const bend = length * 0.18;
        
        ctx.quadraticCurveTo(
        
            midX + nx * bend,
            midY + ny * bend,
        
            bx,
            by
        
        );

        ctx.stroke();

    }

}

// =====================================
// Draw Nodes
// =====================================

function drawNodes() {

    ctx.fillStyle = "rgba(187,85,121,0.9)";

    for (const node of nodes) {

        ctx.beginPath();

        ctx.arc(
            node.x,
            node.y,
            node.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}



// =====================================
// Render
// =====================================

function render() {

    ctx.clearRect(0, 0, width, height);

    drawEdges();

    drawNodes();

}

// =====================================
// Animation Loop
// =====================================

function animate() {

    elapsedTime += 1 / 60;

    updateNodes();

    render();

    requestAnimationFrame(animate);

}

// =====================================
// Initialize
// =====================================

resizeCanvas();

generateNodes();

buildConnections();

animate();
