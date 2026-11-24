/* SHALOM Studio: pure musical timeline; no UI, storage or audio side effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.ShalomStudio=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const meters=Object.freeze({"4/4":{beats:4,division:2},"3/4":{beats:3,division:2},"6/8":{beats:2,division:3}});
  const divisions=Object.freeze({"4/4":[1,2,3,4,8],"3/4":[1,2,3,4,8],"6/8":[3,6,12]});
  function resolution(meter,division){const m=meters[meter];if(!m||!divisions[meter].includes(division??m.division))throw new Error("Subdivisión inválida.");return {beats:m.beats,division:division??m.division};}
  const chord=/^[A-G](?:#|b)?(?:maj(?:7|9|11|13)?|m(?:maj7|[0-9]*)?|min(?:[0-9]*)?|sus[24]?|add\d+|dim7?|aug|\+|-|[0-9]*)?(?:\/[A-G](?:#|b)?)?$/;
  const hits=new Set(["down","up","mute","rest"]);
  // Receive parseSong(source, 0) rows; never infer musical time from column position.
  function anchorsFromRows(rows){
    let section="";
    const out=[];
    rows.forEach((row,line)=>{
      if(row.kind==="section"){section=row.text;return}
      const source=row.kind==="chords"?row.chordLine:row.kind==="chordsOnly"?row.text:"";
      for(const m of String(source||"").matchAll(/\S+/g)){
        const symbol=m[0].replace(/^\(([^)]+)\)$/,"$1");
        if(chord.test(symbol))out.push({id:line+":"+m.index,line,column:m.index,chord:symbol,section});
      }
    });
    return out;
  }
  const signature=anchors=>JSON.stringify(anchors.map(a=>[a.id,a.chord,a.section]));
  function requireInt(v,min,max,label){
    if(!Number.isInteger(v)||v<min||v>max)throw new Error(label+" inválido.");
    return v;
  }
  function draft(anchors,meter="4/4",bpm=80,division){
    const m=resolution(meter,division);
    if(!m)throw new Error("Compás inválido.");
    requireInt(bpm,40,240,"Tempo");
    const size=m.beats*m.division;
    return {version:1,meter,bpm,division:m.division,source:signature(anchors),totalSteps:Math.max(size,Math.ceil(anchors.length*m.division/size)*size),changes:anchors.map((a,i)=>({anchorId:a.id,step:i*m.division})),patterns:[{start:0,hits:Array.from({length:size},(_,i)=>({hit:i%m.division===0?"down":"rest",accent:i===0}))}]};
  }
  function compile(anchors,config,transpose=c=>c){
    if(!config||config.version!==1||!meters[config.meter])throw new Error("Configuración incompatible.");
    if(config.source!==signature(anchors))throw new Error("Los acordes cambiaron. Revisa la sincronización.");
    if(!anchors.length)throw new Error("El canto no tiene acordes.");
    const m=resolution(config.meter,config.division),size=m.beats*m.division;
    const bpm=requireInt(config.bpm,40,240,"Tempo");
    const total=requireInt(config.totalSteps,1,100000,"Duración");
    if(total%size)throw new Error("La duración debe completar el compás.");
    if(!Array.isArray(config.changes)||config.changes.length!==anchors.length)throw new Error("Sincronización incompleta.");
    let prior=-1;
    const changes=config.changes.map((c,i)=>{
      const step=requireInt(c.step,0,total-1,"Posición");
      if(c.anchorId!==anchors[i].id||step<=prior)throw new Error("Revisa el orden de los acordes.");
      prior=step;
      return {step,anchor:anchors[i]};
    });
    if(!Array.isArray(config.patterns)||!config.patterns.length)throw new Error("Falta el patrón.");
    prior=-1;
    const patterns=config.patterns.map(p=>{
      const start=requireInt(p.start,0,total-1,"Inicio del patrón");
      if(start<=prior||start%size||!Array.isArray(p.hits)||p.hits.length!==size||p.hits.some(h=>!h||!hits.has(h.hit)||typeof h.accent!=="boolean"))throw new Error("Patrón inválido.");
      prior=start;return p;
    });
    if(patterns[0].start!==0)throw new Error("Falta el patrón inicial.");
    const seconds=60/bpm/m.division;
    let ci=0,pi=0,active=null;
    return Array.from({length:total},(_,step)=>{
      while(ci<changes.length&&changes[ci].step===step)active=changes[ci++].anchor;
      while(pi+1<patterns.length&&patterns[pi+1].start<=step)pi++;
      const hit=patterns[pi].hits[(step-patterns[pi].start)%size];
      return {step,time:step*seconds,duration:seconds,bar:Math.floor(step/size),beat:Math.floor(step%size/m.division),anchorId:active?.id??null,chord:active?transpose(active.chord):null,hit:active?hit.hit:"rest",accent:hit.accent};
    });
  }
  return Object.freeze({meters,divisions,resolution,anchorsFromRows,signature,draft,compile});
});
