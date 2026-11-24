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
  const holds=["strum","ring","mute"];
  function durationSteps(config,index){return (config.changes[index+1]?.step??config.endStep??config.totalSteps)-config.changes[index].step}
  function setDuration(config,index,steps){
    requireInt(index,0,config.changes.length-1,"Acorde");requireInt(steps,1,100000,"Duración");
    const m=resolution(config.meter,config.division),bar=m.beats*m.division,delta=steps-durationSteps(config,index);
    if(!delta)return config;
    const endStep=(config.endStep??config.totalSteps)+delta,total=Math.ceil(endStep/bar)*bar;
    requireInt(total,bar,Math.min(100000,512*bar),"Duración total");
    if(config.patterns.some(p=>p.start>=total))throw Error("Quita primero los patrones de los compases que desaparecerían.");
    return {...config,totalSteps:total,endStep,changes:config.changes.map((c,i)=>({...c,step:c.step+(i>index?delta:0)})),fragments:[]};
  }
  function compile(anchors,config,transpose=c=>c){
    if(!config||config.version!==1||!meters[config.meter])throw new Error("Configuración incompatible.");
    if(config.source!==signature(anchors))throw new Error("Los acordes cambiaron. Revisa la sincronización.");
    if(!anchors.length)throw new Error("El canto no tiene acordes.");
    const m=resolution(config.meter,config.division),size=m.beats*m.division;
    const bpm=requireInt(config.bpm,40,240,"Tempo");
    const total=requireInt(config.totalSteps,1,100000,"Duración");
    if(total%size)throw new Error("La duración debe completar el compás.");
    const musicalEnd=requireInt(config.endStep??total,1,total,"Fin musical");
    if(!Array.isArray(config.changes)||config.changes.length!==anchors.length)throw new Error("Sincronización incompleta.");
    let prior=-1;
    const changes=config.changes.map((c,i)=>{
      const step=requireInt(c.step,0,musicalEnd-1,"Posición");
      if(c.anchorId!==anchors[i].id||step<=prior)throw new Error("Revisa el orden de los acordes.");
      prior=step;
      const hold=c.hold??"strum";if(!holds.includes(hold))throw Error("Resonancia inválida.");return {step,anchor:anchors[i],hold};
    });
    if(!Array.isArray(config.patterns)||!config.patterns.length)throw new Error("Falta el patrón.");
    prior=-1;
    const patterns=config.patterns.map(p=>{
      const start=requireInt(p.start,0,total-1,"Inicio del patrón");
      if(start<=prior||start%size||!Array.isArray(p.hits)||p.hits.length!==size||p.hits.some(h=>!h||!hits.has(h.hit)||typeof h.accent!=="boolean"))throw new Error("Patrón inválido.");
      prior=start;return p;
    });
    if(patterns[0].start!==0)throw new Error("Falta el patrón inicial.");
    const parts=validateSections(config,anchors.length,size);
    let ci=0,pi=0,si=-1,active=null,time=0,part=null,previousTempo=bpm;
    const positioned=parts.map(p=>({...p,start:changes[p.index].step}));

    return Array.from({length:total},(_,step)=>{
      while(ci<changes.length&&changes[ci].step===step)active=changes[ci++];
      while(pi+1<patterns.length&&patterns[pi+1].start<=step)pi++;
      if(step>=musicalEnd)active=null;
      let gap=0;
      if(si+1<positioned.length&&positioned[si+1].start===step){
        previousTempo=part?.bpm??bpm;part=positioned[++si];
        if(part.transition==="pause"&&step>0){gap=part.pauseMs/1000;time+=gap;}
      }
      const phase=part?step-part.start:0,span=part?Math.min(size,Math.max(1,(positioned[si+1]?.start??musicalEnd)-part.start)):size;
      const tempo=part?.transition==="gradual"&&span>1?previousTempo+(part.bpm-previousTempo)*Math.min(1,phase/(span-1)):part?.bpm??bpm;
      const seconds=60/tempo/m.division;
      const hit=part?.hits?part.hits[phase%size]:patterns[pi].hits[(step-patterns[pi].start)%size];
      const attack=active?.hold==="ring"?(step===active.step?"down":"rest"):hit.hit;
      const event={step,time,duration:seconds,bar:Math.floor(step/size),beat:Math.floor(step%size/m.division),anchorId:active?.anchor.id??null,chord:active?transpose(active.anchor.chord):null,hit:active?attack:"rest",accent:hit.accent,tempo,...(gap?{gapBefore:gap}:{}),...(active?.hold==="mute"&&(changes[ci]?.step??musicalEnd)===step+1?{release:true}:{})};time+=seconds;return event;
    });
  }
  function validateSections(config,length,size){
    const parts=config.sections??[];
    if(!Array.isArray(parts)||parts.length>length)throw Error("Secciones musicales inválidas.");
    let last=-1;
    return parts.map(p=>{
      if(!p||!Number.isInteger(p.index)||p.index<0||p.index>=length||p.index<=last)throw Error("Orden de secciones inválido.");
      last=p.index;requireInt(p.bpm,40,240,"Tempo de sección");
      if(!["immediate","gradual","pause"].includes(p.transition)||!Number.isInteger(p.pauseMs)||p.pauseMs<0||p.pauseMs>10000)throw Error("Transición inválida.");
      if(p.hits!=null&&(!Array.isArray(p.hits)||p.hits.length!==size||p.hits.some(h=>!h||!hits.has(h.hit)||typeof h.accent!=="boolean")))throw Error("Rasgueo de sección inválido.");
      return p;
    });
  }
  function sectionConfig(config,index){
    const p=(config.sections||[]).find(p=>p.index===index);
    requireInt(index,0,config.changes.length-1,"Sección");
    return p?{...p,hits:p.hits?.map(h=>({...h}))??null}:{index,bpm:config.bpm,transition:"immediate",pauseMs:0,hits:null};
  }
  function setSection(config,index,patch){
    const p={...sectionConfig(config,index),...patch,index};if(p.hits)p.hits=p.hits.map(h=>({...h}));
    const sections=[...(config.sections||[]).filter(s=>s.index!==index),p].sort((a,b)=>a.index-b.index);
    const m=resolution(config.meter,config.division);validateSections({...config,sections},config.changes.length,m.beats*m.division);
    return {...config,sections};
  }
  // Exact per-event clock: variable tempos and silent transitions, with compatibility for old fixtures.
  function clockRange(timeline,first,end,speed=1){
    if(!Number.isFinite(speed)||speed<=0||!Number.isInteger(first)||!Number.isInteger(end)||first<0||end<=first||end>timeline.length)throw Error("Rango musical inválido.");
    let duration=0;const offsets=[],releases=[];
    for(let i=first;i<end;i++){
      const e=timeline[i],gap=i===first?0:(e.gapBefore||0)/speed;
      if(gap){releases.push({time:duration,step:i});duration+=gap;}
      offsets.push(duration);duration+=e.duration/speed;
    }
    return {offsets,releases,duration};
  }
  function clockIndex(offsets,elapsed){let lo=0,hi=offsets.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(offsets[mid]<=elapsed)lo=mid;else hi=mid;}return lo;}
  function groupAnchors(anchors,rows){
    const groups=[];let heading=-1,title="Inicio",cursor=0;
    for(let i=0;i<rows.length;i++){
      if(rows[i].kind==="section"){heading=i;title=rows[i].text||"Sección"}
      while(cursor<anchors.length&&anchors[cursor].line===i){
        if(!groups.length||groups.at(-1).heading!==heading)groups.push({heading,title,indices:[]});
        groups.at(-1).indices.push(cursor++);
      }
    }
    return groups;
  }
  function applyPattern(config,bar,hits,scope){
    const m=resolution(config.meter,config.division),n=m.beats*m.division;
    requireInt(bar,1,config.totalSteps/n,"Compás");
    if(!["one","all","forward"].includes(scope)||!Array.isArray(hits)||hits.length!==n)throw Error("Patrón inválido.");
    const start=(bar-1)*n,copy=p=>p.map(h=>({...h})),previous=config.patterns.filter(p=>p.start<=start).at(-1);
    if(scope==="all")return {...config,patterns:[{start:0,hits:copy(hits)}]};
    let patterns=config.patterns.filter(p=>p.start!==start&&(scope!=="forward"||p.start<start)).map(p=>({...p,hits:copy(p.hits)}));
    if(scope==="one"&&start+n<config.totalSteps&&!patterns.some(p=>p.start===start+n))patterns.push({start:start+n,hits:copy(previous.hits)});
    patterns.push({start,hits:copy(hits)});patterns.sort((a,b)=>a.start-b.start);return {...config,patterns};
  }
  return Object.freeze({meters,divisions,resolution,anchorsFromRows,signature,draft,compile,durationSteps,setDuration,groupAnchors,applyPattern,sectionConfig,setSection,clockRange,clockIndex});
});
