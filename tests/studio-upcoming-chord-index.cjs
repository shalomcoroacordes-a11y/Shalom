"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),C=require("../studio-core");
function verify(timeline){
 const index=C.upcomingChordIndices(timeline);
 assert.equal(index.length,timeline.length);
 for(let i=0;i<timeline.length;i++){
  const expected=timeline.findIndex((e,j)=>j>i&&e.anchorId!==timeline[i].anchorId&&e.chord);
  assert.equal(index[i],expected,"index "+i);
 }
}
verify([]);verify([{anchorId:"a",chord:"C"}]);
verify([{anchorId:"a",chord:"C"},{anchorId:"a",chord:"C"},{anchorId:"b",chord:null},{anchorId:"a",chord:"C"},{anchorId:"c",chord:"C"},{anchorId:null,chord:null}]);
let seed=17;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let n=0;n<80;n++){
 const timeline=Array.from({length:n},()=>({anchorId:[null,undefined,"a","b","c"][random()%5],chord:[null,"C","G","Am"][random()%4]}));
 verify(timeline);
}
const rows=[{kind:"section",text:"Verso"},{kind:"chords",chordLine:"C G"},{kind:"section",text:"Coro"},{kind:"chords",chordLine:"Am F"}],anchors=C.anchorsFromRows(rows);
for(const [meter,division] of [["4/4",2],["6/8",3],["3/4",4]]){
 let cfg=C.draft(anchors,meter,80,division);
 cfg=C.setDuration(cfg,0,division*5);
 verify(C.compile(anchors,cfg));verify(C.compile(anchors,cfg,()=> "G"));
}
const source=fs.readFileSync("studio-lab.js","utf8"),start=source.indexOf("let indexedTimeline=null"),end=source.indexOf("function showStep(",start);
assert.ok(start>=0&&end>start);
let builds=0;
const scope={core:{upcomingChordIndices(t){builds++;return C.upcomingChordIndices(t)}}};
vm.createContext(scope);vm.runInContext(source.slice(start,end),scope);
const a=[{anchorId:"a",chord:"C"},{anchorId:"b",chord:"G"}],b=[{anchorId:"c",chord:"Am"},{anchorId:"d",chord:"F"}];
for(let i=0;i<100;i++)assert.equal(scope.nextPlaybackChord(a,0),a[1]);
assert.equal(builds,1);assert.equal(scope.nextPlaybackChord(a,1),undefined);
assert.equal(scope.nextPlaybackChord(b,0),b[1]);assert.equal(builds,2);
assert.equal(scope.nextPlaybackChord(a,0),a[1]);assert.equal(builds,3);
assert.match(source,/const upcoming=nextPlaybackChord\(timeline,i\)/);
assert.match(source,/function stop\(\)\{indexedTimeline=null;upcomingIndices=null;/);
assert.doesNotMatch(source,/timeline\.find\(\(x,j\)=>j>i/);
console.log("Upcoming chords: reverse index matches previous search, including silence, repeated anchors and transposition; one index per active timeline.");
