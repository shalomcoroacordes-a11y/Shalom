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
 if(config.sections?.length)value.q=config.sections.map(p=>[p.index,p.bpm,p.hits?p.hits.map(h=>h.accent?symbols[h.hit].toUpperCase():symbols[h.hit]).join(""):null,p.transition,p.pauseMs]);
 const local=(config.sections||[]).filter(p=>p.patterns?.length).map(p=>[p.index,p.patterns.map(r=>[r.start,r.hits.map(h=>h.accent?symbols[h.hit].toUpperCase():symbols[h.hit]).join("")])]);if(local.length)value.z=local;
 const h=config.changes.map(c=>c.hold==="ring"?1:c.hold==="mute"?2:0);if(h.some(Boolean))value.h=h;
 const f=ranges(config.fragments,config.totalSteps);if(f.length)value.f=f;
 const cues=core.normalizeCues(config.cues,config);if(cues.length)value.i=cues.map(c=>[c.index,c.ticks,c.action,c.audience,c.text]);
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
 if(value.q!==undefined){
   if(!Array.isArray(value.q))throw Error("Secciones musicales inválidas.");
   config.sections=value.q.map(p=>{
     if(!Array.isArray(p)||p.length!==5||(p[2]!==null&&(typeof p[2]!=="string"||p[2].length!==size||!/^[durmDURM]+$/.test(p[2]))))throw Error("Rasgueo de sección inválido.");
     return {index:p[0],bpm:p[1],hits:p[2]===null?null:[...p[2]].map(c=>({hit:hits[c.toLowerCase()],accent:c!==c.toLowerCase()})),transition:p[3],pauseMs:p[4]};
   });
 }
 if(value.z!==undefined){
   if(!Array.isArray(value.z)||!config.sections)throw Error("Patrones locales inválidos.");
   const seen=new Set();for(const pair of value.z){const p=config.sections.find(s=>s.index===pair?.[0]);if(!Array.isArray(pair)||pair.length!==2||!p||seen.has(p.index)||!Array.isArray(pair[1]))throw Error("Referencia local inválida.");seen.add(p.index);p.patterns=pair[1].map(r=>{if(!Array.isArray(r)||r.length!==2||typeof r[1]!=="string"||r[1].length!==size||!/^[durmDURM]+$/.test(r[1]))throw Error("Patrón local inválido.");return {start:r[0],hits:[...r[1]].map(c=>({hit:hits[c.toLowerCase()],accent:c!==c.toLowerCase()}))}});}
 }
 config.fragments=ranges(value.f,config.totalSteps);
 if(value.i!==undefined){if(!Array.isArray(value.i)||value.i.some(c=>!Array.isArray(c)||c.length!==5))throw Error("Indicaciones inválidas.");config.cues=core.setCues(config,value.i.map(([index,ticks,action,audience,text])=>({index,ticks,action,audience,text}))).cues;}
 core.compile(anchors,config);return config;
}
return Object.freeze({encode,decode});
});