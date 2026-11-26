const assert = require("node:assert/strict");
const fs = require("node:fs");
const pages = [
  [
    "artista.html",
    "artist-profile-bundle.css",
    [
      "site-shell.css",
      "public-cards.css",
      "artist-layout.css",
      "artist-discovery.css",
      "public-accessibility.css"
    ]
  ],
  [
    "donaciones.html",
    "donations-page-bundle.css",
    [
      "site-shell.css",
      "public-accessibility.css",
      "donation-page.css"
    ]
  ]
];
for (const [page, bundle, sources] of pages) {
  const html = fs.readFileSync(page, "utf8");
  const actual = fs.readFileSync(bundle, "utf8");
  const expected = sources.map((name, i) => (i ? "\n\n/* ===== " + name + " (original order) ===== */\n" : "") + fs.readFileSync(name, "utf8")).join("");
  assert.equal(actual, expected, page + ": all original CSS rules must be preserved in the original order");
  assert.equal((html.match(new RegExp(bundle.replaceAll(".", "\\.") + "\\?v=1", "g")) || []).length, 1, page + ": exactly one bundle");
  for (const source of sources) assert.equal(html.includes('href="' + source + '?v='), false, page + ": no duplicate stylesheet " + source);
  assert.ok(html.indexOf('href="style.css?v=5"') < html.indexOf('href="' + bundle + '?v=1"'), page + ": preserve base CSS order");
  assert.ok(actual.startsWith('@import url("mobile-experience.css?v=1");'), page + ": @import must remain at stylesheet start");
  assert.equal((actual.match(/@import/g) || []).length, 1, page + ": no @import may be moved into middle of CSS");
}
const common = fs.readFileSync("collection-reader-bundle.css", "utf8");
const sources = ["site-shell.css", "public-accessibility.css", "song-chords.css", "song-reader-cues.css"];
assert.equal(common, sources.map((name,i) => (i ? "\n\n/* ===== " + name + " (original order) ===== */\n" : "") + fs.readFileSync(name,"utf8")).join(""));
assert.ok(common.startsWith('@import url("mobile-experience.css?v=1");'));
assert.equal((common.match(/@import/g)||[]).length,1);
for(const [page,specific] of [["repertorios.html","repertoires.css"],["popurris.html","medleys.css"]]){
 const html=fs.readFileSync(page,"utf8");
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(styles,["style.css?v=5","collection-reader-bundle.css?v=2",specific+"?v=1","studio-collection-web.css?v=1"]);
 assert.doesNotMatch(fs.readFileSync(specific,"utf8"),/@import/);
}
for(const name of ["repertoires-page-bundle.css","medleys-page-bundle.css"]){
 assert.equal(fs.existsSync(name),false);
 assert.ok(!fs.readFileSync("offline-sw.js","utf8").includes(name));
}
console.log("Public-page CSS: exact source bytes, shared collection reader, original cascade and valid imports.");
