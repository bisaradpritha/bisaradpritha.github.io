const cards = document.querySelectorAll(".journey-card");
const dots = document.querySelectorAll(".dot");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

let currentCard = 0;

function showCard(index) {

    // Hide all cards
    cards.forEach(card => card.classList.remove("active"));

    // Reset all dots
    dots.forEach(dot => dot.classList.remove("active"));

    // Show selected card
    cards[index].classList.add("active");
    dots[index].classList.add("active");

    currentCard = index;
}

function nextCard() {

    let next = currentCard + 1;

    if (next >= cards.length) next = 0;

    showCard(next);

}

function previousCard() {

    let prev = currentCard - 1;

    if (prev < 0) prev = cards.length - 1;

    showCard(prev);

}


// Click dots
dots.forEach((dot, index) => {

    dot.addEventListener("click", () => {

        showCard(index);

    });

});

// -------------------------------------
// Button navigation
// -------------------------------------
nextBtn.addEventListener("click", nextCard);

prevBtn.addEventListener("click", previousCard);

// -------------------------------------
// Keyboard navigation
// -------------------------------------
document.addEventListener("keydown", (e) => {

    if (e.key === "ArrowRight")
        nextCard();

    if (e.key === "ArrowLeft")
        previousCard();

});

// Initialize
showCard(0);

// =====================================================
// Credentials Accordion
// Each item's header toggles its own panel; opening one
// closes whichever else is open.
// =====================================================

const accordionItems = document.querySelectorAll(".accordion-item");
const expandAllBtn = document.getElementById("expandAllBtn");

function setAllExpanded(expanded) {

    accordionItems.forEach((item) => {

        const header = item.querySelector(".accordion-header");

        item.classList.toggle("active", expanded);
        header.setAttribute("aria-expanded", expanded ? "true" : "false");

    });

    expandAllBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    expandAllBtn.textContent = expanded ? "[ Collapse All ]" : "[ Expand All ]";

}

accordionItems.forEach((item) => {

    const header = item.querySelector(".accordion-header");

    header.addEventListener("click", () => {

        const allExpanded =
            expandAllBtn.getAttribute("aria-expanded") === "true";

        const wasActive = item.classList.contains("active");

        accordionItems.forEach((i) => {

            i.classList.remove("active");
            i.querySelector(".accordion-header").setAttribute("aria-expanded", "false");

        });

        // Coming from "all expanded" mode, every item reads as
        // already-active — a click there means "narrow down to
        // just this one," not "toggle it closed" the way a
        // click does in normal single-open mode.
        const shouldOpen = allExpanded || !wasActive;

        if (shouldOpen) {

            item.classList.add("active");
            header.setAttribute("aria-expanded", "true");

        }

        // A manual single-item click always breaks "all
        // expanded" mode, even if every item happened to be
        // open at the time — keep the button's label honest.
        expandAllBtn.setAttribute("aria-expanded", "false");
        expandAllBtn.textContent = "[ Expand All ]";

    });

});

expandAllBtn.addEventListener("click", () => {

    const currentlyAllExpanded =
        expandAllBtn.getAttribute("aria-expanded") === "true";

    setAllExpanded(!currentlyAllExpanded);

});
