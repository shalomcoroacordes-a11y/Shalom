const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const removed = ["admin-category-tree.js", "admin-extra.js", "admin.js", "admin-visual-polish.js", "admin-manage.js", "admin-tools.js"];
const pages = fs.readdirSync(".").filter(name => name.endsWith(".html"));
for (const name of removed) {
  assert.equal(fs.existsSync(name), false, name + " should not be shipped");
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1].split("?")[0]);
    assert.equal(scripts.includes(name), false, page + " references retired " + name);
  }
}
const admin = fs.readFileSync("admin.html", "utf8");
for (const name of ["admin-pro.js", "admin-category-browser-v2.js", "admin-song-category-picker.js"]) {
  assert.ok(admin.includes('src="' + name + '?'), "active admin dependency " + name + " must remain");
}
console.log("Legacy admin cleanup: six retired modules absent; active admin chain intact.");
