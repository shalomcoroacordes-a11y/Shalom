const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("admin.html", "utf8");
const css = fs.readFileSync("admin-pro.css", "utf8");
const sections = ["admin-search-fix.css", "admin-catalog-check.css", "admin-home-section.css", "admin-mobile-polish.css"];
assert.match(html, /href="admin-pro\.css\?v=2"/);
assert.equal((html.match(/href="admin-pro\.css/g) || []).length, 1);
let previous = -1;
for (const name of sections) {
  assert.equal(fs.existsSync(name), false, name + " must be consolidated");
  assert.doesNotMatch(html, new RegExp('href="' + name.replaceAll(".", "\\.") + ''));
  const marker = "/* ===== " + name + " (consolidado, orden original) ===== */";
  const position = css.indexOf(marker);
  assert.ok(position > previous, name + " must retain its original cascade order");
  previous = position;
}
assert.match(css, /\.admin-filter-row/);
assert.match(css, /\.jhd-audit-grid/);
assert.match(css, /\.jhd-home-section-note/);
assert.match(css, /\.admin-page,\.admin-shell/);
console.log("Admin CSS: consolidated stylesheet and original cascade order verified.");
