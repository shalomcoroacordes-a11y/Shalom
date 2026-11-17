const assert = require("node:assert/strict");
const fs = require("node:fs");
const names = ["site-shell.css", "public-cards.css", "public-accessibility.css", "public-info-pages.css"];
const expected = names.map((name, i) => (i ? "\n\n/* ===== " + name + " (original order) ===== */\n" : "") + fs.readFileSync(name, "utf8")).join("");
const actual = fs.readFileSync("public-info-bundle.css", "utf8");
assert.equal(actual, expected, "Informational styles must remain byte-identical in their original order");
assert.ok(actual.startsWith('@import url("mobile-experience.css?v=1");'));
assert.equal((actual.match(/@import/g) || []).length, 1);
for (const page of ["acerca.html", "contacto.html", "solicitar-canto.html"]) {
  const html = fs.readFileSync(page, "utf8");
  assert.equal((html.match(/href="public-info-bundle\.css\?v=1"/g) || []).length, 1, page);
  assert.ok(html.indexOf('href="style.css?v=5"') < html.indexOf('href="public-info-bundle.css?v=1"'), page);
  for (const name of names) assert.equal(html.includes('href="' + name + '?v='), false, page + ": no duplicate stylesheet " + name);
}
console.log("Informational pages: exact CSS, correct import order, one shared bundle.");
