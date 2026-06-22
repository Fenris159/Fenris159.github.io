const canvas = document.querySelector("#stars");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const repoTracker = document.querySelector("#repo-tracker");
const excludedRepoNames = new Set(["ravencolonialweb", "fenris159.github.io"]);
const repoDescriptionOverrides = new Map([
  ["ravencolonial_edmc", "EDMC companion plugin for colonization tracking, overlay workflows, and update handling."],
]);

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
    return `rgba(255, 54, 95, ${alpha})`;
  }
  if (star.hue === "cyan") {
    return `rgba(118, 216, 255, ${alpha})`;
  }
  return `rgba(215, 243, 255, ${alpha})`;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050912";
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
      ctx.strokeStyle = `rgba(255, 37, 79, ${pull * 0.16})`;
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

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function repoDescription(repo) {
  const override = repoDescriptionOverrides.get(repo.name.toLowerCase());
  if (override) {
    return override;
  }

  return repo.description || "Public GitHub repository tracked from Fenris's profile.";
}

function renderRepos(repos) {
  if (!repoTracker || !repos.length) {
    return;
  }

  repoTracker.innerHTML = repos
    .map((repo, index) => {
      const rank = String(index + 1).padStart(2, "0");
      const language = repo.language || "Mixed";
      const stars = repo.stargazers_count === 1 ? "1 star" : `${repo.stargazers_count} stars`;
      const forks = repo.forks_count === 1 ? "1 fork" : `${repo.forks_count} forks`;
      const pushed = repo.pushed_at ? `Updated ${formatDate(repo.pushed_at)}` : "Recently updated";
      const safeUrl = escapeHtml(repo.html_url);
      const safeName = escapeHtml(repo.name);
      const safeDescription = escapeHtml(repoDescription(repo));

      return `
        <article class="repo-row">
          <div>
            <span class="repo-rank">${rank}</span>
            <h3><a href="${safeUrl}">${safeName}</a></h3>
            <p>${safeDescription}</p>
          </div>
          <div class="repo-meta">
            <span>${escapeHtml(language)}</span>
            <span>${stars}</span>
            <span>${forks}</span>
            <span>${pushed}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadTopRepos() {
  if (!repoTracker) {
    return;
  }

  try {
    const response = await fetch("https://api.github.com/users/Fenris159/repos?per_page=100&sort=updated", {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const repos = await response.json();
    const topRepos = repos
      .filter((repo) => !excludedRepoNames.has(repo.name.toLowerCase()))
      .sort((left, right) => {
        const stars = right.stargazers_count - left.stargazers_count;
        if (stars) return stars;

        const forks = right.forks_count - left.forks_count;
        if (forks) return forks;

        return new Date(right.pushed_at || 0) - new Date(left.pushed_at || 0);
      })
      .slice(0, 5);

    renderRepos(topRepos);
  } catch (error) {
    repoTracker.dataset.state = "fallback";
  }
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
loadTopRepos();
