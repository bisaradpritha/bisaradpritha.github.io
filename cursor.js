(() => {

const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isTouch = window.matchMedia("(hover: none)").matches;

// Skip entirely for reduced-motion users, and for touch
// devices where there's no real "cursor" to trail and the
// effect would just burn battery for nothing.
if (prefersReducedMotion || isTouch) return;

const trail = document.getElementById("cursor-trail");
const glow = document.getElementById("cursor-glow");

const colors = ["#33ff33", "#33ff33", "#33ff33", "#33ff33", "#33ff33"];

let mouseX = 0;
let mouseY = 0;
let hasMoved = false;

document.addEventListener("mousemove", (e) => {

    mouseX = e.clientX;
    mouseY = e.clientY;
    hasMoved = true;

    // #cursor-glow has full CSS styling (soft blurred blob,
    // centered via transform:translate(-50%,-50%)) but was
    // never actually being positioned — it sat frozen in the
    // top-left corner. left/top here is all it was missing.
    if (glow) {

        glow.style.left = mouseX + "px";
        glow.style.top = mouseY + "px";

    }

});

function createParticle() {

    const p = document.createElement("div");

    p.className = "cursor-particle";

    const size = 2 + Math.random() * 6;

    p.style.width = size + "px";
    p.style.height = size + "px";

    p.style.left = mouseX + "px";
    p.style.top = mouseY + "px";

    p.style.opacity = .15 + Math.random() * .3;

    p.style.background =
        colors[Math.floor(Math.random() * colors.length)];

    p.style.boxShadow =
        `0 0 ${size * 3}px ${p.style.background}`;

    p.style.setProperty("--dx",
        (Math.random() * 18 - 9) + "px");

    p.style.setProperty("--dy",
        (Math.random() * 18 - 9) + "px");

    trail.appendChild(p);

    setTimeout(() => p.remove(), 800);

}

function animateCursor() {

    // Only spawn particles once the mouse has actually
    // moved at least once, and skip frames where it's
    // been stationary instead of emitting continuously.
    if (hasMoved) {

        createParticle();
        hasMoved = false;

    }

    requestAnimationFrame(animateCursor);

}

requestAnimationFrame(animateCursor);

})();
