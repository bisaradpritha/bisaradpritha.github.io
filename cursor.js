const trail = document.getElementById("cursor-trail");

let lastTime = 0;

document.addEventListener("mousemove", (e) => {

    const now = Date.now();

    if (now - lastTime < 20) return;

    lastTime = now;

    const dot = document.createElement("div");

    dot.className = "cursor-dot";

    // Random size
    const size = 3 + Math.random() * 4;

    dot.style.width = size + "px";
    dot.style.height = size + "px";

    // Random opacity
    dot.style.opacity = 0.15 + Math.random() * 0.25;

    // Random drift direction
    dot.style.setProperty("--dx", (Math.random() * 12 - 6) + "px");
    dot.style.setProperty("--dy", (Math.random() * 12 - 6) + "px");

    // Mostly pink with occasional cyan spark
    const colors = [
        "#bb5579",
        "#bb5579",
        "#bb5579",
        "#bb5579",
        "#47d8ff"
    ];

    dot.style.background =
        colors[Math.floor(Math.random() * colors.length)];

    // Position
    dot.style.left = e.clientX + "px";
    dot.style.top = e.clientY + "px";

    trail.appendChild(dot);

    setTimeout(() => {
        dot.remove();
    }, 600);

});
