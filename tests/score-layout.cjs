"use strict";
const assert=require("node:assert/strict");
const {layoutAnchors}=require("../score-layout.js");
const {parseSong}=require("../native-chords.js");
const parseAnchoredSong=(source,shift)=>parseSong(source,shift,true);
const widths={i:3,l:4,m:13,M:15,W:15," ":5};
function metrics(scale=1){
 const measure=s=>Array.from(s).reduce((sum,c)=>sum+(widths[c]||9)*scale,0);
 return {anchorX:(s,p)=>measure(s.slice(0,p))+Math.max(0,p-s.length)*5*scale,chordWidth:measure};
}
function verify(row,scale){
 const m=metrics(scale),gap=4*scale;
 const result=layoutAnchors(row.lyricLine,row.anchors,m,gap);
 assert.equal(result.anchors.length,row.anchors.length);
 for(const a of result.anchors){
  assert.equal(a.x,m.anchorX(row.lyricLine,a.position),"Chord must not move away from source anchor");
  assert.ok(result.width>=a.x+a.width);
 }
 for(let i=0;i<result.anchors.length;i++)for(let j=i+1;j<result.anchors.length;j++){
  const a=result.anchors[i],b=result.anchors[j];
  if(a.lane===b.lane)assert.ok(a.x+a.width+gap<=b.x,"Same-lane chords cannot overlap");
 }
 return result;
}
const samples=["(Cmaj7)S(G/B)e(Am7)ñor","C   G/B    Am\nmil palabras","(C)(G)(Am)Aleluya","C             D\nSol","[Coro]\n(F#m)Mi (Dbmaj7)vida"];
let checked=0;
for(const sample of samples)for(let shift=-12;shift<=12;shift++){
 const row=parseAnchoredSong(sample,shift).find(r=>r.kind==="chords");
 const baseline=verify(row,1);
 for(const scale of [.75,1,1.5,2]){
  const result=verify(row,scale);
  assert.deepEqual(result.anchors.map(a=>a.position),baseline.anchors.map(a=>a.position));
  assert.equal(result.lanes,baseline.lanes);
  checked++;
 }
}
const close=verify(parseAnchoredSong("(Cmaj7)(G/B)Mi",0)[0],1);
assert.equal(close.lanes,2);
assert.equal(close.anchors[0].x,close.anchors[1].x);
assert.deepEqual(layoutAnchors("Mi",[],metrics()),{anchors:[],lanes:0,width:18});
assert.throws(()=>layoutAnchors("Mi",[{position:-1,chord:"C"}],metrics()),/Invalid chord anchor/);
console.log("Proportional geometry:",checked,"anchor and collision cases verified.");
