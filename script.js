
(() => {

// =====================================
// Configuration
// =====================================

const NODE_COUNT = 70;
const CONNECTIONS_PER_NODE = 3;

const NODE_COLOR = "#bb5579";
const EDGE_COLOR = "rgba(187,85,121,0.28)";

const DRIFT_RADIUS = 12;
const DRIFT_MIN_TIME = 3000;
const DRIFT_MAX_TIME = 6000;

// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("connectomeCanvas");
const ctx = canvas.getContext("2d");

let width;
let height;

const nodes = [];
const edges = [];
const pulses = [];

function resizeCanvas() {

    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

}

window.addEventListener("resize", resizeCanvas);

// =====================================
// Classes
// =====================================

class Node {

    constructor(id, x, y, radius) {

        this.id = id;

        this.radius = radius;

        // Home position

        this.homeX = x;
        this.homeY = y;

        // Current position

        this.x = x;
        this.y = y;

        // Motion

        this.startX = x;
        this.startY = y;

        this.targetX = x;
        this.targetY = y;

        this.moveStart = performance.now();

        this.moveDuration =
            DRIFT_MIN_TIME +
            Math.random() *
            (DRIFT_MAX_TIME - DRIFT_MIN_TIME);

        this.baseRadius = radius;
        this.phase = Math.random() * Math.PI * 2;

    }

}

class Edge {

    constructor(nodeA, nodeB) {

        this.nodeA = nodeA;
        this.nodeB = nodeB;

    }

}

class Pulse {

    constructor(edge, direction = 1) {

        this.edge = edge;

        this.direction = direction;

        this.progress = 0;

        this.speed =
            0.35 + Math.random() * 0.25;

        this.radius = 3.5;

    }

}

// =====================================
// Helpers
// =====================================

function distance(a, b) {

    const dx = a.homeX - b.homeX;
    const dy = a.homeY - b.homeY;

    return Math.hypot(dx, dy);

}

function randomRadius() {

    const r = Math.random();

    if (r < 0.65) return 2;

    if (r < 0.90) return 4;

    return 7;

}

// Soft center-biased coordinate

function randomCoordinate(max) {

    if (Math.random() < 0.70) {

        return Math.random() * max;

    }

    const center = max / 2;

    return center + (Math.random() - 0.5) * max * 0.55;

}

// =====================================
// Graph Generation
// =====================================

function generateNodes() {

    nodes.length = 0;

    for (let i = 0; i < NODE_COUNT; i++) {

        const x = randomCoordinate(width);
        const y = randomCoordinate(height);

        nodes.push(

            new Node(
                i,
                x,
                y,
                randomRadius()
            )

        );

    }

}

function buildConnections() {

    edges.length = 0;

    const edgeSet = new Set();

    for (const node of nodes) {

        const nConnections =
            node.radius >= 7 ? 7 :
            node.radius >= 4 ? 4 : 2;
        
        const nearest = [...nodes]
        
            .filter(other => other.id !== node.id)
        
            .sort((a, b) => distance(node, a) - distance(node, b))
        
            .slice(0, nConnections);

        for (const neighbor of nearest) {

            const key =

                node.id < neighbor.id

                ? `${node.id}-${neighbor.id}`

                : `${neighbor.id}-${node.id}`;

            if (edgeSet.has(key))
                continue;

            edgeSet.add(key);

            edges.push(

                new Edge(node, neighbor)

            );

        }

    }

}

    
// =====================================
// Animation
// =====================================

function chooseNewTarget(node, now) {

    node.startX = node.x;
    node.startY = node.y;

    node.targetX =
        node.homeX +
        (Math.random() * 2 - 1) * DRIFT_RADIUS;

    node.targetY =
        node.homeY +
        (Math.random() * 2 - 1) * DRIFT_RADIUS;

    node.moveStart = now;

    node.moveDuration =
        DRIFT_MIN_TIME +
        Math.random() *
        (DRIFT_MAX_TIME - DRIFT_MIN_TIME);

}

function smoothstep(t) {

    return t * t * (3 - 2 * t);

}

function updateNodes(now) {

    for (const node of nodes) {

        let t =
            (now - node.moveStart) /
            node.moveDuration;

        if (t >= 1) {

            node.x = node.targetX;
            node.y = node.targetY;

            chooseNewTarget(node, now);

            t = 0;

        }

        const e = smoothstep(t);

        node.x =
            node.startX +
            (node.targetX - node.startX) * e;

        node.y =
            node.startY +
            (node.targetY - node.startY) * e;

        node.radius =
        node.baseRadius *
        (1 + 0.06 * Math.sin(now * 0.0012 + node.phase));

    }

}

function updatePulses() {

    for (let i = pulses.length - 1; i >= 0; i--) {

        const pulse = pulses[i];

        pulse.progress += pulse.speed / 100;

        if (pulse.progress >= 1) {

            pulses.splice(i, 1);

        }

    }

}

// =====================================
// Rendering
// =====================================

function drawEdges() {

    for (const edge of edges) {

        const ax = edge.nodeA.x;
        const ay = edge.nodeA.y;

        const bx = edge.nodeB.x;
        const by = edge.nodeB.y;

        const dx = bx - ax;
        const dy = by - ay;

        const length = Math.hypot(dx, dy);

        if (length < 1) continue;

        // Thickness depends on connected node sizes
        ctx.lineWidth =
            0.8 +
            (edge.nodeA.radius + edge.nodeB.radius) / 10;

        const alpha = Math.max(
            0.08,
            0.35 - length / 800
        );

        ctx.strokeStyle = `rgba(187,85,121,${alpha})`;

        const nx = -dy / length;
        const ny = dx / length;

        const bend = Math.min(
            Math.max(length * 0.12, 6),
            18
        );

        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;

        ctx.beginPath();
        ctx.moveTo(ax, ay);

        ctx.quadraticCurveTo(
            mx + nx * bend,
            my + ny * bend,
            bx,
            by
        );

        ctx.stroke();
    }
}
    
function drawNodes() {

    ctx.fillStyle = NODE_COLOR;

    for (const node of nodes) {

        ctx.shadowBlur = node.radius * 3;
        ctx.shadowColor = NODE_COLOR;
        
        ctx.beginPath();

        ctx.arc(

            node.x,
            node.y,
            node.radius,
            0,
            Math.PI * 2

        );

        ctx.fill();

        ctx.shadowBlur = 0;

    }

}

function drawPulses() {

    ctx.fillStyle = "#ffd6e5";

    for (const pulse of pulses) {

        const a = pulse.edge.nodeA;
        const b = pulse.edge.nodeB;

        const t = pulse.progress;

        const x =
            a.x +
            (b.x - a.x) * t;

        const y =
            a.y +
            (b.y - a.y) * t;

        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ffd6e5";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            pulse.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

    ctx.shadowBlur = 0;

}


function render() {

    ctx.fillStyle = "#0d0320";
    ctx.fillRect(0, 0, width, height);

    drawEdges();
    drawPulses();
    drawNodes();

}

// =====================================
// Main Loop
// =====================================

function animate(now) {

    updateNodes(now);

    updatePulses();

    render();

    if (Math.random() < 0.015 && edges.length) {

        const edge =
            edges[Math.floor(Math.random() * edges.length)];
    
        pulses.push(new Pulse(edge));
    
    }

    requestAnimationFrame(animate);

}

// =====================================
// Initialize
// =====================================

resizeCanvas();

generateNodes();

buildConnections();

const now = performance.now();

for (const node of nodes) {

    chooseNewTarget(node, now);

}

requestAnimationFrame(animate);

})();
