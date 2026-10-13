const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const cacheKey = "fenris159:top-repos:v1";
const repo = (name, stars, forks, pushed = "2026-01-01T00:00:00Z") => ({
  name,
  html_url: `https://github.com/Fenris159/${name}`,
  description: "A useful repository <script>alert('unsafe')</script>",
  language: "JavaScript",
  stargazers_count: stars,
  forks_count: forks,
  pushed_at: pushed,
});
const repos = [
  repo("older", 3, 1),
  repo("newer", 3, 1, "2026-02-01T00:00:00Z"),
  repo("more-forks", 3, 2),
  repo("most-stars", 4, 0),
  repo("fifth", 1, 0),
  repo("sixth", 0, 0),
  repo("RavenColonialWeb", 100, 100),
  repo("Fenris159.github.io", 100, 100),
];
let server;
let browser;
let baseUrl;

before(async () => {
  server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = path.join(root, pathname === "/" ? "index.html" : pathname);
      if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
      const content = await readFile(file);
      const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".webp": "image/webp" }[path.extname(file)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("initial desktop and mobile renders use no blocking stylesheet or GitHub request", async () => {
  for (const width of [1365, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const apiRequests = [];
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://api.github.com/**", async (route) => {
      apiRequests.push(route.request().url());
      await route.fulfill({ json: repos });
    });
    await page.goto(baseUrl);
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => ({
      blocking: performance.getEntriesByType("resource").filter((entry) => entry.renderBlockingStatus === "blocking").map((entry) => entry.name),
      overflow: document.documentElement.scrollWidth > innerWidth,
      profileLoaded: document.querySelector(".profile-image").naturalWidth > 0,
      profileSource: document.querySelector(".profile-image").currentSrc,
    }));
    assert.deepEqual(metrics.blocking, [], `render-blocking resources at ${width}px`);
    assert.deepEqual(apiRequests, [], `startup API requests at ${width}px`);
    assert.equal(metrics.overflow, false, `horizontal overflow at ${width}px`);
    assert.equal(metrics.profileLoaded, true);
    assert.match(metrics.profileSource, /\/assets\/profile\.webp$/);
    assert.deepEqual(errors, []);
    assert.equal(await page.locator("#repo-tracker .repo-row").count(), 5);
    await page.close();
  }
});

test("repo refresh starts near the section, preserves ranking and escaping, and reuses fresh cache", async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  let requests = 0;
  await context.route("https://api.github.com/**", async (route) => {
    requests += 1;
    await route.fulfill({ json: repos });
  });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.locator("#repos").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#repo-tracker h3").textContent === "most-stars");
  assert.equal(requests, 1);
  assert.deepEqual(await page.locator("#repo-tracker h3").allTextContents(), ["most-stars", "more-forks", "newer", "older", "fifth"]);
  assert.equal(await page.locator("#repo-tracker script").count(), 0);
  assert.match(await page.locator("#repo-tracker p").first().textContent(), /<script>/);
  await page.reload();
  await page.locator("#repos").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#repo-tracker h3").textContent === "most-stars");
  await page.waitForTimeout(150);
  assert.equal(requests, 1, "fresh cached repos must not refetch");
  await context.close();
});

test("a stale cache refreshes and an unavailable cache does not break the static fallback", async () => {
  const context = await browser.newContext();
  await context.addInitScript(({ key, cached }) => {
    localStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now() - 60 * 60 * 1000, repos: cached }));
  }, { key: cacheKey, cached: [repo("cached", 0, 0)] });
  await context.route("https://api.github.com/**", (route) => route.fulfill({ json: repos }));
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.locator("#repos").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#repo-tracker h3").textContent === "most-stars");
  await context.close();

  for (const response of [{ status: 403, json: { message: "rate limited" } }, { json: [] }]) {
    const offline = await browser.newContext();
    await offline.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    });
    await offline.route("https://api.github.com/**", (route) => route.fulfill(response));
    const fallback = await offline.newPage();
    await fallback.goto(baseUrl);
    const original = await fallback.locator("#repo-tracker").innerHTML();
    await fallback.locator("#repos").scrollIntoViewIfNeeded();
    await fallback.waitForFunction(() => document.querySelector("#repo-tracker").dataset.state === "fallback");
    assert.equal(await fallback.locator("#repo-tracker").innerHTML(), original);
    await offline.close();
  }
});

test("the portfolio stays usable without JavaScript", async () => {
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await page.goto(baseUrl);
  assert.equal(await page.locator("#repo-tracker .repo-row").count(), 5);
  assert.equal(await page.locator(".hero-actions a").first().getAttribute("href"), "#projects");
  assert.equal(await page.locator(".profile-image").evaluate((image) => image.naturalWidth), 460);
  assert.equal(await page.locator("h1").evaluate((title) => getComputedStyle(title).color), "rgb(255, 255, 255)");
  await page.close();
});

test("malformed caches and blocked storage do not prevent a live refresh", async () => {
  const invalidCaches = [
    "{invalid JSON",
    JSON.stringify({ fetchedAt: Date.now(), repos: [{ ...repo("unsafe", 0, 0), html_url: "javascript:alert('unsafe')" }] }),
    JSON.stringify({ fetchedAt: Date.now(), repos: [{ ...repo("invalid-date", 0, 0), pushed_at: "not a date" }] }),
  ];
  for (const cached of [...invalidCaches, null]) {
    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
      if (value === null) {
        Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
      } else {
        localStorage.setItem(key, value);
      }
    }, { key: cacheKey, value: cached });
    await context.route("https://api.github.com/**", (route) => route.fulfill({ json: repos }));
    const page = await context.newPage();
    await page.goto(baseUrl);
    await page.locator("#repos").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("#repo-tracker h3").textContent === "most-stars");
    assert.equal(await page.locator('#repo-tracker a[href^="javascript:"]').count(), 0);
    await context.close();
  }
});

test("starfield handles viewport changes and stops drawing for reduced motion and hidden pages", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce", deviceScaleFactor: 2, viewport: { width: 800, height: 600 } });
  await page.addInitScript(() => {
    window.drawCount = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      window.drawCount += 1;
      return clear.apply(this, args);
    };
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => window.drawCount > 0);
  const count = await page.evaluate(() => window.drawCount);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.drawCount), count, "reduced motion must not redraw continuously");
  await page.setViewportSize({ width: 640, height: 480 });
  await page.waitForFunction(() => document.querySelector("#stars").width === 1280 && document.querySelector("#stars").height === 960);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction((previous) => window.drawCount > previous + 2, count);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hiddenCount = await page.evaluate(() => window.drawCount);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.drawCount), hiddenCount, "hidden pages must not redraw");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction((previous) => window.drawCount > previous, hiddenCount);
  await page.close();
});
