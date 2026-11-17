const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("admin.html", "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1].split("?")[0]);
const required = [
  "Supabase.js", "admin-auth-controller.js", "song-chords.js", "medley-core.js",
  "admin-medleys.js", "repertoires-core.js", "admin-repertoires.js", "admin-pro.js",
  "admin-donations-plus.js", "admin-messages.js", "admin-request-page.js",
  "admin-main-artist-search.js", "admin-artist-profile-storage.js",
  "admin-category-browser-v2.js", "admin-song-category-picker.js",
  "admin-backup.js", "admin-backup-import.js"
];
for (const name of required) {
  assert.equal(scripts.filter(s => s === name).length, 1, name + " must load exactly once");
  assert.ok(fs.existsSync(name), name + " must exist");
}
for (const [first, second] of [
  ["medley-core.js", "admin-medleys.js"],
  ["repertoires-core.js", "admin-repertoires.js"],
  ["admin-auth-controller.js", "admin-pro.js"],
  ["admin-pro.js", "admin-category-browser-v2.js"],
  ["admin-category-browser-v2.js", "admin-song-category-picker.js"]
]) assert.ok(scripts.indexOf(first) < scripts.indexOf(second), first + " must precede " + second);
for (const name of scripts) {
  if (/^(?:https?:)?\/\//.test(name)) continue;
  assert.ok(fs.existsSync(name), "Missing admin script: " + name);
}
for (const name of ["admin-medleys.js", "admin-repertoires.js", "admin-category-browser-v2.js", "admin-song-category-picker.js"]) {
  const src = fs.readFileSync(name, "utf8");
  assert.ok(src.length > 1000, name + " is unexpectedly empty");
}
assert.match(html, /id="adminLoginForm"/);
assert.match(html, /id="adminWorkspace"/);
console.log("ADM-01..10: admin dependency contract verified (static only, no Supabase writes).");
