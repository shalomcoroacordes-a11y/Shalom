const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const readers=fs.readFileSync("mobile/src/music-readers-ui.js","utf8");
const styles=fs.readFileSync("mobile/src/app-styles.js","utf8");
function section(name,next){
 const i=app.indexOf(" function "+name+"(");
 const j=app.indexOf(" function "+next+"(",i+1);
 assert.ok(i>=0&&j>i,"Reader region not found: "+name);
 return app.slice(i,j);
}
const rep=readers.slice(readers.indexOf("function RepertoireReader("),readers.indexOf("function MedleyReader("));
const medley=readers.slice(readers.indexOf("function MedleyReader("),readers.indexOf("function SongReader("));
assert.match(app,/h\(RepertoireReader,\{/);
assert.match(app,/h\(MedleyReader,\{/);
const score=section("collectionScoreRows","renderRepertoireDetail");
const aligned=section("renderAlignedScoreRows","renderMultiReadingScore");
const grid=fs.readFileSync("mobile/src/aligned-score-ui.js","utf8");
const controls=section("renderMultiReadingControls","renderMultiReadingScore");
assert.doesNotMatch(rep,/h\(Card,|S\.lyricsArea|S\.listRow/,"No boxed lyrical cards in repertoire reader");
assert.doesNotMatch(medley,/h\(Card,|S\.lyricsArea|S\.listRow/,"No boxed lyrical cards in popurri reader");
assert.match(rep,/song\?\.lyrics/,"Repertoire reads saved original song lyrics");
assert.match(rep,/item\.moment/,"Mass moments must be distinguished");
assert.match(rep,/song\?\.tone\?transposeOne\(song\.tone,transpose\)/,"Repertoire song tone is transposed");
assert.match(rep,/renderMultiReadingScore\(song\?\.lyrics\|\|"Canto no disponible\.",scoreShift/);
assert.match(medley,/part\.lyrics\|\|original\?\.lyrics/,"Retain fragment-only lyrics when available");
assert.match(medley,/const delta=transpose\+/,"Keep original per-fragment pitch shifts");
assert.match(medley,/collectionCapo\(song,part,capos\[key\]\)/,"Resolve each fragment capo");
assert.match(medley,/h\(CollectionCapoControl,\{song:original,selection/,"Selectable capo variants");
assert.match(rep,/h\(CollectionCapoControl,\{song,selection/);
assert.match(medley,/tutorials\.map/,"Preserve YouTube/tutorial links");
assert.doesNotMatch(medley,/\.slice\(0,3\)/,"Every tutorial should remain available");
assert.match(score,/parseSong\(lyrics,delta,true\)/,"Use the same parser as Cantos");
assert.match(score,/song&&lyrics===song\.lyrics\?song\._studio:null/,"Only inherit exact original lyrics");
assert.match(score,/showReaderCues\?ReaderCues\.decorateCollection\(parseSong\(lyrics,0\),arrangement,override,parsed\):parsed/,"Collection-specific cues remain independent");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/row\.kind==="section"/,"Use saved section labels in all readers");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/song-section-label/,"Use green chorus and verse labels");
const palette=require("../mobile/src/palette");
const {scoreHtml}=require("../mobile/src/web-score-html");
assert.ok(scoreHtml([],15).includes("color:"+palette.green+"!important"),"Use shared SHALOM green for chords");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/Courier New/, "Use identical browser font for lyrics");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/overflow-x:auto/,"Support horizontal chord scrolling");
assert.match(grid,/h\(WebView,\{/,"Browser score remains selectable");
assert.match(score,/renderAlignedScoreRows\(collectionScoreRows\(lyrics,delta,song,override\),fontOverride,keyPrefix\)/,"Misa, repertorios and popurrís share exact chord columns");
assert.match(aligned,/h\(AlignedScore,\{rows,fontSize,variant:keyPrefix,\s*onFontSizeChange:/,"Shared grid component renders every song with synchronized pinch zoom");
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
assert.match(styles,/multiPage:\{paddingHorizontal:GUTTER/,"Keep comfortable side margins");
console.log("SHALOM medley and misa readers match Cantos styling, preserve content, and have usable controls.");

const C=require("../collection-capo-options"),R=require("../repertoires-core"),M=require("../medley-core");
assert.equal(fs.readFileSync("collection-capo-options.js","utf8"),fs.readFileSync("admin-mobile/src/collection-capo-options.js","utf8"));
const song={id:"11111111-1111-1111-1111-111111111111",capo_position:2,capo_key:"F",_capos:[{id:"alt",capo_position:3,capo_key:"E"}]};
assert.deepEqual(C.options(song).map(c=>c.id),["none","main","alt"]);assert.equal(C.options(song,"missing").at(-1).id,"missing");
assert.equal(R.normalizeItems([{song_id:song.id,capo_id:"alt"}])[0].capo_id,"alt");assert.equal(M.normalizeParts([{song_id:song.id,lyrics:"C",capo_id:"main"}])[0].capo_id,"main");
assert.throws(()=>R.normalizeItems([{song_id:song.id,capo_id:{}}]),/Capo/);assert.throws(()=>M.normalizeParts([{song_id:song.id,lyrics:"C",capo_id:{}}]),/Capo/);
