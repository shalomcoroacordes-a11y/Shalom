const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("admin.html", "utf8");
const css = fs.readFileSync("admin-pro.css", "utf8");
const sections = ["admin-search-fix.css", "admin-catalog-check.css", "admin-home-section.css", "admin-mobile-polish.css"];
assert.match(html, /href="admin-pro\.css\?v=4"/);
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

const movedSections = ["Admin layout: shared forms, navigation and responsive controls", "Admin backup and trash", "Admin backup importer"];
for (const section of movedSections) {
  const index = css.indexOf("/* ===== " + section + " ===== */");
  assert.ok(index > previous, "Preserve the cascade order of the extracted styles: " + section);
  previous = index;
}
for (const selector of [".admin-form-collapsible>summary", ".admin-trash-item", ".jhd-import-status[data-error=\"true\"]"]) {
  assert.ok(css.includes(selector), "Stylesheet owns " + selector);
}
assert.equal((css.match(/\.admin-filter-row\{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;grid-template-columns:none\}/g)||[]).length,1,"Only one flex layout declaration remains");
for(const file of ["admin-form-layout.js","admin-backup.js","admin-backup-import.js"]) {
  const js = fs.readFileSync(file,"utf8");
  assert.doesNotMatch(js,/createElement\(["']style["']\)|style\.textContent|function addStyle\(/, file + " must not inject presentation CSS");
}
console.log("Admin layout and backup styles have a single static owner.");

const picker = fs.readFileSync("admin-song-category-picker.js","utf8");
assert.doesNotMatch(picker,/createElement\(["']style["']\)|css\.textContent/);
const pickerMarker = "/* ===== Admin song category picker ===== */";
assert.ok(css.indexOf(pickerMarker)>previous,"Category picker CSS follows existing consolidated rules");
const pickerCss=css.split(pickerMarker+"\n")[1].trimEnd();
let hash=2166136261;
for(const c of pickerCss)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
assert.equal(hash,1309125158,"Category picker styles retain the exact original declarations and order");
assert.match(html,/admin-song-category-picker\.js\?v=7/);
console.log("Category picker static CSS preserves original declarations.");
