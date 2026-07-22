const cards = document.querySelectorAll(".journey-card");
const dots = document.querySelectorAll(".dot");

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

// Click dots
dots.forEach((dot, index) => {

    dot.addEventListener("click", () => {

        showCard(index);

    });

});

// Arrow keys
document.addEventListener("keydown", (e) => {

    if (e.key === "ArrowRight") {

        let next = currentCard + 1;

        if (next >= cards.length) next = 0;

        showCard(next);

    }

    if (e.key === "ArrowLeft") {

        let prev = currentCard - 1;

        if (prev < 0) prev = cards.length - 1;

        showCard(prev);

    }

});

// Initialize
showCard(0);
