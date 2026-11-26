"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),C=require("../studio-core"),codec=require("../studio-codec");
for(const [meter,division] of [["4/4",2],["3/4",2],["6/8",3],["4/4",4]]){
 const cfg={meter,division},m=C.resolution(meter,division),size=m.beats*m.division;
 assert.deepEqual(C.durationChoices(cfg),[["Medio pulso",division/2],["1 pulso",division],["2 pulsos",division*2],["1 compás",size],["2 compases",size*2],["4 compases",size*4]]);
 for(let n=1;n<=size*4;n++){
  const p=n/division;
  assert.equal(C.durationLabel(cfg,n),Number(p.toFixed(3))+" "+(p===1?"pulso":"pulsos")+(p===m.beats?" · 1 compás":p>m.beats&&p%m.beats===0?" · "+p/m.beats+" compases":""));
  assert.equal(C.pulsesToSteps(cfg,Number(p.toFixed(6))),n);
 }
 assert.throws(()=>C.pulsesToSteps(cfg,.12345),/duración compatible/);
 assert.throws(()=>C.pulsesToSteps(cfg,"bad"),/duración compatible/);
}
const rows=[{kind:"section",text:"Verso"},{kind:"chords",chordLine:"C G"},{kind:"section",text:"Coro"},{kind:"chords",chordLine:"Am F"}];
const a=C.anchorsFromRows(rows),g=C.groupAnchors(a,rows);
const cfg={...C.draft(a,"4/4",80,2),fragments:[{index:0,start:0,end:4}]},before=JSON.stringify(cfg);
const ring=C.setAnchorHold(cfg,1,"ring");
assert.equal(ring.changes[1].hold,"ring");assert.deepEqual(ring.fragments,cfg.fragments);
assert.equal(C.anchorRange(a,cfg,3).end,cfg.endStep??cfg.totalSteps);
assert.deepEqual(C.anchorRange(a,cfg,0),{start:cfg.changes[0].step,end:cfg.changes[1].step,title:"C"});
assert.throws(()=>C.moveAnchor(cfg,g,0,1),/entrada de la sección/);
assert.throws(()=>C.moveAnchor(cfg,g,2,5),/entrada de la sección/);
const moved=C.moveAnchor(cfg,g,1,3);
assert.equal(moved.changes[1].step,3);assert.deepEqual(moved.fragments,[]);
assert.deepEqual(C.compile(a,moved),C.compile(a,codec.decode(a,codec.encode(a,moved))));
assert.deepEqual(C.suggestFragmentRange(cfg,g,{title:"Coro"}),C.groupRange(cfg,g[1]));
assert.throws(()=>C.suggestFragmentRange(cfg,[...g,g[1]],{title:"Coro"}),/repetida/);
assert.throws(()=>C.suggestFragmentRange(cfg,g,{title:"Ausente"}),/sin acordes/);
assert.equal(JSON.stringify(cfg),before);
const src=fs.readFileSync("studio-lab.js","utf8");
for(const name of ["durationLabel","durationChoices","pulsesToSteps","setAnchorHold","moveAnchor","anchorRange","suggestFragmentRange"])assert.ok(src.includes("core."+name+"("));
console.log("Studio duration: exact labels and choices, subdivision conversion, chord hold, move protection, fragment suggestion and codec roundtrip.");
