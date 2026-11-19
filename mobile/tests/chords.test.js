const assert=require("node:assert/strict");
const {parseSong,transposeOne,chordRow,preserveColumns,scoreColumns,scoreWidth}=require("../src/chords");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
assert.equal(transposeOne("D",2),"E");
assert.equal(transposeOne("G/B",2),"A/C#");
assert.equal(chordRow("   F#m          D#m"),true);
assert.equal(chordRow("Hola, Señor"),false);
const song=parseSong("[Coro]\nF#         D#m\nHola, Dios\n\n(F#m)Mi vida",0);
assert.equal(song.length,4);
assert.equal(song[0].kind,"section");
assert.deepEqual([song[1].chordLine.trim(),song[1].lyricLine],["F#         D#m","Hola, Dios"]);
assert.equal(song[2].kind,"space");
assert.equal(song[3].chordLine.trim(),"F#m");
assert.equal(parseSong("(C)Hola",2)[0].chordLine.trim(),"D");
// La web del administrador es la referencia única de columnas de acordes.
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,"../../song-chords.js"),"utf8"),context);
const web=context.window.ShalomChords;
const decode=value=>String(value).replace(/&amp;/g,"&").replace(/&lt;/g,"<")
 .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#039;/g,"'");
function compareAgainstAdmin(source,shift=0){
 const native=parseSong(source,shift).filter(r=>r.kind==="chords");
 const html=web.render(source,{transpose:chord=>transposeOne(chord,shift)});
 const pairs=[...html.matchAll(/<span class="song-line[^"]*"><span class="chord-line">([\s\S]*?)<\/span><span class="lyric-line">([\s\S]*?)<\/span><\/span>/g)]
  .map(match=>({chordLine:decode(match[1]),lyricLine:decode(match[2])}));
 assert.deepEqual(native.map(r=>({chordLine:r.chordLine,lyricLine:r.lyricLine})),
  pairs,"Android y Admin deben respetar exactamente las mismas columnas.");
 return native;
}
const example="[Verso 1]\nG                  D\nAhí en la Eucaristía\n   C       Am     D\nEstá tu presencia, Señor\n\n[Coro]\nG         Em\nTu cuerpo, tu sangre";
const sample=compareAgainstAdmin(example,0);
assert.equal(sample[0].chordLine.indexOf("G"),0);
assert.equal(sample[0].chordLine.indexOf("D"),19);
assert.equal(sample[1].chordLine.indexOf("Am"),11);
assert.equal(sample[1].lyricLine,"Está tu presencia, Señor");
compareAgainstAdmin(example,2);
compareAgainstAdmin("[Coro]\n(C)Tu cuerpo, tu (G) sangre\n(C  G)Mi vida\n[Verso 2]\nF#      C#m\nAdoración",0);
compareAgainstAdmin("[Coro]\n(C)Hola, (Em)Señor\n\nG  D\nJesús vive\n",1);
const latin="Ahí en la Eucaristía";
assert.equal(preserveColumns("G   D"),"G\u00a0\u00a0\u00a0D");
assert.equal(preserveColumns(latin),latin.replace(/ /g,"\u00a0"));
assert.ok(scoreColumns(parseSong(example))>=24);
assert.ok(scoreWidth(parseSong("C       G\n"+"la ".repeat(45)),18)>450,
 "Una línea larga debe generar scroll horizontal, no salto de los acordes.");

console.log("SHALOM native: pruebas de acordes correctas");
