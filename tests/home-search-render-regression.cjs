const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "home.js"), "utf8");
// Exercise the actual artist template inside the source, not a copy of its implementation.
const match = source.match(/    const artistItem = \(artist\) => ([^\n]+);/);
assert.ok(match, "artist template exists");
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const initials = source.match(/  const initials = ([^\n]+);/);
assert.ok(initials);
const render = vm.runInNewContext("const initials = " + initials[1] + "; (artist) => " + match[1], {esc, JHD:{slugify:s=>s}, encodeURIComponent});
assert.match(render({name:"Coro Shalom",slug:"shalom"}), /home-search-artist-initials" aria-hidden="true">CS</);
assert.match(render({name:" ",slug:"empty"}), />A<\/span>/);
assert.match(render({name:"<Coro",slug:"safe"}), />&lt;<\/span>/);
assert.doesNotMatch(source,/improveArtistSearchResults|dataset\.artistInitials|MutationObserver/);
assert.equal(fs.existsSync(path.join(root,"home-access-control.js")),false);
console.log("Home search renders artist initials directly, without post-render mutation.");
