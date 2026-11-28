"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),C=require("../studio-core");
function verify(anchors){
 const result=C.indexAnchors(anchors);
 for(const a of anchors){
  const index=anchors.findIndex(x=>x.id===a.id),anchor=anchors[index],ordinal=anchors.filter(x=>x.line===anchor.line&&x.column<anchor.column).length;
  assert.deepEqual(result.get(a.id),{anchor,index,ordinal});
 }
 assert.equal(result.get("absent"),undefined);
}
verify([]);
const rows=[{kind:"section",text:"Verso"},{kind:"chords",chordLine:"C     G Am"},{kind:"chordsOnly",text:"F G"},{kind:"section",text:"Coro"},{kind:"chords",chordLine:"D A"}];
const a=C.anchorsFromRows(rows),b=[...a].reverse(),before=JSON.stringify(a);
verify(a);verify(b);
verify([{id:"x",line:2,column:5},{id:"y",line:2,column:5},{id:"z",line:2,column:1},{id:"x",line:3,column:0}]);
assert.equal(JSON.stringify(a),before);
const src=fs.readFileSync("studio-lab.js","utf8"),start=src.indexOf("let indexedAnchors=null"),end=src.indexOf("function showStep(",start);
assert.ok(start>=0&&end>start);
let builds=0;
const scope={anchors:a,core:{indexAnchors(items){builds++;return C.indexAnchors(items)}}};
vm.createContext(scope);vm.runInContext(src.slice(start,end),scope);
for(let i=0;i<100;i++)assert.equal(scope.playbackAnchor(a[0].id).anchor,a[0]);
assert.equal(builds,1);
scope.anchors=b;assert.equal(scope.playbackAnchor(a[0].id).index,b.length-1);assert.equal(builds,2);
assert.equal(scope.playbackAnchor("absent"),undefined);
assert.match(src,/active=playbackAnchor\(e.anchorId\),anchorIndex=active\?\.index\?\?-1/);
assert.match(src,/const index=active.ordinal/);
assert.match(src,/function stop\(\)\{[^\n]*?indexedTimeline=null;upcomingIndices=null;indexedAnchors=null;activeAnchorIndex=null;/);
console.log("Active anchor index: first ID, lyric column rank, missing anchors, unchanged input and one build per active source.");
