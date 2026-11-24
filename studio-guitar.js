/* Offline Web Audio guitar. Procedural string synthesis, no external samples. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomGuitar=api;})(globalThis,function(){
"use strict";
const tuning=[40,45,50,55,59,64],notes={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const pc=n=>(n%12+12)%12;
const pitch=s=>pc(notes[s[0]]+(s[1]==="#"?1:s[1]==="b"?-1:0));
const qualities={"":[0,4,7],m:[0,3,7],min:[0,3,7],"7":[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],min7:[0,3,7,10],sus:[0,5,7],sus2:[0,2,7],sus4:[0,5,7],dim:[0,3,6],dim7:[0,3,6,9],aug:[0,4,8],"+":[0,4,8],"-":[0,3,7],"5":[0,7],"6":[0,4,7,9],m6:[0,3,7,9],add9:[0,4,7,2],"9":[0,4,7,10,2],m9:[0,3,7,10,2],maj9:[0,4,7,11,2],m7b5:[0,3,6,10],mmaj7:[0,3,7,11]};
const common={C:[-1,3,2,0,1,0],D:[-1,-1,0,2,3,2],E:[0,2,2,1,0,0],F:[1,3,3,2,1,1],G:[3,2,0,0,0,3],A:[-1,0,2,2,2,0],Am:[-1,0,2,2,1,0],Em:[0,2,2,0,0,0],Dm:[-1,-1,0,2,3,1],Bm:[-1,2,4,4,3,2],G7:[3,2,0,0,0,1],D7:[-1,-1,0,2,1,2],A7:[-1,0,2,0,2,0],E7:[0,2,0,1,0,0]};
const shapeCache=new Map();
function voicing(symbol){
 if(shapeCache.has(symbol))return shapeCache.get(symbol).slice();
 const m=String(symbol).match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
 if(!m||!Object.hasOwn(qualities,m[2]))throw Error("Acorde sin digitación: "+symbol);
 if(Object.hasOwn(common,symbol))return common[symbol].slice();
 const root=pitch(m[1]),bass=m[3]?pitch(m[3]):root,target=new Set(qualities[m[2]].map(n=>pc(root+n))),allowed=new Set([...target,bass]);
 let best=null,cost=Infinity;
 // Search compact fret windows, require all chord tones and requested bass.
 for(let base=1;base<=12;base++){
   const options=tuning.map(n=>[-1,...[0,base,base+1,base+2,base+3].filter(f=>allowed.has(pc(n+f)))]);
   function walk(i,shape,played,seen,lowest){
     if(i===6){
       if(played<Math.max(3,target.size)||lowest!==bass||[...target].some(n=>!seen.has(n)))return;
       const pressed=shape.filter(f=>f>0),span=pressed.length?Math.max(...pressed)-Math.min(...pressed):0;
       if(span>3||pressed.length>4&&new Set(pressed).size>3)return;
       const score=base*.7+span*2+(6-played)*2+pressed.length*.6+shape.slice(1,-1).filter(f=>f<0).length*2;
       if(score<cost){cost=score;best=shape.slice()}return;
     }
     for(const f of options[i]){const n=f<0?null:pc(tuning[i]+f);if(played===0&&n!==null&&n!==bass)continue;if(n!==null&&!target.has(n)&&played>0)continue;walk(i+1,[...shape,f],played+(n!==null?1:0),n===null?seen:new Set([...seen,n]),played===0&&n!==null?n:lowest)}
   }
   walk(0,[],0,new Set(),null);
 }
 if(!best)throw Error("No hay digitación compatible: "+symbol);
 shapeCache.set(symbol,best);return best.slice();
}
function stringMidi(shape,capo=0){if(!Number.isInteger(capo)||capo<0||capo>12)throw Error("Capo inválido");return shape.map((f,i)=>f<0?null:tuning[i]+f+capo)}
function pluck(sr,midi,tone,muted){
 const freq=440*2**((midi-69)/12),period=Math.max(2,Math.round(sr/freq-.5)),ring=new Float32Array(period),out=new Float32Array(Math.ceil(sr*(muted?.12:2.2)));
 let smooth=0,j=0,prev=0;const softness=tone==="nylon"?.6:.2,decay=muted?.8:tone==="nylon"?.995:.998;
 for(let i=0;i<period;i++){smooth=softness*smooth+(1-softness)*(Math.random()*2-1);ring[i]=smooth}
 for(let i=0;i<out.length;i++){const x=ring[j];ring[j]=(x+ring[(j+1)%period])*.5*decay;j=(j+1)%period;out[i]=(.8*x+.2*prev)*Math.min(1,i/(sr*.0015))*Math.min(1,(out.length-i)/(sr*.035))*Math.exp(-i/(sr*(muted?.06:1.9)));prev=x}
 return out;
}
function createEngine(ctx){
 const gain=ctx.createGain(),comp=ctx.createDynamicsCompressor(),cache=new Map(),voices=new Set(),strings=new Map();
 gain.gain.value=.55;gain.connect(comp);comp.connect(ctx.destination);
 function damp(i,t){const v=strings.get(i);if(!v)return;try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,.009);v.s.stop(t+.045)}catch{}strings.delete(i)}
 function sample(midi,tone,muted){const key=[midi,tone,muted].join(":");if(!cache.has(key)){if(cache.size>=100)cache.delete(cache.keys().next().value);const arr=pluck(ctx.sampleRate,midi,tone,muted),b=ctx.createBuffer(1,arr.length,ctx.sampleRate);b.getChannelData(0).set(arr);cache.set(key,b)}return cache.get(key)}
 function strum(event,t,options={}){
   if(!event.chord||event.hit==="rest")return;
   const shape=voicing(event.chord),pitches=stringMidi(shape,options.capo??0),muted=event.hit==="mute",tone=options.tone==="nylon"?"nylon":"steel";
   let ids=pitches.map((n,i)=>n===null?-1:i).filter(i=>i>=0);if(event.hit==="up")ids=ids.slice(-4).reverse();
   const spacing=Math.min(.012,(event.duration||.25)/Math.max(2,ids.length*2));
   ids.forEach((i,k)=>{const at=t+k*spacing;damp(i,at);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=sample(pitches[i],tone,muted);g.gain.value=(event.accent?.29:.20)*(event.hit==="up"?.8:1)*(1-k*.04);s.connect(g);g.connect(gain);const v={s,g};strings.set(i,v);voices.add(v);s.onended=()=>{voices.delete(v);if(strings.get(i)===v)strings.delete(i);s.disconnect();g.disconnect()};s.start(at)});
 }
 function click(t,accent){const s=ctx.createOscillator(),g=ctx.createGain();s.frequency.value=accent?1100:750;g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.0001,t+.045);s.connect(g);g.connect(gain);const v={s,g};voices.add(v);s.onended=()=>{voices.delete(v);s.disconnect();g.disconnect()};s.start(t);s.stop(t+.05)}
 function stop(){voices.forEach(v=>{try{v.s.stop()}catch{}});strings.clear()}
 return {strum,click,stop,releaseAt(t){for(const i of [...strings.keys()])damp(i,t)},volume(v){gain.gain.setTargetAtTime(Math.max(0,Math.min(1,v))*.7,ctx.currentTime,.025)},dispose(){stop();gain.disconnect();comp.disconnect();cache.clear()}};
}
return Object.freeze({voicing,stringMidi,pluck,createEngine});
});
