"use strict";
const assert=require("node:assert/strict");
const {test}=require("node:test");
const core=require("../studio-core");
const guitar=require("../studio-guitar");
const codec=require("../studio-codec");
const {parseSong}=require("../mobile/src/chords");
const anchors=core.anchorsFromRows(parseSong("[Coro]\nC       G       Am\nTexto de ejemplo\nF       G\nSegundo renglón"));
test("32 subdivisions and offbeat chord change",()=>{
 const d=core.draft(anchors,"4/4",80,8);d.changes[1].step=3;
 const timeline=core.compile(anchors,d);assert.equal(timeline[3].chord,"G");assert.equal(timeline[3].time,.28125);
});
test("compact serialization preserves timeline and deduplicates patterns",()=>{
 const d=core.draft(anchors,"4/4",80,8);d.totalSteps=128;
 for(const start of [32,64])d.patterns.push({start,hits:d.patterns[0].hits.map(h=>({...h}))});
 const e=codec.encode(anchors,d);
 assert.equal(e.p.length,1);assert.deepEqual(core.compile(anchors,codec.decode(anchors,e)),core.compile(anchors,d));
 assert.ok(JSON.stringify(e).length<JSON.stringify(d).length);
});
test("reject stale and malformed arrangements",()=>{
 const e=codec.encode(anchors,core.draft(anchors));
 assert.throws(()=>codec.decode(anchors.slice(1),e),/desactualizado/);
 e.p[0]="invalid";assert.throws(()=>codec.decode(anchors,e),/Patrón/);
});
test("guitar samples and capo",()=>{
 for(const c of ["C","G","Am","F","D/F#","Cmaj7"]){
  const s=guitar.voicing(c);assert.equal(s.length,6);
  assert.equal(guitar.stringMidi(s,2).find(n=>n!==null),guitar.stringMidi(s,0).find(n=>n!==null)+2);
 }
 for(const tone of ["steel","nylon"]){
  const sample=guitar.pluck(44100,64,tone,false);
  assert.ok(sample.every(Number.isFinite));assert.ok(sample.some(x=>Math.abs(x)>.0001));
 }
});
