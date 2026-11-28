"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {generate,sync}=require("../scripts/build-native-chords.js");
const read=name=>fs.readFileSync(name,"utf8");
sync({read,check:true});
const files=["mobile/src/chords.js","admin-mobile/src/chords.js"];
const writes=new Map();
sync({read,write:(name,value)=>writes.set(name,value)});
for(const name of files)assert.equal(writes.get(name),read(name));
assert.throws(()=>sync({read:name=>name===files[0]?read(name)+"\n// accidental change":read(name),check:true}),/differs from native-chords/);
assert.throws(()=>sync({read:name=>name===files[1]?read(name)+"\n// accidental change":read(name),check:true}),/differs from native-chords/);
const source=require("../native-chords.js");
const engines=files.map(name=>require("../"+name));
const samples=["","[Coro]\nC      G/B\nTu amor","(C)Hola (Am)Señor","[Verso]\nF#   D#m\n   (G)Letra","(No es un acorde)","Dbmaj7  Ab/C\nTexto con acentos áéíóú","C  G\nD  A\n","C\tG\r\nTexto\r\n\r\n[Puente]","Texto < & >","G  D\n"+ "palabra ".repeat(25)];
const chords=["C","C#","Db","D","Eb","E","F#m","Gb","Ab","Bb","G/B","Cmaj7","Am7","Dsus4","Fadd9","Bdim7","C+","G7/B"];
for(const engine of engines){
 assert.deepEqual(Object.keys(engine),Object.keys(source));
 for(let shift=-12;shift<=12;shift++){
  for(const sample of samples){
   const rows=source.parseSong(sample,shift),actual=engine.parseSong(sample,shift);
   assert.deepEqual(actual,rows);
   assert.equal(engine.scoreColumns(actual),source.scoreColumns(rows));
   assert.equal(engine.scoreWidth(actual,18),source.scoreWidth(rows,18));
  }
  for(const chord of chords)assert.equal(engine.transposeOne(chord,shift),source.transposeOne(chord,shift));
 }

 // Los índices de origen no dependen de la longitud del acorde transpuesto.
 const anchored=engine.parseAnchoredSong("C  G/B    Am\nÁbreme Señor",1)[0];
 assert.deepEqual(anchored.anchors,[{position:0,chord:"C#"},{position:3,chord:"G#/C"},{position:10,chord:"A#m"}]);
 assert.equal(anchored.lyricLine,"Ábreme Señor");
 const inlineAnchors=engine.parseAnchoredSong("(C)Se(G/B)ñor (Am) mío",1)[0];
 assert.deepEqual(inlineAnchors.anchors,[{position:0,chord:"C#"},{position:2,chord:"G#/C"},{position:6,chord:"A#m"}]);
 assert.equal(inlineAnchors.lyricLine,"Señor  mío");
 const merged=engine.parseAnchoredSong("C   G\n(Am)Hola (D)Señor",0)[0];
 assert.deepEqual(merged.anchors,[{position:0,chord:"C"},{position:0,chord:"Am"},{position:4,chord:"G"},{position:5,chord:"D"}]);
 for(const sample of samples){
  for(let shift=-12;shift<=12;shift++){
   const rows=engine.parseAnchoredSong(sample,shift);
   assert.deepEqual(rows.map(({anchors,...row})=>row),engine.parseSong(sample,shift));
   const zero=engine.parseAnchoredSong(sample,0);
   assert.deepEqual(rows.map(row=>row.anchors?.map(a=>a.position)),zero.map(row=>row.anchors?.map(a=>a.position)));
  }
 }

 assert.equal(engine.preserveColumns("C  G"),"C\u00a0\u00a0G");
 assert.equal(engine.chordRow("C  G/B"),true);
 assert.equal(engine.chordRow("[Coro]"),false);
}
assert.equal(generate(read),read(files[0]));
console.log("Native chords: canonical generation, drift detection, 500 parse cases and 900 transposition cases verified.");


const vm=require("node:vm");
const webContext={window:{}};
vm.runInNewContext(read("song-chords.js"),webContext);
const web=webContext.window.ShalomChords;
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
for(const sample of [...samples,"(C)Se(G/B)ñor (Am) mío","C  G/B    Am\nÁbreme Señor","C   G\n(Am)Hola (D)Señor"]){
 for(let shift=-12;shift<=12;shift++){
  const options={transpose:chord=>source.transposeOne(chord,shift)};
  const baseline=web.render(sample,options);
  const anchored=web.render(sample,{...options,includeAnchors:true});
  const webAnchors=Array.from(anchored.matchAll(/ data-chord-anchors="([^"]*)"/g),match=>JSON.parse(decode(match[1])));
  const nativeAnchors=source.parseAnchoredSong(sample,shift).filter(row=>row.kind==="chords").map(row=>row.anchors);
  assert.deepEqual(webAnchors,nativeAnchors,"Web y apps conservan los mismos anclajes de origen");
  assert.equal(anchored.replace(/ data-chord-anchors="[^"]*"/g,""),baseline,"No cambiar el HTML existente salvo metadatos optativos");
 }
}
console.log("Web/native anchored score parity verified.");
