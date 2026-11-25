const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("admin.html", "utf8");
const css = fs.readFileSync("admin-pro.css", "utf8");
const sections = ["admin-search-fix.css", "admin-catalog-check.css", "admin-home-section.css", "admin-mobile-polish.css"];
assert.match(html, /href="admin-pro\.css\?v=5"/);
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
const readSection = (marker) => css.split(marker+"\n")[1].split(/\n\s*\/\* ===== /)[0].trimEnd();
const pickerCss=readSection(pickerMarker);
let hash=2166136261;
for(const c of pickerCss)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
assert.equal(hash,1309125158,"Category picker styles retain the exact original declarations and order");
assert.match(html,/admin-song-category-picker\.js\?v=7/);
console.log("Category picker static CSS preserves original declarations.");

const extractedStyles=[
  {
    "file": "admin-category-browser-v2.js",
    "marker": "/* ===== Admin category browser ===== */",
    "hash": 2263716550,
    "version": 2
  },
  {
    "file": "admin-main-artist-search.js",
    "marker": "/* ===== Admin main artist search ===== */",
    "hash": 1903675381,
    "version": 4
  },
  {
    "file": "admin-artist-profile-storage.js",
    "marker": "/* ===== Admin artist profile storage ===== */",
    "hash": 2092721125,
    "version": 2
  }
];
for(const item of extractedStyles){
 const source=fs.readFileSync(item.file,"utf8");
 assert.doesNotMatch(source,/createElement\(["']style["']\)|style\.textContent/);
 assert.ok(html.includes(item.file+"?v="+item.version));
 let checksum=2166136261;
 for(const c of readSection(item.marker))checksum=Math.imul(checksum^c.charCodeAt(0),16777619)>>>0;
 assert.equal(checksum,item.hash,item.file+" retains the original CSS");
}
assert.ok(css.indexOf(extractedStyles[0].marker)<css.indexOf(pickerMarker));
console.log("Three additional Admin components use their exact original static CSS.");
