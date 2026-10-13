const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { startSite } = require("./test-site.cjs");

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

test("delayed screenshot JavaScript does not shift the mobile page or disable its menu", async () => {
  const page = await site.browser.newPage({ viewport: { width: 390, height: 844 } });
  let releaseScript;
  const released = new Promise(resolve => { releaseScript = resolve; });
  await page.route("**/site.js*", async route => { await released; await route.continue(); });
  await page.goto(`${site.baseUrl}/srvsurvey/`, { waitUntil: "commit" });
  await page.waitForFunction(() => performance.getEntriesByType("paint").length > 0);
  const before = await page.locator("#main").evaluate(main => main.getBoundingClientRect().top);
  releaseScript();
  await page.waitForLoadState("load");
  await page.waitForTimeout(100);
  const after = await page.locator("#main").evaluate(main => main.getBoundingClientRect().top);
  assert.equal(after, before, "main content moves when deferred JavaScript initializes navigation");
  await page.getByRole("button", { name: /Menu/ }).click();
  assert.equal(await page.locator(".nav-toggle").getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator("#navigation").isVisible(), true);
  await page.locator('#navigation a[href="#features"]').click();
  assert.equal(await page.locator("#navigation").isVisible(), false);
  await page.close();
});

test("mobile and desktop startup images stay below 400 KB and avoid full-size originals", async () => {
  for (const width of [320, 390, 410, 768, 1024, 1365, 1920]) {
    const viewport = { width, height: 900 };
    const page = await site.browser.newPage({ viewport, deviceScaleFactor: width <= 410 ? 1.75 : width === 1920 ? 2 : 1 });
    const imageResponses = [];
    const errors = [];
    page.on("response", response => {
      if (response.request().resourceType() === "image") imageResponses.push(response);
    });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${site.baseUrl}/srvsurvey/`);
    await page.waitForTimeout(150);
    const bytes = await Promise.all(imageResponses.map(async response => ({ url: response.url(), bytes: (await response.body()).length })));
    const total = bytes.reduce((sum, entry) => sum + entry.bytes, 0);
    assert.ok(total < 400000, `startup images at ${viewport.width}px total ${total} bytes`);
    assert.equal(bytes.some(entry => /\/(logo|overlay-editor|splat-align-border)\.png$/.test(entry.url)), false, "original PNGs must be fetched only on request");
    const metrics = await page.evaluate(() => ({
      blocking: performance.getEntriesByType("resource").filter(entry => entry.renderBlockingStatus === "blocking").map(entry => entry.name),
      overflow: document.documentElement.scrollWidth > innerWidth,
      heroReady: document.querySelector(".logo-beacon img").naturalWidth > 0,
    }));
    assert.deepEqual(metrics.blocking, []);
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.heroReady, true);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("responsive screenshots load while scrolling and retain original image links", async () => {
  for (const width of [390, 1365]) {
    const page = await site.browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(`${site.baseUrl}/srvsurvey/`);
    const screenshots = await page.locator("[data-lightbox]").all();
    assert.equal(screenshots.length, 8);
    for (const screenshot of screenshots) {
      await screenshot.scrollIntoViewIfNeeded();
      await screenshot.locator("img").evaluate(image => image.decode());
      const image = await screenshot.locator("img").evaluate(image => ({
        currentSrc: image.currentSrc,
        alt: image.alt,
        width: image.getBoundingClientRect().width,
        naturalWidth: image.naturalWidth,
      }));
      assert.match(image.currentSrc, /\.webp$/);
      assert.ok(image.alt.length > 0);
      assert.ok(image.naturalWidth >= image.width * 0.95, "preview is sharp at the displayed size");
      assert.match(await screenshot.getAttribute("href"), /\.png$/);
    }
    await page.close();
  }
});

test("screenshot dialog uses an optimized preview and provides the full-resolution original", async () => {
  const page = await site.browser.newPage({ viewport: { width: 1365, height: 900 }, reducedMotion: "reduce" });
  await page.goto(`${site.baseUrl}/srvsurvey/`);
  const link = page.locator(".wide-shot [data-lightbox]");
  const original = await link.getAttribute("href");
  await link.click();
  assert.equal(await page.locator("#image-viewer").isVisible(), true);
  await page.locator("#viewer-image").evaluate(image => image.decode());
  assert.match(await page.locator("#viewer-image").getAttribute("src"), /\.webp$/);
  assert.match(await page.locator("#viewer-original").getAttribute("href"), new RegExp(`${original.replaceAll(".", "\\.")}$`));
  assert.ok((await page.locator("#image-caption").textContent()).length > 0);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#image-viewer").isVisible(), false);
  await link.click();
  await page.getByRole("button", { name: "Close screenshot" }).click();
  assert.equal(await page.locator("#image-viewer").isVisible(), false);
  await page.close();
});

test("all shared headers work without JavaScript and while screenshot JavaScript is unavailable", async () => {
  for (const pathname of ["", "privacy.html", "terms.html"]) {
    const noJs = await site.browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJs.goto(`${site.baseUrl}/srvsurvey/${pathname}`);
    assert.equal(await noJs.locator("#navigation").isVisible(), true);
    assert.equal(await noJs.locator(".nav-toggle").isVisible(), false);
    await noJs.close();

    const blocked = await site.browser.newPage({ viewport: { width: 390, height: 844 } });
    await blocked.route("**/site.js*", route => route.abort());
    await blocked.goto(`${site.baseUrl}/srvsurvey/${pathname}`);
    await blocked.getByRole("button", { name: /Menu/ }).click();
    assert.equal(await blocked.locator("#navigation").isVisible(), true);
    await blocked.close();
  }
});
