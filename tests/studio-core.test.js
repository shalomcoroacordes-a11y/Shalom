"use strict";
const assert=require("node:assert/strict");
const {test}=require("node:test");
const {parseSong,transposeOne}=require("../mobile/src/chords");
const studio=require("../studio-core");
test("detects multiple chords on the same line, including inline notation",()=>{
 const a=studio.anchorsFromRows(parseSong("[Coro]\nC      G       Am\nTexto de ejemplo\n(F)Otra (G)línea"));
 assert.deepEqual(a.map(x=>x.chord),["C","G","Am","F","G"]);
 assert.equal(a[0].line,a[2].line);
 assert.equal(a[1].column,7);
});
test("timing independent of text columns; chord changes on an upbeat",()=>{
 const a=studio.anchorsFromRows(parseSong("C      G\nTexto"));
 const d=studio.draft(a);
 d.changes[1].step=3;
 const t=studio.compile(a,d);
 assert.equal(t[2].chord,"C");assert.equal(t[3].chord,"G");
 assert.equal(t[3].time,1.125);
 assert.equal(studio.compile(a,d,c=>transposeOne(c,2))[3].chord,"A");
});
test("6/8 has six subdivisions and a dotted-quarter BPM",()=>{
 const a=studio.anchorsFromRows(parseSong("C\nTexto"));
 const d=studio.draft(a,"6/8",60);
 const t=studio.compile(a,d);
 assert.equal(t.length,6);assert.equal(t[3].time,1);
});
test("reject stale and unordered synchronization",()=>{
 const a=studio.anchorsFromRows(parseSong("C G\nTexto"));
 const d=studio.draft(a);
 assert.throws(()=>studio.compile(studio.anchorsFromRows(parseSong("D G\nTexto")),d),/cambiaron/);
 d.changes[1].step=0;
 assert.throws(()=>studio.compile(a,d),/orden/);
});
