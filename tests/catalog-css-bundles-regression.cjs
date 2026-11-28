const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = name => fs.readFileSync(name, "utf8");
const marker = name => "\n\n/* ===== " + name + " (original order) ===== */\n";
const shared = "catalog-list-bundle.css";
const css = read(shared);
assert.equal(css, read("catalog-cards.css") + marker("detalles.css") + read("detalles.css"),
  "Shared catalog CSS must match the original rules byte-for-byte and in cascade order");
assert.doesNotMatch(css, /@import/);
assert.doesNotMatch(read("catalogo.css"), /@import/);
for (const [page, expected] of [
  ["artistas.html", [shared+"?v=1"]],
  ["albumes.html", [shared+"?v=1", "catalogo.css?v=2"]]
]) {
  const html = read(page);
  const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
  const index = styles.indexOf("card-polish.css?v=3");
  assert.ok(index > styles.indexOf("public-accessibility.css?v=1") && styles.includes("public-accessibility.css?v=1"));
  assert.deepEqual(styles.slice(index + 1), expected, page + ": preserve exact CSS order after base styles");
  for (const name of expected) assert.equal(styles.filter(s=>s===name).length,1);
  for (const name of ["catalog-cards.css","detalles.css","artists-catalog-bundle.css","albums-catalog-bundle.css"])
    assert.ok(!styles.some(s=>s.split("?")[0]===name), page + ": no redundant stylesheet "+name);
}
for (const name of ["artists-catalog-bundle.css","albums-catalog-bundle.css","categories-catalog-bundle.css"])
  assert.equal(fs.existsSync(name), false, "Do not restore redundant catalog bundles");
assert.match(read("categorias.html"), /href="catalogo\.css\?v=2"/);
assert.doesNotMatch(read("offline-sw.js"), /artists-catalog-bundle\.css|albums-catalog-bundle\.css/);
console.log("Shared catalog CSS: exact canonical bytes, original cascade, album-only rules, no duplicate bundles.");
