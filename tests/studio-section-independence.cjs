"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core"),codec=require("../studio-codec");
const rows=[{kind:"section",text:"Verso 1"},{kind:"chords",chordLine:"C G"},{kind:"section",text:"Verso 2"},{kind:"chords",chordLine:"Am F"},{kind:"section",text:"Verso 3"},{kind:"chords",chordLine:"D A"},{kind:"section",text:"Verso 1"},{kind:"chords",chordLine:"E B"}];
const a=C.anchorsFromRows(rows),g=C.groupAnchors(a,rows);
let cfg=C.draft(a,"4/4",80,2);
const down=Array.from({length:8},(_,i)=>({hit:"down",accent:i===0})),up=down.map(h=>({...h,hit:"up"})),mute=down.map(h=>({...h,hit:"mute"}));
cfg=C.applyPattern(cfg,2,up,"one");
let before=C.compile(a,cfg);let isolated=C.isolateSections(cfg,g);
assert.deepEqual(C.compile(a,isolated),before);
let changed=C.applySectionPattern(isolated,g,g[2],1,mute,"all");
assert.deepEqual(C.compile(a,changed).slice(0,8),before.slice(0,8));
assert.deepEqual(C.compile(a,changed).slice(12,16),before.slice(12,16));
assert.equal(C.compile(a,changed)[8].hit,"mute");
assert.equal(C.compile(a,changed)[0].hit,"down");
changed=C.applySectionPattern(changed,g,g[0],1,up,"all");
assert.equal(C.compile(a,changed)[8].hit,"mute");
assert.equal(C.compile(a,changed)[0].hit,"up");
changed=C.setDuration(changed,4,12);
changed=C.setDuration(changed,5,8);
changed=C.applySectionPattern(changed,g,g[2],2,down,"one");
assert.equal(C.sectionBarHits(changed,g[2],1)[0].hit,"mute");
assert.equal(C.sectionBarHits(changed,g[2],2)[0].hit,"down");
assert.equal(C.sectionBarHits(changed,g[2],3)[0].hit,"mute");
changed=C.setSection(changed,4,{bpm:119,transition:"pause",pauseMs:1500});
changed={...changed,changes:changed.changes.map((c,i)=>i===4?{...c,hold:"ring"}:c)};
const other=[C.durationSteps(changed,2),C.durationSteps(changed,3),C.durationSteps(changed,6),C.durationSteps(changed,7)];
const copied=C.copySection(changed,g,g[2],g[0],true);
assert.equal(C.sectionConfig(copied,0).bpm,119);assert.equal(C.sectionConfig(copied,0).transition,"immediate");assert.equal(C.durationSteps(copied,0),12);assert.equal(C.durationSteps(copied,1),8);assert.equal(copied.changes[0].hold,"ring");
assert.deepEqual([C.durationSteps(copied,2),C.durationSteps(copied,3),C.durationSteps(copied,6),C.durationSteps(copied,7)],other);
assert.deepEqual(C.sectionBarHits(copied,g[0],2),C.sectionBarHits(copied,g[2],2));assert.deepEqual(C.sectionBarHits(copied,g[0],3),C.sectionBarHits(copied,g[2],3));
const restored=codec.decode(a,codec.encode(a,copied));assert.deepEqual(C.compile(a,restored),C.compile(a,copied));
const again=C.applySectionPattern(restored,g,g[0],2,up,"one");assert.equal(C.sectionBarHits(again,g[2],2)[0].hit,"down");
console.log("Secciones independientes, compases locales, copia completa y recuperación verificados.");

const mixed=C.draft(a,"4/4",80,2);
const shortGroup={...g[1],indices:[2]},groupList=[g[0],shortGroup,{...g[1],indices:[3]},g[2],g[3]];
const rhythmOnly=C.copySection(mixed,groupList,g[0],shortGroup,false);
assert.equal(C.durationSteps(rhythmOnly,2),C.durationSteps(mixed,2));
assert.throws(()=>C.copySection(mixed,groupList,g[0],shortGroup,true),/diferente cantidad/);
const beforeCopy=C.compile(a,changed),laterStart=changed.changes[6].step;
const afterCopy=C.compile(a,copied),newLaterStart=copied.changes[6].step;
assert.deepEqual(beforeCopy.slice(laterStart,changed.endStep).map(e=>[e.chord,e.hit,e.tempo,e.duration]),afterCopy.slice(newLaterStart,copied.endStep).map(e=>[e.chord,e.hit,e.tempo,e.duration]));

for(const arrangement of [mixed,changed,copied,restored]){
 for(const group of g){
  const range=C.groupRange(arrangement,group),bounds=C.groupBounds(arrangement,group);
  assert.deepEqual(range,{start:bounds.start,end:bounds.end,title:group.title});
  const m=C.resolution(arrangement.meter,arrangement.division),n=m.beats*m.division;
  const total=Math.max(1,Math.ceil((range.end-range.start)/n));
  assert.equal(C.sectionBarCount(arrangement,group),total);
  for(const input of ["",0,1,1.6,999,"abc"]){
   const selection=C.sectionBarSelection(arrangement,group,input);
   assert.equal(selection.bar,Math.max(1,Math.min(total,Math.round(Number(input)||1))));
   assert.equal(selection.start,range.start+(selection.bar-1)*n);
   assert.deepEqual(selection.hits,C.sectionBarHits(arrangement,group,selection.bar));
  }
 }
 const p=C.groupRange(arrangement,g[0]),c=C.groupRange(arrangement,g[1]);
 assert.deepEqual(C.sectionTransitionRange(arrangement,g[0],g[1]),{start:Math.max(p.start,p.end-8),end:Math.min(c.end,c.start+8)});
}
console.log("Section ranges, local bar selection and transitions use the canonical musical boundaries.");
