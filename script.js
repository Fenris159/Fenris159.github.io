const canvas = document.querySelector("#stars");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let stars = [];
let pointer = { x: 0, y: 0, active: false };
let animationFrame = 0;

function resize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const starCount = Math.min(180, Math.max(72, Math.floor((width * height) / 9500)));
  stars = Array.from({ length: starCount }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: 0.35 + Math.random() * 1.45,
    drift: 0.12 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    hue: index % 7 === 0 ? "amber" : index % 5 === 0 ? "cyan" : "green",
  }));
}

function colorFor(star, alpha) {
  if (star.hue === "amber") {
    return `rgba(255, 206, 115, ${alpha})`;
  }
  if (star.hue === "cyan") {
    return `rgba(92, 230, 223, ${alpha})`;
  }
  return `rgba(209, 255, 184, ${alpha})`;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#060706";
  ctx.fillRect(0, 0, width, height);

  const time = performance.now() * 0.001;

  for (const star of stars) {
    if (!reducedMotion.matches) {
      star.y += star.drift * star.z;
      star.x += Math.sin(time + star.phase) * 0.06 * star.z;
    }

    if (star.y > height + 8) {
      star.y = -8;
      star.x = Math.random() * width;
    }

    let pull = 0;
    if (pointer.active && !reducedMotion.matches) {
      const dx = pointer.x - star.x;
      const dy = pointer.y - star.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      pull = Math.max(0, 1 - distance / 180);
      star.x -= dx * pull * 0.002;
      star.y -= dy * pull * 0.002;
    }

    const radius = star.z * (1 + pull * 1.8);
    const alpha = 0.32 + star.z * 0.26 + pull * 0.28;
    ctx.beginPath();
    ctx.fillStyle = colorFor(star, alpha);
    ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (pull > 0.4) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(136, 255, 143, ${pull * 0.16})`;
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(pointer.x, pointer.y);
      ctx.stroke();
    }
  }

  animationFrame = window.requestAnimationFrame(draw);
}

function start() {
  window.cancelAnimationFrame(animationFrame);
  draw();
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});
reducedMotion.addEventListener("change", start);

resize();
start();
