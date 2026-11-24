"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core"),codec=require("../studio-codec");
const rows=[{kind:"section",text:"Verso 1"},{kind:"chords",chordLine:"C"},{kind:"section",text:"Verso 2"},{kind:"chords",chordLine:"G Am"},{kind:"chords",chordLine:"F"}];
const a=C.anchorsFromRows(rows),g=C.groupAnchors(a,rows);
let cfg=C.isolateSections(C.draft(a,"4/4",80,2),g);
cfg=C.setDuration(cfg,1,18);cfg=C.setDuration(cfg,2,4);cfg=C.setDuration(cfg,3,6);
let ctx=C.barContext(a,cfg,g[1],2,0);assert.equal(ctx.active,1);assert.equal(ctx.continuing,true);assert.deepEqual(ctx.lines,[3]);
ctx=C.barContext(a,cfg,g[1],3,6);assert.equal(ctx.active,3);assert.deepEqual(ctx.lines,[3,4]);
const hits=Array.from({length:8},(_,i)=>({hit:i%2?"up":"down",accent:i===0}));
cfg=C.applySectionPattern(cfg,g,g[1],2,hits,"one");cfg=C.setSection(cfg,1,{bpm:110,transition:"pause",pauseMs:1000});
cfg.fragments=[{index:1,start:2,end:30}];
const before=C.compile(a,cfg),wide=C.redivide(cfg,8),after=C.compile(a,wide);
assert.equal(wide.division,8);assert.equal(wide.changes[1].step,cfg.changes[1].step*4);assert.equal(wide.endStep,cfg.endStep*4);
assert.deepEqual(wide.fragments,[{index:1,start:8,end:120}]);assert.equal(wide.sections[1].pauseMs,1000);
for(let i=0;i<cfg.endStep;i++){assert.equal(before[i].chord,after[i*4].chord);assert.equal(before[i].hit,after[i*4].hit);assert.ok(Math.abs(before[i].time-after[i*4].time)<1e-8);}
assert.deepEqual(C.compile(a,codec.decode(a,codec.encode(a,wide))),after);
const narrower=C.redivide(wide,2);assert.deepEqual(C.compile(a,narrower),before);
assert.throws(()=>C.redivide(cfg,3),/cuadrícula/);
console.log("Ubicación de letra, acordes sostenidos y cambio de cuadrícula sin perder eventos comprobados.");
