(() => {

// =====================================
// Configuration
// =====================================

const NODE_COUNT = 120;
const CONNECTIONS_PER_NODE = 4;

const NODE_COLOR = "#33ff33";
const EDGE_COLOR = "rgba(51,255,51,0.28)";

const DRIFT_RADIUS = 12;
const DRIFT_MIN_TIME = 3000;
const DRIFT_MAX_TIME = 6000;

const mouse = {
    x: -1000,
    y: -1000,
    active: false
};

const REPULSE_RADIUS = 220;
const REPULSE_STRENGTH = 3;
const NETWORK_RADIUS_FACTOR = 0.38;

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
        
        // Offset params
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.vx = 0;
        this.vy = 0;

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

    const dx = a.homeX - b.homeX;
    const dy = a.homeY - b.homeY;

    return Math.hypot(dx, dy);

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

    for (let i = 0; i < NODE_COUNT; i++) {

        const radius = randomRadius();
    
        const centerX = width / 2;
        const centerY = height / 2;
        
        const networkRadius =
            Math.min(width, height) *
            NETWORK_RADIUS_FACTOR;
        
        const theta =
            Math.random() * Math.PI * 2;
        
        // 0.5 exponent = uniform circular cloud
        const r =
            Math.sqrt(Math.random()) *
            networkRadius;
        
        const x =
            centerX +
            r * Math.cos(theta);
        
        const y =
            centerY +
            r * Math.sin(theta);

        let valid = true;

        for (const other of nodes) {
        
            const minSpacing =
                radius + other.baseRadius + 6 + Math.random() * 4;
        
            const dx = x - other.homeX;
            const dy = y - other.homeY;
        
            if (Math.hypot(dx, dy) < minSpacing) {
        
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
                x,
                y,
                radius
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

    const centerX = width / 2;
    const centerY = height / 2;
    
    const networkRadius =
        Math.min(width, height) *
        NETWORK_RADIUS_FACTOR;
    
    // Candidate destination
    let tx =
        node.homeX +
        (Math.random() * 2 - 1) * DRIFT_RADIUS;
    
    let ty =
        node.homeY +
        (Math.random() * 2 - 1) * DRIFT_RADIUS;
    
    // Distance from center
    const dx = tx - centerX;
    const dy = ty - centerY;
    
    const d = Math.hypot(dx, dy);
    
    // If outside the circle, project back onto the edge
    if (d > networkRadius) {
    
        tx =
            centerX +
            dx / d * networkRadius;
    
        ty =
            centerY +
            dy / d * networkRadius;
    
    }
    
    node.targetX = tx;
    node.targetY = ty;

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
            0.1,
            0.5 - length / 800
        );

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

    ctx.fillStyle = "#fa7420";

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

// Picks up the same body[data-theme="retro"] attribute
// cursor.js checks — pages that have been converted to the
// retro theme get a green network; everything else keeps
// the site's normal amber.
const isRetro = document.body.dataset.theme === "retro";

const AMBIENT_NODE_COLOR = isRetro ? "#33ff33" : "#ffcb74";
const AMBIENT_EDGE_BASE_ALPHA = 0.16;
const AMBIENT_EDGE_RGB = isRetro ? "51,255,51" : "255,204,116";
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
