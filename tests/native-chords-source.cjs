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
 assert.equal(engine.preserveColumns("C  G"),"C\u00a0\u00a0G");
 assert.equal(engine.chordRow("C  G/B"),true);
 assert.equal(engine.chordRow("[Coro]"),false);
}
assert.equal(generate(read),read(files[0]));
console.log("Native chords: canonical generation, drift detection, 500 parse cases and 900 transposition cases verified.");
