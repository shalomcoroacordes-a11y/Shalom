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
const app=fs.readFileSync("App.js","utf8");
assert.match(ui,/const fullLine=\(value,color,key\)=>h\(Text/,"Texto de renglón completo, sin separar palabras");
assert.match(ui,/columnCount\(rows\)\*size\*\.72/,"Sólo reservar anchura para el scroll, no posicionar acordes por píxeles");
assert.doesNotMatch(ui,/anchoredTokens\(/,"Nunca dibujar las palabras como bloques absolutos");
assert.match(ui,/fullLine\(row\.chordLine\|\|" ",C\.green/,"Renglón de acordes original sin cambios");
assert.match(ui,/fullLine\(row\.lyricLine\|\|" ",C\.text/,"Renglón de letra original sin cambios");
assert.match(ui,/fontFamily:MONO/,"Misma fuente monoespaciada para acordes y letra");
assert.match(ui,/allowFontScaling:false/,"Sin escalado desigual entre renglones");
assert.match(ui,/scrollEnabled:true/,"Las líneas largas se desplazan en vez de alterarse");
assert.doesNotMatch(ui,/\u00a0|preserveColumns|position:"absolute"|token\.column\*cell/,"Sin espacios artificiales ni tokenización de letras");
assert.match(ui,/fontWeight:"400",/,"Acordes y letra usan exactamente el mismo peso de fuente");
assert.match(ui,/lineHeight=Math\.ceil\(size\*1\.22\)/,"Interlineado como web");
assert.match(ui,/numberOfLines:1/,"No dividir una línea escrita en el editor");
assert.match(app,/return h\(AlignedScore,\{rows,fontSize,variant:keyPrefix\}\)/,
 "Cantos, misas, repertorios y popurrís usan el mismo render de columnas");
assert.match(app,/renderAlignedScoreRows\(parsed,readerFont/);
assert.match(app,/renderAlignedScoreRows\(parsed,fontOverride,keyPrefix\)/);
console.log("SHALOM: columna medida en Android y anclaje exacto de acordes/letras verificados.");
