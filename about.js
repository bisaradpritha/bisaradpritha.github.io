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
