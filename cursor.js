const trail = document.getElementById("cursor-trail");

const colors = [
    "#bb5579",
    "#bb5579",
    "#bb5579",
    "#bb5579",
    "#bb5579"
];

let mouseX = 0;
let mouseY = 0;

document.addEventListener("mousemove",(e)=>{

    mouseX=e.clientX;
    mouseY=e.clientY;

});

function createParticle(){

    const p=document.createElement("div");

    p.className="cursor-particle";

    const size=2+Math.random()*6;

    p.style.width=size+"px";
    p.style.height=size+"px";

    p.style.left=mouseX+"px";
    p.style.top=mouseY+"px";

    p.style.opacity=.15+Math.random()*.3;

    p.style.background=
        colors[Math.floor(Math.random()*colors.length)];

    p.style.boxShadow=
        `0 0 ${size*3}px ${p.style.background}`;

    p.style.setProperty("--dx",
        (Math.random()*18-9)+"px");

    p.style.setProperty("--dy",
        (Math.random()*18-9)+"px");

    trail.appendChild(p);

    setTimeout(()=>{

        p.remove();

    },800);

}

function animate(){

    createParticle();

    requestAnimationFrame(animate);

}

animate();
