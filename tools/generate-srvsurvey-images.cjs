// Keep the PNG originals for full-resolution links and social previews.
const path = require("node:path");
const sharp = require("sharp");

const directory = path.resolve(__dirname, "../srvsurvey/assets");
const variants = [
  ["logo", [36, 44, 72, 88, 132, 192, 224, 264, 320, 400, 528, 640]],
  ["overlay-editor", [400, 640, 672, 960, 1240, 1920, 2480]],
  ["powerplay-mining-search", [400, 640, 960, 1280]],
  ["surface-mining-search", [400, 640, 960, 1280]],
  ["splat-align-border", [240, 400, 640, 960, 1920]],
  ["splat-tracing", [240, 400, 640, 800]],
  ["splat-rig-layout", [240, 400, 640, 960]],
  ["commander-overview", [400, 640, 960, 1280]],
  ["application-themes", [400, 640, 960, 1280]],
];

(async () => {
  for (const [name, widths] of variants) {
    const sizes = [];
    for (const width of widths) {
      const { size } = await sharp(path.join(directory, `${name}.png`))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 85, smartSubsample: true, effort: 6 })
        .toFile(path.join(directory, `${name}-${width}.webp`));
      sizes.push(`${width}px: ${size} bytes`);
    }
    console.log(`${name}: ${sizes.join(", ")}`);
  }
  await sharp(path.join(directory, "logo.png"))
    .resize(32, 32)
    .png({ compressionLevel: 9, palette: true, colours: 128 })
    .toFile(path.join(directory, "favicon.png"));
})().catch(error => { console.error(error); process.exitCode = 1; });
