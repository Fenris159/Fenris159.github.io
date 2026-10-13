const http = require("node:http");
const path = require("node:path");
const { readFile } = require("node:fs/promises");
const { chromium } = require("playwright");

async function startSite() {
  const root = path.resolve(__dirname, "..");
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
      if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
      const content = await readFile(file);
      const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[path.extname(file)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type, "Cache-Control": "max-age=600" });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  return {
    browser,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await browser.close();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

module.exports = { startSite };
