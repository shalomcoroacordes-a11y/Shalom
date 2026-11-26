"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),C=require("../studio-core"),{transposeOne}=require("../native-chords");
const rows=[{kind:"section",text:"Verso"},{kind:"chords",chordLine:"C G"},{kind:"section",text:"Coro"},{kind:"chords",chordLine:"Am F"}];
const anchors=C.anchorsFromRows(rows),groups=C.groupAnchors(anchors,rows);
let cfg=C.isolateSections(C.draft(anchors,"4/4",80,2),groups);
cfg=C.setSection(cfg,2,{bpm:120,transition:"pause",pauseMs:1000});
cfg={...cfg,changes:cfg.changes.map((c,i)=>i===2?{...c,hold:"ring"}:c)};
const group=groups[1],range=C.groupRange(cfg,group),timeline=C.compile(anchors,cfg),before=JSON.stringify(cfg);
for(const speed of [.25,1,2])for(const [r,p] of [[null,null],[range,null],[null,range],[{start:1,end:3},range],[{start:0},range]]){
 const first=r?.start??p?.start??0,end=r?.end??p?.end??cfg.endStep??timeline.length;
 assert.deepEqual(C.playbackRange(timeline,cfg,r,p,speed),{first,end,clock:C.clockRange(timeline,first,end,speed)});
}
assert.throws(()=>C.playbackRange(timeline,cfg,{start:4,end:2},null,1),/Rango musical/);
const hits=Array.from({length:8},(_,i)=>({hit:"mute",accent:i===0}));
const live=C.applySectionPattern(cfg,groups,group,1,hits,"all");
let count=0;
for(const e of timeline){
 let expected=e;
 if(e.step>=range.start&&e.step<range.end&&e.chord){
  const i=anchors.findIndex(a=>a.id===e.anchorId);
  if(live.changes[i]?.hold!=="ring"){expected={...e,...C.sectionHit(live,group,e.step-range.start)};count++;}
 }
 assert.deepEqual(C.liveSectionEvent(e,anchors,live,group),expected);
}
assert.ok(count>0);
assert.equal(C.liveSectionEvent(timeline[range.start],anchors,live,group),timeline[range.start],"Ring hold must remain unchanged");
assert.equal(C.liveSectionEvent(timeline[0],anchors,live,group),timeline[0],"Other sections must not change");
const official={...cfg,fragments:[{index:1,start:range.start,end:range.end}]};
for(const shift of [-12,0,12])for(const capo of [0,12]){
 const track={range,shift,capo};
 assert.deepEqual(C.sequenceTrackTimeline(anchors,official,track,transposeOne),C.compile(anchors,official,chord=>transposeOne(chord,shift)));
}
assert.throws(()=>C.sequenceTrackTimeline(anchors,cfg,{range,shift:0,capo:0},transposeOne),/rango oficial/);
for(const track of [{shift:13,capo:0},{shift:0,capo:13},{shift:.5,capo:0},{shift:0,capo:-1}])assert.throws(()=>C.sequenceTrackTimeline(anchors,cfg,track,transposeOne),/Tono o capo/);
assert.equal(JSON.stringify(cfg),before);
const source=fs.readFileSync("studio-lab.js","utf8");
for(const name of ["playbackRange","liveSectionEvent","sequenceTrackTimeline"])assert.ok(source.includes("core."+name+"("));
console.log("Studio playback planning: range priority, clock, live rhythm isolation, ring hold and official fragment validation.");
