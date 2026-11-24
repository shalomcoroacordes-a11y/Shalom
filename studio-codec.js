/* Compact, versioned serialization; one copy of each unique pattern per arrangement. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./studio-core"):root.ShalomStudio);if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomStudioCodec=api;})(globalThis,function(core){
"use strict";
const symbols={down:"d",up:"u",mute:"m",rest:"r"},hits={d:"down",u:"up",m:"mute",r:"rest"};
function ranges(value,total){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>251)throw Error("Fragmentos inválidos.");
 const seen=new Set();
 return value.map(r=>{if(!r||!Number.isInteger(r.index)||r.index<0||r.index>250||seen.has(r.index)||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<=r.start||r.end>total)throw Error("Rango de fragmento inválido.");seen.add(r.index);return {index:r.index,start:r.start,end:r.end}});
}
function encode(anchors,config){
 core.compile(anchors,config);
 const dictionary=[],index=new Map(),sections=[];
 for(const p of config.patterns){
   const key=p.hits.map(h=>h.accent?symbols[h.hit].toUpperCase():symbols[h.hit]).join("");
   if(!index.has(key)){index.set(key,dictionary.length);dictionary.push(key)}
   sections.push([p.start,index.get(key)]);
 }
 const value={v:1,m:config.meter,b:config.bpm,d:core.resolution(config.meter,config.division).division,n:config.totalSteps,s:config.source,c:config.changes.map(c=>c.step),p:dictionary,r:sections};
 if(config.endStep!==undefined&&config.endStep!==config.totalSteps)value.e=config.endStep;
 const h=config.changes.map(c=>c.hold==="ring"?1:c.hold==="mute"?2:0);if(h.some(Boolean))value.h=h;
 const f=ranges(config.fragments,config.totalSteps);if(f.length)value.f=f;
 if(JSON.stringify(value).length>64000)throw Error("Acompañamiento demasiado grande.");
 return value;
}
function decode(anchors,value){
 if(!value||value.v!==1||!Array.isArray(value.c)||!Array.isArray(value.p)||!Array.isArray(value.r)||value.s!==core.signature(anchors)||value.c.length!==anchors.length||JSON.stringify(value).length>64000)throw Error("Acompañamiento incompatible o desactualizado.");
 const m=core.resolution(value.m,value.d),size=m.beats*m.division;
 if(value.p.some(p=>typeof p!=="string"||p.length!==size||!/^[durmDURM]+$/.test(p)))throw Error("Patrón musical inválido.");
 if(value.h!==undefined&&(!Array.isArray(value.h)||value.h.length!==anchors.length||value.h.some(h=>![0,1,2].includes(h))))throw Error("Resonancia inválida.");
 const config={version:1,meter:value.m,bpm:value.b,division:value.d,totalSteps:value.n,...(value.e===undefined?{}:{endStep:value.e}),source:value.s,changes:value.c.map((step,i)=>({anchorId:anchors[i].id,step,...(value.h?.[i]?{hold:value.h[i]===1?"ring":"mute"}:{})})),patterns:value.r.map(pair=>{
   if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[1])||!value.p[pair[1]])throw Error("Referencia de patrón inválida.");
   return {start:pair[0],hits:[...value.p[pair[1]]].map(c=>({hit:hits[c.toLowerCase()],accent:c!==c.toLowerCase()}))};
 })};
 config.fragments=ranges(value.f,config.totalSteps);core.compile(anchors,config);return config;
}
return Object.freeze({encode,decode});
});