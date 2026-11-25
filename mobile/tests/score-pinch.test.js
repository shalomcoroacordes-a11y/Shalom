const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {parseSong}=require("../src/chords");
const {scoreHtml}=require("../src/web-score-html");
const {clampReaderFont,MIN_READER_FONT,MAX_READER_FONT}=require("../src/score-zoom");

assert.equal(clampReaderFont(0),MIN_READER_FONT);
assert.equal(clampReaderFont(100),MAX_READER_FONT);
assert.equal(clampReaderFont(22.74),22.7);
assert.equal(clampReaderFont(Infinity),15);
const html=scoreHtml(parseSong("[Coro]\nG   D\nTe alabamos, Señor"),15);
assert.match(html,/touchstart/);
assert.match(html,/touchmove/);
assert.match(html,/touchend/);
assert.match(html,/preventDefault/);
assert.match(html,/type:"score-zoom"/);
assert.match(html,/white-space:pre!important/);
assert.match(html,/overflow-x:auto/);
const script=html.split("<script>")[1].split("</script>")[0];
const handlers={};
const messages=[];
const lyrics={style:{}};
const target={
 querySelector:()=>lyrics,
 getBoundingClientRect:()=>({height:240}),
 addEventListener:(event,callback)=>{handlers[event]=callback;}
};
const doc={getElementById:()=>target,readyState:"complete",
 fonts:{ready:{then:callback=>callback()}},addEventListener:()=>{}};
vm.runInNewContext(script,{
 document:doc,requestAnimationFrame:callback=>callback(),
 window:{ReactNativeWebView:{postMessage:payload=>messages.push(JSON.parse(payload))},
 addEventListener:()=>{}}
});
const touch=x=>({clientX:x,clientY:0});
const begin=()=>handlers.touchstart({touches:[touch(0),touch(100)]});
const move=(distance)=>{
 let prevented=false;
 handlers.touchmove({touches:[touch(0),touch(distance)],
  preventDefault:()=>{prevented=true;}});
 assert.ok(prevented,"Dos dedos no deben activar el zoom nativo ni desplazar el canto");
};
const end=()=>handlers.touchend({touches:[]});
const latestZoom=()=>messages.filter(m=>m.type==="score-zoom").at(-1).fontSize;
begin();move(200);end();
assert.equal(lyrics.style.fontSize,"30px");
assert.equal(latestZoom(),30);
begin();move(50);end();
assert.equal(latestZoom(),15,"Returning to the original size must notify native state");
const sent=messages.filter(m=>m.type==="score-zoom").length;
begin();move(100);end();
assert.equal(messages.filter(m=>m.type==="score-zoom").length,sent,"Do not repeat unchanged zoom notifications");
begin();move(2);end();
assert.equal(latestZoom(),MIN_READER_FONT);
begin();move(1000);end();
assert.equal(latestZoom(),MAX_READER_FONT);
assert.ok(messages.some(m=>m.type==="score-height"));
// Simulate a busy frame with several pinch events before the frame callback runs.
const frames=[],queuedHandlers={},queuedMessages=[],queuedLyrics={style:{}};
let measurements=0;
const queuedTarget={querySelector:()=>queuedLyrics,getBoundingClientRect:()=>{measurements++;return {height:250}},addEventListener:(event,fn)=>{queuedHandlers[event]=fn}};
vm.runInNewContext(script,{document:{getElementById:()=>queuedTarget,readyState:"complete",addEventListener(){}},requestAnimationFrame:fn=>frames.push(fn),window:{ReactNativeWebView:{postMessage:payload=>queuedMessages.push(JSON.parse(payload))},addEventListener(){}}});
queuedHandlers.touchstart({touches:[touch(0),touch(100)]});
for(const distance of [110,120,130,140,150])queuedHandlers.touchmove({touches:[touch(0),touch(distance)],preventDefault(){}});
assert.equal(frames.length,1,"Only one pending measurement per frame");
frames.shift()();assert.equal(measurements,1);
queuedHandlers.touchend({touches:[]});assert.equal(queuedMessages.filter(m=>m.type==="score-zoom").at(-1).fontSize,22.5);
const app=fs.readFileSync("App.js","utf8");
const bridge=fs.readFileSync("src/aligned-score-ui.js","utf8");
assert.match(app,/onFontSizeChange:next=>setReaderFont\(clampReaderFont\(next\)\)/);
assert.match(app,/setReaderFont\(v=>clampReaderFont\(v-1\)\)/);
assert.match(app,/setReaderFont\(v=>clampReaderFont\(v\+1\)\)/);
assert.match(bridge,/if\(value\?\.type==="score-zoom"\)/);
assert.match(bridge,/scrollEnabled:false/);
console.log("SHALOM: pinch-to-zoom conserva acordes, scroll y botones del lector.");
