const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const styles=fs.readFileSync("mobile/src/app-styles.js","utf8");
function section(name,next){
 const i=app.indexOf(" function "+name+"(");
 const j=app.indexOf(" function "+next+"(",i+1);
 assert.ok(i>=0&&j>i,"Reader region not found: "+name);
 return app.slice(i,j);
}
const rep=section("renderRepertoireDetail","renderMedleys");
const medley=section("renderMedleyDetail","renderAlbums");
const score=section("renderMultiReadingScore","renderRepertoireDetail");
const aligned=section("renderAlignedScoreRows","renderMultiReadingScore");
const grid=fs.readFileSync("mobile/src/aligned-score-ui.js","utf8");
const controls=section("renderMultiReadingControls","renderMultiReadingScore");
assert.doesNotMatch(rep,/h\(Card,|S\.lyricsArea|S\.listRow/,"No boxed lyrical cards in repertoire reader");
assert.doesNotMatch(medley,/h\(Card,|S\.lyricsArea|S\.listRow/,"No boxed lyrical cards in popurri reader");
assert.match(rep,/song\?\.lyrics/,"Repertoire reads saved original song lyrics");
assert.match(rep,/item\.moment/,"Mass moments must be distinguished");
assert.match(rep,/song\?\.tone\?transposeOne\(song\.tone,transpose\)/,"Repertoire song tone is transposed");
assert.match(rep,/renderMultiReadingScore\(song\?\.lyrics\|\|"Canto no disponible\.",transpose/);
assert.match(medley,/part\.lyrics\|\|original\?\.lyrics/,"Retain fragment-only lyrics when available");
assert.match(medley,/const delta=transpose\+/,"Keep original per-fragment pitch shifts");
assert.match(medley,/capoPosition/,"Retain capo instructions per fragment");
assert.match(medley,/otherCapos/,"Retain variant capo choices");
assert.match(medley,/tutorials\.map/,"Preserve YouTube/tutorial links");
assert.match(score,/parseSong\(lyrics,delta\)/,"Use the same parser as Cantos");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/row\.kind==="section"/,"Use saved section labels in all readers");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/song-section-label/,"Use green chorus and verse labels");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/#27c98b/,"Use SHALOM green for chords");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/Courier New/, "Use identical browser font for lyrics");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/overflow-x:auto/,"Support horizontal chord scrolling");
assert.match(grid,/h\(WebView,\{/,"Browser score remains selectable");
assert.match(score,/renderAlignedScoreRows\(parsed,fontOverride,keyPrefix\)/,"Misa, repertorios and popurrís share exact chord columns");
assert.match(aligned,/h\(AlignedScore,\{rows,fontSize,variant:keyPrefix\}\)/,"Shared grid component renders every song");
assert.match(controls,/S\.songControls/,"Use same tone and font controls as Cantos");
assert.match(controls,/setReaderFont/,"Text controls must be functional");
assert.match(controls,/setImmersive/,"Full screen can be entered and exited");
assert.match(app,/!immersiveActive&&isReader&&!settingsOpen\?h\(View,\{style:S\.songTopBar\}/,
 "Song, medley and repertoire readers share the same native header");
assert.match(app,/!immersiveActive&&detail&&!isReader\?h\(AppDetailHeader/,
 "Do not render a duplicate header above the multi-song readers");
assert.match(app,/!immersiveActive&&!settingsOpen&&!isReader\?h\(View/,
 "Hide regular navigation in ALL readers");
assert.match(app,/\{text:"Compartir",onPress:shareMultiReading\}/,
 "Multi-song reader keeps Share inside the upper options menu");
assert.doesNotMatch(app,/style:S\.songActionBar/,
 "No second toolbar under the lyrics");
assert.match(app,/shareMultiReading/);
assert.match(styles,/multiPage:\{paddingHorizontal:18/,"Keep comfortable side margins");
console.log("SHALOM medley and misa readers match Cantos styling, preserve content, and have usable controls.");
