(() => {

// =====================================
// Configuration
// =====================================

const NODE_COUNT = 120;
const CONNECTIONS_PER_NODE = 4;

const NODE_COLOR = "#33ff33";
const EDGE_COLOR = "rgba(255,204,116,0.28)";

const DRIFT_MIN_TIME = 3000;
const DRIFT_MAX_TIME = 6000;

const mouse = {
    x: -1000,
    y: -1000,
    active: false
};

// Toned down from the original 220/3 — the repulsion effect
// was too dramatic against the new sphere structure, so it's
// a gentler, more localized push now.
const REPULSE_RADIUS = 160;
const REPULSE_STRENGTH = 1.6;
const NETWORK_RADIUS_FACTOR = 0.38;

// Nodes near the sphere's boundary barely wander (that's
// what keeps the ring/edge well-defined); nodes near the
// center are free to drift much further. This replaces the
// old flat DRIFT_RADIUS with a per-node budget.
const EDGE_JITTER = 6;
const CENTER_JITTER = 34;

// Y-axis rotation
let rotation = 0;
const ROTATION_SPEED = 0.0018;

// Organic clustering — a handful of irregular seed points on
// the sphere that nodes gather around, so the network reads
// like modular biological structure (protein complexes,
// neural ganglia) instead of a mathematically even mesh.
const CLUSTER_COUNT = 10;
const SHELL_FRACTION = 0.72;
let clusters = [];

function buildClusters() {

    clusters = [];

    for (let i = 0; i < CLUSTER_COUNT; i++) {

        const u = Math.random();
        const theta = Math.acos(2 * u - 1);
        const phi = Math.random() * Math.PI * 2;

        clusters.push({
            theta,
            phi,
            weight: 0.5 + Math.random() * 1.5,
            spread: 0.18 + Math.random() * 0.32
        });

    }

}

function pickCluster() {

    const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * totalWeight;

    for (const c of clusters) {

        if (r < c.weight) return c;
        r -= c.weight;

    }

    return clusters[clusters.length - 1];

}

// Random brief brightness flashes on a few nodes at a time —
// like an activation event, independent and unsynchronized.
const FLASH_DURATION = 550;
const FLASH_CHANCE_PER_FRAME = 0.035;
const MAX_CONCURRENT_FLASHES = 4;

// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("connectomeCanvas");

// This canvas only exists on index.html — the other pages
// use the lighter .ambient-network canvas set up further
// down this file instead.
if (canvas) {

const ctx = canvas.getContext("2d");

let width;
let height;

const nodes = [];
const edges = [];
const pulses = [];

// Set once per generateNodes() call, referenced by
// chooseNewTarget() and the rotation/depth math in
// updateNodes() so they all agree on the same sphere size.
let sphereRadius = 0;

function maybeSpawnFlash(now) {

    const activeCount = nodes.reduce(
        (sum, n) => sum + (now < n.flashUntil ? 1 : 0), 0
    );

    if (activeCount >= MAX_CONCURRENT_FLASHES) return;
    if (Math.random() >= FLASH_CHANCE_PER_FRAME) return;

    const candidate = nodes[Math.floor(Math.random() * nodes.length)];

    if (now < candidate.flashUntil) return;

    candidate.flashStart = now;
    candidate.flashUntil = now + FLASH_DURATION;

}

function resizeCanvas() {

    // Logical (CSS pixel) size — all node/edge math below
    // still uses these, so nothing else needs to change.
    width = window.innerWidth;
    height = window.innerHeight;

    // Backing store sized for the screen's actual pixel
    // density so the network doesn't look soft/blurry on
    // retina and high-DPI monitors, and doesn't appear
    // sparser/denser purely because of screen resolution.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}


window.addEventListener("resize", resizeCanvas);

window.addEventListener("mousemove", e => {

    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;

});

window.addEventListener("mouseleave", () => {

    mouse.active = false;

});

window.addEventListener("touchstart", e => {

    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.active = true;

}, { passive: true });

window.addEventListener("touchmove", e => {

    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;

}, { passive: true });

window.addEventListener("touchend", () => {

    mouse.active = false;

});

// =====================================
// Classes
// =====================================

class Node {

    constructor(id, x3d, y3d, z3d, radius, radiusFraction) {

        this.id = id;

        this.radius = radius;

        // Fixed 3D anchor on/within the sphere — this is what
        // the drift wobble orbits around, and what gets
        // rotated each frame to produce the 2D screen position.

        this.baseX3d = x3d;
        this.baseY3d = y3d;
        this.baseZ3d = z3d;

        this.radiusFraction = radiusFraction;

        // Nodes near the sphere's edge barely wander (keeps
        // the boundary well-defined); nodes near the center
        // drift much more freely.
        this.jitterBudget =
            EDGE_JITTER +
            (1 - radiusFraction) * (CENTER_JITTER - EDGE_JITTER);

        // 3D drift motion — same smoothstep-interpolated
        // random-target system as before, just extended to
        // three dimensions instead of two.

        this.startX3d = x3d;
        this.startY3d = y3d;
        this.startZ3d = z3d;

        this.targetX3d = x3d;
        this.targetY3d = y3d;
        this.targetZ3d = z3d;

        this.moveStart = performance.now();

        this.moveDuration =
            DRIFT_MIN_TIME +
            Math.random() *
            (DRIFT_MAX_TIME - DRIFT_MIN_TIME);

        // Final rendered 2D position (post-drift, post-
        // rotation, post mouse-repulsion) — same role as
        // before, just now derived from the 3D pipeline.

        this.x = 0;
        this.y = 0;

        // 0 = fully on the far side, 1 = fully facing the
        // viewer. Drives size/brightness so the far side of
        // the sphere reads as receding rather than flat.
        this.depth = 1;

        this.baseRadius = radius;
        this.phase = Math.random() * Math.PI * 2;

        // Offset params
        this.offsetX = 0;
        this.offsetY = 0;

        this.vx = 0;
        this.vy = 0;

        // Brief random brightness flashes
        this.flashStart = 0;
        this.flashUntil = 0;

    }

}

class Edge {

    constructor(nodeA, nodeB) {

        this.nodeA = nodeA;
        this.nodeB = nodeB;
        const length = distance(nodeA, nodeB);
    
        const maxBend =
            Math.min(
                Math.max(length * 0.18, 8),
                28
            );
    
        this.bend =
            (Math.random() ** 2) *
            maxBend *
            (Math.random() < 0.5 ? -1 : 1);

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

    const dx = a.baseX3d - b.baseX3d;
    const dy = a.baseY3d - b.baseY3d;
    const dz = a.baseZ3d - b.baseZ3d;

    return Math.sqrt(dx*dx + dy*dy + dz*dz);

}

function randomRadius() {

    const r = Math.random();

    if (r < 0.65) return 3;

    if (r < 0.90) return 4.5;

    return 7;

}


// =====================================
// Graph Generation
// =====================================

function generateNodes() {

    nodes.length = 0;

    buildClusters();

    sphereRadius =
        Math.min(width, height) *
        NETWORK_RADIUS_FACTOR;

    for (let i = 0; i < NODE_COUNT; i++) {

        const radius = randomRadius();

        const isShell = i < NODE_COUNT * SHELL_FRACTION;

        // Shell nodes sit close to the sphere's surface, with
        // only a little jitter — this is what forms the
        // definite ring/boundary. Interior nodes get a radius
        // biased toward the center via a power curve, for a
        // volume-uniform-ish scatter.
        const radiusFraction = isShell
            ? 0.95 + Math.random() * 0.05
            : Math.pow(Math.random(), 1.6) * 0.85;

        // 15% of nodes ignore clustering entirely — pure
        // free-floating noise, so the structure doesn't read
        // as too neatly modular.
        const useCluster = Math.random() < 0.85;

        let theta, phi;

        if (useCluster) {

            const cluster = pickCluster();

            // Sum of three uniforms is a cheap stand-in for a
            // Gaussian — bell-shaped jitter around the cluster
            // center rather than a hard-edged uniform blob.
            const jitterT = (Math.random() + Math.random() + Math.random() - 1.5);
            const jitterP = (Math.random() + Math.random() + Math.random() - 1.5);

            theta = cluster.theta + jitterT * cluster.spread;
            phi = cluster.phi + jitterP * cluster.spread;

            theta = Math.max(0.05, Math.min(Math.PI - 0.05, theta));

        } else {

            theta = Math.acos(2 * Math.random() - 1);
            phi = Math.random() * Math.PI * 2;

        }

        const r = sphereRadius * radiusFraction;

        const x3d = r * Math.sin(theta) * Math.cos(phi);
        const y3d = r * Math.cos(theta);
        const z3d = r * Math.sin(theta) * Math.sin(phi);

        let valid = true;

        for (const other of nodes) {

            const minSpacing =
                radius + other.baseRadius + 6 + Math.random() * 4;

            const dx = x3d - other.baseX3d;
            const dy = y3d - other.baseY3d;
            const dz = z3d - other.baseZ3d;

            if (Math.sqrt(dx*dx + dy*dy + dz*dz) < minSpacing) {

                valid = false;
                break;

            }

        }

        if (!valid) {

            i--;
            continue;

        }

        nodes.push(
            new Node(
                i,
                x3d,
                y3d,
                z3d,
                radius,
                radiusFraction
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

    node.startX3d = node.targetX3d;
    node.startY3d = node.targetY3d;
    node.startZ3d = node.targetZ3d;

    // Candidate destination — jitter around the node's fixed
    // sphere anchor, budget scaled per-node (tight near the
    // boundary, loose near the center).
    let tx = node.baseX3d + (Math.random() * 2 - 1) * node.jitterBudget;
    let ty = node.baseY3d + (Math.random() * 2 - 1) * node.jitterBudget;
    let tz = node.baseZ3d + (Math.random() * 2 - 1) * node.jitterBudget;

    // Keep drift targets from wandering past the sphere's
    // own radius (mainly relevant for interior nodes with a
    // large jitter budget).
    const d = Math.sqrt(tx*tx + ty*ty + tz*tz);

    if (d > sphereRadius) {

        tx = tx / d * sphereRadius;
        ty = ty / d * sphereRadius;
        tz = tz / d * sphereRadius;

    }

    node.targetX3d = tx;
    node.targetY3d = ty;
    node.targetZ3d = tz;

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

    const centerX = width / 2;
    const centerY = height / 2;

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    for (const node of nodes) {

        let t =
            (now - node.moveStart) /
            node.moveDuration;

        if (t >= 1) {

            chooseNewTarget(node, now);

            t = 0;

        }

        const e = smoothstep(t);

        // 3D drift position, in the sphere's own unrotated
        // local space.
        const driftedX =
            node.startX3d +
            (node.targetX3d - node.startX3d) * e;

        const driftedY =
            node.startY3d +
            (node.targetY3d - node.startY3d) * e;

        const driftedZ =
            node.startZ3d +
            (node.targetZ3d - node.startZ3d) * e;

        // Y-axis rotation, applied once per frame to every
        // node — this is what makes the whole structure read
        // as a slowly turning sphere.
        const rx = driftedX * cosR + driftedZ * sinR;
        const rz = -driftedX * sinR + driftedZ * cosR;

        node.depth = Math.max(0, Math.min(1,
            (rz + sphereRadius) / (sphereRadius * 2)
        ));

        node.x = centerX + rx;
        node.y = centerY + driftedY;

        // ============================
        // Cursor repulsion goes HERE
        // ============================

        // Decay the displayed offset
        node.offsetX *= 0.96;
        node.offsetY *= 0.96;
        
        // Mouse force
        if (mouse.active) {
        
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
        
            const d = Math.hypot(dx, dy);
        
            if (d < REPULSE_RADIUS && d > 1) {
        
                const strength =
                    Math.pow(1 - d / REPULSE_RADIUS, 2) *
                    REPULSE_STRENGTH;
        
                node.vx += dx / d * strength;
                node.vy += dy / d * strength;
        
            }
        
        }
        
        // Velocity damping
        node.vx *= 0.82;
        node.vy *= 0.82;
        
        // Apply velocity
        node.offsetX += node.vx;
        node.offsetY += node.vy;
        
        // Draw position
        node.x += node.offsetX;
        node.y += node.offsetY;
        
        // ============================
        // Existing breathing animation
        // ============================

        node.radius =
            node.baseRadius *
            (1 + 0.06 * Math.sin(now * 0.0012 + node.phase));

    }

    maybeSpawnFlash(now);

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

        // Depth-modulated — edges on the far side of the
        // rotating sphere fade out rather than staying flat,
        // which is what actually sells the 3D read. Very
        // deep back-side edges are skipped entirely so the
        // far side doesn't turn into visual mud.
        const avgDepth = (edge.nodeA.depth + edge.nodeB.depth) / 2;

        if (avgDepth < 0.12) continue;

        // Thickness depends on connected node sizes
        ctx.lineWidth =
            (0.8 +
            (edge.nodeA.radius + edge.nodeB.radius) / 10) *
            (0.5 + avgDepth * 0.6);

        const lengthAlpha = Math.max(
            0.1,
            0.5 - length / 800
        );

        const alpha = lengthAlpha * (0.35 + avgDepth * 0.65);

        ctx.strokeStyle = `rgba(255,204,116,${alpha})`;

        const nx = -dy / length;
        const ny = dx / length;

        const bend = edge.bend;

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

    const now = performance.now();

    for (const node of nodes) {

        let flashBoost = 0;

        if (now < node.flashUntil) {

            const progress = (now - node.flashStart) / FLASH_DURATION;
            flashBoost = Math.sin(progress * Math.PI);

        }

        // Depth-modulated brightness/size, boosted briefly for
        // whichever nodes are currently "activated".
        const alpha = Math.min(1,
            0.35 + node.depth * 0.65 + flashBoost * 0.5
        );

        const renderRadius =
            node.radius *
            (0.55 + node.depth * 0.55) *
            (1 + flashBoost * 0.8);

        ctx.fillStyle = `rgba(51,255,51,${alpha})`;

        ctx.shadowBlur = renderRadius * 3 + flashBoost * 16;
        ctx.shadowColor = NODE_COLOR;
        
        ctx.beginPath();

        ctx.arc(

            node.x,
            node.y,
            renderRadius,
            0,
            Math.PI * 2

        );

        ctx.fill();

        ctx.shadowBlur = 0;

    }

}

function drawPulses() {

    for (const pulse of pulses) {

        const a = pulse.edge.nodeA;
        const b = pulse.edge.nodeB;

        const t = pulse.progress;

        // Same curve the edge itself is drawn with — without
        // this, the pulse cut a straight line across a
        // visibly bent edge instead of riding along it.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy);

        if (length < 1) continue;

        const nx = -dy / length;
        const ny = dx / length;

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        const cx = mx + nx * pulse.edge.bend;
        const cy = my + ny * pulse.edge.bend;

        const x =
            (1 - t) * (1 - t) * a.x +
            2 * (1 - t) * t * cx +
            t * t * b.x;

        const y =
            (1 - t) * (1 - t) * a.y +
            2 * (1 - t) * t * cy +
            t * t * b.y;

        const avgDepth = (a.depth + b.depth) / 2;

        ctx.fillStyle = `rgba(250,116,32,${0.5 + avgDepth * 0.5})`;

        ctx.shadowBlur = 18 * (0.5 + avgDepth * 0.5);
        ctx.shadowColor = "#ffffff";

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

    ctx.shadowBlur = 2;

}


function render() {

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, height);

    drawEdges();
    drawPulses();
    drawNodes();

}

// =====================================
// Main Loop
// =====================================

function animate(now) {

    rotation += ROTATION_SPEED;

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
// Hero Elements
// =====================================

const connectomeHero =
    document.getElementById("connectome-hero");

const heroIntro =
    document.getElementById("hero-intro");

const connectomeCanvas =
    document.getElementById("connectomeCanvas");

window.addEventListener("scroll", () => {

    const progress = Math.min(
        window.scrollY / window.innerHeight,
        1
    );

    connectomeCanvas.style.opacity =
        1 - progress * 0.9;

    connectomeCanvas.style.transform =
        `scale(${1 + progress * 0.05})`;

    const introProgress = Math.min(
        progress * 2,
        1
    );
    
    const heroContent =
        document.querySelector(".hero-content");
    
    heroContent.style.opacity =
        introProgress;
    
    heroContent.style.transform =
        `translateY(${60*(1-introProgress)}px)`;

});

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


} // end if (canvas) — hero connectome

})();


// =====================================================
// Ambient Connectome (About / Research / Contact)
// A much lighter, non-interactive echo of the homepage
// network — a handful of slowly drifting nodes and thin
// connecting edges, low opacity, no mouse interaction.
// Runs once per .ambient-network canvas found on the page.
// =====================================================

(() => {

const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Matches the CSS breakpoint that hides .ambient-network on
// mobile — skip the canvas setup and animation loop entirely
// rather than running it invisibly in the background.
const isMobile = window.matchMedia("(max-width: 768px)").matches;

if (isMobile) return;

const canvases = document.querySelectorAll(".ambient-network");

if (!canvases.length) return;

const AMBIENT_NODE_COLOR = "#33ff33";
const AMBIENT_EDGE_BASE_ALPHA = 0.16;
const AMBIENT_EDGE_RGB = "51,255,51";
const AMBIENT_EDGE_COLOR = `rgba(${AMBIENT_EDGE_RGB},${AMBIENT_EDGE_BASE_ALPHA})`;
const AMBIENT_LINK_DISTANCE_FACTOR = 0.14;

// Density scales with the container's area instead of using
// a fixed node count, so a short page (Contact) and a long
// page (Research, with its full timeline) both read as an
// evenly-populated network rather than the same handful of
// nodes stretched thin over a much bigger canvas.
function nodeCountFor(width, height) {

    const area = width * height;
    const density = Math.round(area / 30000);

    return Math.min(90, Math.max(36, density));

}

canvases.forEach((canvas) => {

    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let nodes = [];

    function resize() {

        const parent = canvas.parentElement;
        width = parent.clientWidth;
        height = parent.clientHeight;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    }

    function makeNodes() {

        nodes = [];

        const count = nodeCountFor(width, height);

        // Jittered grid instead of pure Math.random() placement.
        // Pure randomness naturally produces clumps and empty gaps
        // (a well-known artifact — true randomness doesn't look
        // "evenly spread" to the eye). Splitting the canvas into a
        // grid and placing one node per cell, with a small random
        // offset inside that cell, keeps coverage even while each
        // node still lands in a slightly different spot.

        const cols = Math.max(1, Math.round(Math.sqrt(count * width / height)));
        const rows = Math.max(1, Math.round(count / cols));

        const cellW = width / cols;
        const cellH = height / rows;

        // How far a node can drift from its cell's center, as a
        // fraction of the cell size. Lower = more evenly gridded
        // and orderly, higher = more organic/random-looking.
        const JITTER = 0.62;

        for (let r = 0; r < rows; r++) {

            for (let c = 0; c < cols; c++) {

                const cellCenterX = (c + 0.5) * cellW;
                const cellCenterY = (r + 0.5) * cellH;

                const offsetX = (Math.random() - 0.5) * cellW * JITTER;
                const offsetY = (Math.random() - 0.5) * cellH * JITTER;

                nodes.push({
                    x: cellCenterX + offsetX,
                    y: cellCenterY + offsetY,
                    vx: (Math.random() - 0.5) * 0.12,
                    vy: (Math.random() - 0.5) * 0.12,
                    radius: 2 + Math.random() * 2.2
                });

            }

        }

    }

    function step() {

        const linkDistance =
            Math.max(width, height) * AMBIENT_LINK_DISTANCE_FACTOR;

        ctx.clearRect(0, 0, width, height);

        // Drift + wrap around edges
        for (const n of nodes) {

            n.x += n.vx;
            n.y += n.vy;

            if (n.x < -20) n.x = width + 20;
            if (n.x > width + 20) n.x = -20;
            if (n.y < -20) n.y = height + 20;
            if (n.y > height + 20) n.y = -20;

        }

        // Edges between nearby nodes
        ctx.lineWidth = 1.3;

        for (let i = 0; i < nodes.length; i++) {

            for (let j = i + 1; j < nodes.length; j++) {

                const a = nodes[i];
                const b = nodes[j];

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < linkDistance) {

                    const opacity = 1 - dist / linkDistance;

                    ctx.strokeStyle = AMBIENT_EDGE_COLOR
                        .replace(
                            String(AMBIENT_EDGE_BASE_ALPHA),
                            (AMBIENT_EDGE_BASE_ALPHA * opacity).toFixed(3)
                        );

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();

                }

            }

        }

        // Nodes
        ctx.fillStyle = AMBIENT_NODE_COLOR;

        for (const n of nodes) {

            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();

        }

    }

    function loop() {

        step();
        requestAnimationFrame(loop);

    }

    window.addEventListener("resize", () => {

        resize();
        makeNodes();

    });

    resize();
    makeNodes();

    if (prefersReducedMotion) {

        // Draw a single static frame instead of animating
        step();

    } else {

        requestAnimationFrame(loop);

    }

});

})();


// =====================================================
// Scroll Reveal
// Fades/slides .reveal elements in the first time they
// scroll into view. Staggers siblings slightly so groups
// of cards feel like they arrive together, not all at once.
// =====================================================

(() => {

const revealEls = document.querySelectorAll(".reveal");

if (!revealEls.length) return;

const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion) {

    revealEls.forEach(el => el.classList.add("is-visible"));
    return;

}

// Stagger elements that share a parent, so grids of cards
// cascade in rather than popping in simultaneously.
const groups = new Map();

revealEls.forEach((el) => {

    const parent = el.parentElement;

    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);

});

groups.forEach((siblings) => {

    siblings.forEach((el, i) => {

        el.style.transitionDelay = Math.min(i * 90, 360) + "ms";

    });

});

const observer = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

        if (entry.isIntersecting) {

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);

        }

    });

}, {
    threshold: 0.15,
    rootMargin: "0px 0px -60px 0px"
});

