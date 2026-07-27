// =====================================
// Connectome Engine
// =====================================

const canvas = document.getElementById("connectomeCanvas");
const ctx = canvas.getContext("2d");

let width, height;

function resizeCanvas() {

    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

// =====================================
// Node Class
// =====================================

class Node {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.radius = radius;

    }

}

// =====================================
// Generate Nodes
// =====================================

const nodes = [];

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

        nodes.push(new Node(x, y, radius));

    }

}

generateNodes();

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

    drawNodes();

}

render();
