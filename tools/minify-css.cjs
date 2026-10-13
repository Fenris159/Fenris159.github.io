const fs = require("node:fs");
const { minify } = require("csso");
const source = fs.readFileSync(process.argv[2], "utf8");
process.stdout.write(minify(source, { restructure: false }).css);