revealEls.forEach(el => observer.observe(el));

})();


// =====================================================
// Card Tilt
// Subtle mouse-position-based 3D tilt on any element
// with the .tilt class (interest/publication/contact/
// timeline/journey cards). Skipped on touch devices,
// where hover doesn't really apply.
// =====================================================

(() => {

const isTouch = window.matchMedia("(hover: none)").matches;
const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (isTouch || prefersReducedMotion) return;

const TILT_MAX_DEG = 6;
const LIFT_PX = 8;

document.querySelectorAll(".tilt").forEach((card) => {

    card.addEventListener("mouseenter", () => {

        card.classList.add("tilt-active");

    });

    card.addEventListener("mousemove", (e) => {

        const rect = card.getBoundingClientRect();

        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        const rotateY = (px - 0.5) * TILT_MAX_DEG * 2;
        const rotateX = (0.5 - py) * TILT_MAX_DEG * 2;

        card.style.transform =
            `perspective(900px) translateY(-${LIFT_PX}px) ` +
            `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    });

    card.addEventListener("mouseleave", () => {

        card.classList.remove("tilt-active");
        card.style.transform = "";

    });

});

})();


// =====================================================
// Magnetic Buttons
// CTA buttons gently pull toward the cursor within a
// small radius, and snap back on mouse leave.
// =====================================================

(() => {

const isTouch = window.matchMedia("(hover: none)").matches;
const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (isTouch || prefersReducedMotion) return;

const PULL_STRENGTH = 0.35;
const MAX_OFFSET = 10;

document.querySelectorAll(".magnetic").forEach((btn) => {

    btn.addEventListener("mouseenter", () => {

        btn.classList.add("magnetic-active");

    });

    btn.addEventListener("mousemove", (e) => {

        const rect = btn.getBoundingClientRect();

        const offsetX = (e.clientX - rect.left - rect.width / 2)
            * PULL_STRENGTH;
        const offsetY = (e.clientY - rect.top - rect.height / 2)
            * PULL_STRENGTH;

        const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offsetX));
        const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offsetY));

        btn.style.transform =
            `translate(${clampedX}px, ${clampedY}px)`;

    });

    btn.addEventListener("mouseleave", () => {

        btn.classList.remove("magnetic-active");
        btn.style.transform = "";

    });

});

})();


// =====================================================
// Mobile nav toggle
// Opens/closes the dropdown menu, keeps aria-expanded in
// sync for screen readers, and closes automatically when
// a link is tapped or the viewport grows back past mobile.
// =====================================================

(() => {

const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (!toggle || !navLinks) return;

function closeMenu() {

    navLinks.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");

}

function openMenu() {

    navLinks.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");

}

toggle.addEventListener("click", () => {

    const isOpen = navLinks.classList.contains("open");

    if (isOpen) {
        closeMenu();
    } else {
        openMenu();
    }

});

navLinks.querySelectorAll("a").forEach((link) => {

    link.addEventListener("click", closeMenu);

});

// Resizing past the mobile breakpoint (e.g. rotating a
// tablet, or a desktop window being resized) shouldn't
// leave the dropdown open with no toggle button visible.
window.addEventListener("resize", () => {

    if (window.innerWidth > 768) closeMenu();

});

})();


// =====================================================
// Header show/hide on scroll
// Header gets a solid backdrop once the page has scrolled
// a bit, and tucks away on scroll-down / reappears on
// scroll-up so it doesn't compete with content but is
// always reachable.
// =====================================================

(() => {

const header = document.querySelector("header");

if (!header) return;

let lastScrollY = window.scrollY;
let ticking = false;

const SCROLL_THRESHOLD = 24;

function onScroll() {

    const currentY = window.scrollY;

    header.classList.toggle(
        "header-scrolled",
        currentY > SCROLL_THRESHOLD
    );

    if (currentY > lastScrollY && currentY > header.offsetHeight * 2) {

        header.classList.add("header-hidden");

    } else {

        header.classList.remove("header-hidden");

    }

    lastScrollY = currentY;
    ticking = false;

}

window.addEventListener("scroll", () => {

    if (!ticking) {

        requestAnimationFrame(onScroll);
        ticking = true;

    }

});

})();
