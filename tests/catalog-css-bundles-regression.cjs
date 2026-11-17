const fs = require("node:fs");
const assert = require("node:assert/strict");
const pages = [
  ["albumes.html", "albums-catalog-bundle.css", ["catalog-cards.css", "detalles.css", "catalogo.css"]],
  ["artistas.html", "artists-catalog-bundle.css", ["catalog-cards.css", "detalles.css"]]
];
for (const [page, bundle, names] of pages) {
  const html = fs.readFileSync(page, "utf8");
  const css = fs.readFileSync(bundle, "utf8");
  const expected = names.map((name, i) => (i ? "\n\n/* ===== " + name + " (original order) ===== */\n" : "") + fs.readFileSync(name, "utf8")).join("");
  assert.equal(css, expected, page + ": CSS must remain byte-identical in original order");
  assert.equal((html.match(new RegExp(bundle.replaceAll(".", "\\.") + "\\?v=2", "g")) || []).length, 1);
  for (const name of names) assert.equal(html.includes('href="' + name + '?v='), false, page + ": no duplicate " + name);
  const access = html.indexOf('href="public-accessibility.css?v=1"');
  const imports = html.indexOf('href="card-polish.css?v=3"');
  const catalog = html.indexOf('href="' + bundle + '?v=2"');
  assert.ok(access > -1 && imports > access && catalog > imports, page + ": keep @import position and cascade");
  assert.doesNotMatch(css, /@import/, page + ": no invalid middle-of-stylesheet imports");
}
assert.match(fs.readFileSync("categorias.html", "utf8"), /href="catalogo\.css\?v=2"/);
assert.equal(fs.existsSync("categories-catalog-bundle.css"), false);
console.log("Catalog CSS bundles: exact content, import semantics, original cascade order.");
