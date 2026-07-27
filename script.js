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

       // Current position
        this.x = x;
        this.y = y;
        
        // Home position
        this.homeX = x;
        this.homeY = y;
        
        // Velocity
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        
        this.radius = radius;
        
        this.neighbors = [];
    }

}

// =====================================
// Edge Class
// =====================================

class Edge {

    constructor(nodeA, nodeB) {

        this.nodeA = nodeA;
        this.nodeB = nodeB;

        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = (nodeA.y + nodeB.y) / 2;

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;

        const length = Math.sqrt(dx * dx + dy * dy);

        const nx = -dy / length;
        const ny = dx / length;

        const bend = (Math.random() - 0.5) * length * 0.35;

        this.controlX = midX + nx * bend;
        this.controlY = midY + ny * bend;

    }

}

// =====================================
// Generate Nodes
// =====================================

const nodes = [];

const edges = [];

let time = 0;

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

        // Spring back toward home
        let fx = (node.homeX - node.x) * 0.003;
        let fy = (node.homeY - node.y) * 0.003;

        // Tiny random perturbation
        fx += (Math.random() - 0.5) * 0.03;
        fy += (Math.random() - 0.5) * 0.03;

        // Integrate force
        node.vx += fx;
        node.vy += fy;

        // Damping
        node.vx *= 0.97;
        node.vy *= 0.97;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

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

        ctx.quadraticCurveTo(

            edge.controlX,
            edge.controlY,
        
            edge.nodeB.x,
            edge.nodeB.y
        
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
