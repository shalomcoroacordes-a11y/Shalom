"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),C=require("../studio-core");
for(const value of [-100,0,40,80.5,120,240,999,NaN,Infinity,-Infinity])assert.ok(Object.is(C.clampTempo(value),Math.max(40,Math.min(240,Math.round(value)))));
for(const value of ["",0,-1,.3333,1.5,10,12,"bad"])assert.equal(C.pauseMilliseconds(value),Math.max(0,Math.min(10000,Math.round(Number(value)*1000)||0)));
for(const [meter,division] of [["4/4",2],["3/4",2],["6/8",3],["4/4",4]]){
 const cfg={meter,division},names=["basic","all","worship","ring","empty"].filter(n=>n!=="worship"||meter==="4/4"&&division===2);
 for(const name of names){
  const hits=C.presetHits(cfg,name),original=JSON.stringify(hits);
  assert.equal(C.identifyPreset(cfg,hits,hits),names.find(n=>JSON.stringify(C.presetHits(cfg,n))===original)||"custom");
  assert.equal(C.identifyPreset(cfg,null,hits),"base");
  for(let i=0;i<hits.length;i++){
   for(const value of ["down","up","mute","rest",null])for(const accent of [true,false]){
    const out=C.editHit(hits,i,value,accent);
    assert.deepEqual(out,hits.map((h,j)=>j===i?{...h,...(value?{hit:value}:{}),...(accent?{accent:!h.accent}:{})}:{...h}));
    assert.notEqual(out,hits);out.forEach((h,j)=>assert.notEqual(h,hits[j]));
   }
   const types=["down","up","mute","rest"];
   assert.deepEqual(C.cycleHit(hits,i),hits.map((h,j)=>j===i?{...h,hit:types[(types.indexOf(h.hit)+1)%types.length]}:{...h}));
  }
  assert.equal(JSON.stringify(hits),original);
 }
}
const cfg={meter:"4/4",division:2},custom=C.presetHits(cfg,"basic");custom[3]={hit:"mute",accent:true};assert.equal(C.identifyPreset(cfg,custom,custom),"custom");
const src=fs.readFileSync("studio-lab.js","utf8");
for(const name of ["clampTempo","pauseMilliseconds","identifyPreset","editHit","cycleHit"])assert.ok(src.includes("core."+name+"("));
console.log("Studio controls: tempo/pause limits, preset matching, immutable rhythm edits, accent toggling and cycling across meters.");
