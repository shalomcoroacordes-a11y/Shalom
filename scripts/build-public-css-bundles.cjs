"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
// Explicit cascade order. Generated CSS remains checked in for static hosting.
const bundles=Object.freeze({
  "artist-profile-bundle.css": [
    "site-shell.css",
    "public-cards.css",
    "artist-layout.css",
    "artist-discovery.css",
    "public-accessibility.css"
  ],
  "donations-page-bundle.css": [
    "site-shell.css",
    "public-accessibility.css",
    "donation-page.css"
  ],
  "collection-reader-bundle.css": [
    "site-shell.css",
    "public-accessibility.css",
    "song-chords.css",
    "song-reader-cues.css"
  ],
  "catalog-list-bundle.css": [
    "catalog-cards.css",
    "detalles.css"
  ],
  "public-content-base-bundle.css": [
    "site-shell.css",
    "public-cards.css",
    "public-accessibility.css"
  ],
  "song-reader-bundle.css": [
    "detalles.css",
    "detail-visuals.css",
    "song-feedback.css",
    "song-reading-mode.css",
    "song-preferences.css",
    "song-reading-mobile-sheet.css",
    "song-capo-mobile-grid.css",
    "song-chords.css",
    "song-print.css",
    "song-reader-cues.css"
  ]
});
function generate(name,read){
 if(!Object.hasOwn(bundles,name))throw Error("Unknown public CSS bundle: "+name);
 return bundles[name].map((source,i)=>(i?"\n\n/* ===== "+source+" (original order) ===== */\n":"")+read(source)).join("");
}
function sync({read,write,check=true}){
 for(const name of Object.keys(bundles)){
  const expected=generate(name,read);
  if(check){
   if(read(name)!==expected)throw Error(name+" differs from canonical CSS. Run node scripts/build-public-css-bundles.cjs --write.");
  }else write(name,expected);
 }
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&!["--check","--write"].includes(args[0])))throw Error("Usage: node scripts/build-public-css-bundles.cjs [--check|--write]");
 const check=args[0]!=="--write";
 sync({read:name=>fs.readFileSync(path.join(root,name),"utf8"),write:(name,value)=>fs.writeFileSync(path.join(root,name),value),check});
 console.log("Public CSS bundles "+(check?"verified":"generated")+".");
}
module.exports={bundles,generate,sync};
