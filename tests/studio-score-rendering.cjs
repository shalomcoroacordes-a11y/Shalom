"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("studio-lab.js","utf8"),start=source.indexOf("let originalScore=null;"),end=source.indexOf("function divisions()",start);
assert.ok(start>=0&&end>start);
let renders=0,writes=0;
const sourceField={value:"first"};
function row(kind,text){
 return {classList:{contains:name=>name===kind},textContent:text,querySelector:()=>({textContent:text})};
}
function makeScore(){
 return {children:[],set innerHTML(value){writes++;this.children=[row("song-section-label","Verso"),row("song-line",value),row("song-standalone-chords","G"),row("plain","Texto")]}};
}
let score=makeScore();
const scope={$:id=>id==="source"?sourceField:score,window:{ShalomChords:{render(text,options){renders++;return options?options.transpose(text):text}}},shifted:(c,move)=>c+":"+move};
vm.createContext(scope);vm.runInContext(source.slice(start,end),scope);
const read=()=>JSON.parse(JSON.stringify(scope.readRows()));
assert.deepEqual(read(),[{kind:"section",text:"Verso"},{kind:"chords",chordLine:"first"},{kind:"chordsOnly",text:"G"},{kind:"other"}]);
for(let i=0;i<20;i++)read();
assert.equal(renders,1);assert.equal(writes,1);
sourceField.value="second";assert.equal(read()[1].chordLine,"second");assert.equal(renders,2);
scope.renderPlaybackScore("second",2);assert.equal(score.children[1].textContent,"second:2");assert.equal(read()[1].chordLine,"second");assert.equal(renders,4);
score=makeScore();assert.equal(read()[1].chordLine,"second");assert.equal(renders,5);
const invalidate=source.match(/function showStep\(timeline,i\)\{\s*const e=timeline\[i\];if\(!e\)return;originalScore=null;/);
assert.ok(invalidate,"Playback highlighting invalidates the original score");
vm.runInContext("originalScore=null",scope);
assert.equal(read()[1].chordLine,"second");assert.equal(renders,6);
assert.equal((source.match(/ShalomChords\.render\(/g)||[]).length,2,"All score writes have explicit owners");
assert.match(source,/renderPlaybackScore\(track.song.lyrics,track.shift\)/);
assert.equal((source.match(/renderPlaybackScore\(\$\("source"\).value,move\)/g)||[]).length,2);
console.log("Studio score reuse: one render for 21 identical reads; source, node and playback invalidation verified.");
