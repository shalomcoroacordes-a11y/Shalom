const assert=require("node:assert/strict");
const fs=require("node:fs");
const {anchoredTokens,columnCount,initialCellWidth,measuredCellWidth,tokenPositions}=require("../src/chord-grid");
const {parseSong}=require("../src/chords");
const original="[Verso 1]\nG                  D\nAhí en la Eucaristía\n   C       Am     D\nEstá tu presencia, Señor\n\n[Coro]\nG         Em\nTu cuerpo, tu sangre";
const rows=parseSong(original);
assert.equal(rows[0].kind,"section");
const g=anchoredTokens(rows[1].chordLine);
const lyric=anchoredTokens(rows[1].lyricLine);
assert.deepEqual(g,[{column:0,text:"G"},{column:19,text:"D"}],"Mantener exactamente la columna del acorde D guardada por el admin");
assert.deepEqual(lyric.map(x=>x.column),[0,4,7,10],"Palabras ancladas a la misma cuadrícula que los acordes");
const second=anchoredTokens(rows[2].chordLine);
assert.deepEqual(second.map(x=>x.column),[3,11,18]);
assert.equal(second[1].text,"Am");
assert.equal(rows[2].lyricLine,"Está tu presencia, Señor");
for(const fontSize of [13,18,22,30]){
 const width=initialCellWidth(fontSize);
 const chord=tokenPositions(rows[1].chordLine,width);
 const lyricCoordinates=Array.from({length:rows[1].lyricLine.length},(_,i)=>i*width);
 assert.equal(chord[1].x,lyricCoordinates[19],
  "El acorde D debe quedar sobre la columna 19 de la letra para cualquier tamaño de fuente");
 assert.equal(chord[0].x,lyricCoordinates[0]);
 const measured=measuredCellWidth(width*32,32,fontSize);
 assert.ok(Math.abs(measured-width)<.001);
 assert.equal(tokenPositions(rows[1].chordLine,measured)[1].x,19*measured);
}
assert.equal(measuredCellWidth(0,32,18),initialCellWidth(18),"No usar medidas faltantes");
assert.equal(measuredCellWidth(900,32,18),initialCellWidth(18),"No usar anchuras de contenedor completas");
assert.equal(measuredCellWidth(320,0,18),initialCellWidth(18));
assert.ok(columnCount(rows)>=24);
assert.deepEqual(anchoredTokens("  C     Am        D"),[
 {column:2,text:"C"},{column:8,text:"Am"},{column:18,text:"D"}]);
assert.deepEqual(anchoredTokens("(G)   D"),[{column:0,text:"(G)"},{column:6,text:"D"}]);

const ui=fs.readFileSync("src/aligned-score-ui.js","utf8");
const web=fs.readFileSync("src/web-score-html.js","utf8");
const app=fs.readFileSync("App.js","utf8");
assert.match(ui,/require\("react-native-webview"\)/,"Use the exact same text layout engine as the website");
assert.match(ui,/scoreHtml\(rows,safeFont\)/,"Render unchanged parsed chord lines locally");
assert.match(ui,/onMessage:onHeight/,"Resize the native score to the browser-rendered height");
assert.match(ui,/scrollEnabled:false/,"Native page retains the vertical scroll");
assert.match(ui,/onError:\(\)=>setFailed\(true\)/,"Offer a readable fallback when WebView fails");
assert.match(web,/font-family:"Courier New",Courier,monospace/,"Use the website's real Courier New font");
assert.match(web,/white-space:pre/,"Preserve exactly the original chord columns");
assert.match(web,/song-stacked-chords/,"Keep chords paired with their original lyrics");
assert.doesNotMatch(ui,/anchoredTokens|token\.column|preserveColumns/,"Do not estimate glyph spacing in native Text");
assert.match(app,/return h\(AlignedScore,\{rows,fontSize,variant:keyPrefix,\s*onFontSizeChange:/,
 "Cantos, misas, repertorios y popurrís comparten tipografía web y zoom nativo");
assert.match(app,/renderAlignedScoreRows\(parsed,readerFont/);
assert.match(app,/renderAlignedScoreRows\(parsed,fontOverride,keyPrefix\)/);
console.log("SHALOM: browser-based text alignment, original columns and native fallback verified.");
