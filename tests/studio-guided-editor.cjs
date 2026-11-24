"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core");
const rows=[{kind:"section",text:"Coro"},{kind:"chords",chordLine:"G C"},{kind:"section",text:"Verso"},{kind:"chords",chordLine:"Am"},{kind:"section",text:"Coro"},{kind:"chords",chordLine:"G D"}];
const a=C.anchorsFromRows(rows),groups=C.groupAnchors(a,rows);assert.deepEqual(groups.map(g=>[g.title,g.indices]),[["Coro",[0,1]],["Verso",[2]],["Coro",[3,4]]]);
let cfg=C.setDuration(C.draft(a,"4/4",80,2),0,16);assert.equal(C.durationSteps(cfg,0),16);assert.equal(cfg.changes[1].step,16);
const hits=Array.from({length:8},()=>({hit:"up",accent:false})),next=C.applyPattern(cfg,2,hits,"one");assert.deepEqual(next.patterns.map(p=>p.start),[0,8,16]);assert.deepEqual(next.patterns[2].hits,cfg.patterns[0].hits);assert.equal(C.compile(a,next)[8].hit,"up");assert.deepEqual(C.applyPattern(next,2,hits,"all").patterns,[{start:0,hits}]);assert.deepEqual(C.applyPattern(next,2,hits,"forward").patterns.map(p=>p.start),[0,8]);assert.equal(cfg.patterns.length,1);
