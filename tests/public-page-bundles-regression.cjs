const assert = require("node:assert/strict");
const fs = require("node:fs");
const pages = [
  [
    "repertorios.html",
    "repertoires-page-bundle.css",
    [
      "site-shell.css",
      "public-accessibility.css",
      "song-chords.css",
      "repertoires.css"
    ]
  ],
  [
    "popurris.html",
    "medleys-page-bundle.css",
    [
      "site-shell.css",
      "public-accessibility.css",
      "song-chords.css",
      "medleys.css"
    ]
  ],
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
  const version = page === "artista.html" ? "2" : "1";
  const actual = fs.readFileSync(bundle, "utf8");
  const expected = sources.map((name, i) => (i ? "\n\n/* ===== " + name + " (original order) ===== */\n" : "") + fs.readFileSync(name, "utf8")).join("");
  assert.equal(actual, expected, page + ": all original CSS rules must be preserved in the original order");
  assert.equal((html.match(new RegExp(bundle.replaceAll(".", "\\.") + "\\?v=" + version, "g")) || []).length, 1, page + ": exactly one bundle");
  for (const source of sources) assert.equal(html.includes('href="' + source + '?v='), false, page + ": no duplicate stylesheet " + source);
  assert.ok(html.indexOf('href="style.css?v=5"') < html.indexOf('href="' + bundle + '?v=' + version + '"'), page + ": preserve base CSS order");
  assert.ok(actual.startsWith('@import url("mobile-experience.css?v=1");'), page + ": @import must remain at stylesheet start");
  assert.equal((actual.match(/@import/g) || []).length, 1, page + ": no @import may be moved into middle of CSS");
}
console.log("Four public-page bundles match the original CSS byte-for-byte, in order, with valid imports.");
