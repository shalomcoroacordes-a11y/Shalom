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
    if(config.patterns.some(p=>p.start>=total)&&!(config.sections?.length&&config.sections.every(p=>p.hits)))throw Error("Quita primero los patrones de los compases que desaparecerían.");
    return {...config,totalSteps:total,endStep,patterns:config.patterns.filter(p=>p.start<total),changes:config.changes.map((c,i)=>({...c,step:c.step+(i>index?delta:0)})),fragments:[]};
  }
  // Cues are descriptive, never audio commands. 24 ticks per pulse fits every supported division.
  const cueActions=Object.freeze({start:"Iniciar",stop:"Terminar",repeat:"Repetir",pause:"Pausa",wait:"Esperar señal",continue:"Continuar",hold:"Mantener acorde",note:"Indicación"});
  const cueAudiences=Object.freeze({all:"Todos",guitar:"Guitarra",keys:"Teclado",percussion:"Percusión",solo:"Solista",choir:"Coro",assembly:"Asamblea",liturgical:"Liturgia",other:"Otro instrumento o voz"});
  function normalizeCues(value,config){
    if(value===undefined)return [];
    if(!Array.isArray(value)||value.length>120)throw Error("Máximo 120 indicaciones por canto.");
    const division=resolution(config.meter,config.division).division;
    const seen=new Set();
    return value.map(c=>{
      if(!c||!Object.hasOwn(cueActions,c.action)||!Object.hasOwn(cueAudiences,c.audience)||typeof c.text!=="string"||c.text.trim().length>160)throw Error("Indicación inválida.");
      const index=requireInt(c.index,0,config.changes.length-1,"Acorde de indicación");
      const ticks=requireInt(c.ticks,0,2400000,"Posición de indicación");
      const offset=ticks*division/24,step=config.changes[index].step+offset;
      if(!Number.isInteger(offset)||offset>=durationSteps(config,index))throw Error("Una indicación quedaría fuera de su acorde o cuadrícula. Reubícala antes de cambiar el tiempo.");
      const text=c.text.trim();if(!text&&c.action==="note")throw Error("Escribe la indicación.");
      const key=JSON.stringify([index,ticks,c.action,c.audience,text]);
      if(seen.has(key))throw Error("Indicación duplicada.");seen.add(key);
      return {index,ticks,action:c.action,audience:c.audience,text,step};
    }).sort((a,b)=>a.step-b.step);
  }
  // Visual lyric cues have a row range, not a guessed musical time.
  function lyricCueAnchor(rows,start,end=start){
    if(!Array.isArray(rows))throw Error("Letra inválida.");
    requireInt(start,0,rows.length-1,"Inicio de selección");requireInt(end,start,rows.length-1,"Fin de selección");
    const text=r=>r?.kind==="chords"?r.lyricLine:r?.kind==="lyric"?r.text:null;
    if(!String(text(rows[start])||"").trim()||!String(text(rows[end])||"").trim())throw Error("Selecciona una frase de la letra.");
    const heading=rows.slice(0,start+1).findLastIndex(r=>r.kind==="section");
    const source=JSON.stringify([heading,heading<0?"":rows[heading].text,rows.slice(start,end+1).map(r=>[r.kind,text(r)??r.text??""])]);
    if(source.length>12000)throw Error("Selecciona un fragmento más corto.");
    return {start,end,source};
  }
  function normalizeLyricCues(value){
    if(value===undefined)return [];
    if(!Array.isArray(value)||value.length>120)throw Error("Máximo 120 indicaciones de letra.");
    const seen=new Set();
    return value.map(c=>{
      if(!c||!Object.hasOwn(cueActions,c.action)||!Object.hasOwn(cueAudiences,c.audience)||typeof c.text!=="string"||c.text.trim().length>160||typeof c.source!=="string"||!c.source.length||c.source.length>12000)throw Error("Indicación de letra inválida.");
      const start=requireInt(c.start,0,100000,"Inicio de selección"),end=requireInt(c.end,start,100000,"Fin de selección"),text=c.text.trim();
      if(!text&&c.action==="note")throw Error("Escribe la indicación.");
      const key=JSON.stringify([start,end,c.source,c.action,c.audience,text]);if(seen.has(key))throw Error("Indicación de letra duplicada.");seen.add(key);
      return {start,end,source:c.source,action:c.action,audience:c.audience,text};
    }).sort((a,b)=>a.end-b.end||a.start-b.start);
  }
  function validLyricCue(rows,c){
    try{return lyricCueAnchor(rows,c.start,c.end).source===c.source;}catch{return false;}
  }
  function setLyricCues(config,rows,value){
    const lyricCues=normalizeLyricCues(value);
    if(lyricCues.some(c=>!validLyricCue(rows,c)))throw Error("La letra cambió. Revisa la selección de la indicación.");
    return {...config,lyricCues};
  }
  function cueText(c){
    return [cueActions[c.action],c.audience==="all"?"":cueAudiences[c.audience],c.text].filter(Boolean).join(" · ");
  }
  function cuePosition(config,group,bar){
    const m=resolution(config.meter,config.division),bounds=groupBounds(config,group);
    const step=bounds.start+(requireInt(bar,1,sectionBarCount(config,group),"Compás de indicación")-1)*m.beats*m.division;
    const index=group.indices.findLast(i=>config.changes[i].step<=step);
    return {index,ticks:(step-config.changes[index].step)*24/m.division};
  }
  function setCues(config,value){
    return {...config,cues:normalizeCues(value,config).map(({step,...cue})=>cue)};
  }
  function cueEntries(timeline){
    const result=[];for(const event of timeline)if(event.cues?.length)result.push({step:event.step,cues:event.cues});return result;
  }
  function cueWindow(entries,step,barSize,range){
    const first=range?.start??0,end=range?.end??Infinity;
    let lo=0,hi=entries.length;while(lo<hi){const mid=(lo+hi)>>1;if(entries[mid].step<=step)lo=mid+1;else hi=mid;}
    const previous=entries[lo-1],next=entries[lo];
    return {current:previous&&previous.step>=first&&step-previous.step<barSize?previous:null,next:next&&next.step>=first&&next.step<end?next:null};
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
    const cuesByStep=new Map();for(const {step,...cue} of normalizeCues(config.cues,config)){if(!cuesByStep.has(step))cuesByStep.set(step,[]);cuesByStep.get(step).push(cue);}
    let ci=0,pi=0,si=-1,li=0,active=null,time=0,part=null,previousTempo=bpm;
    const positioned=parts.map(p=>({...p,start:changes[p.index].step}));

    return Array.from({length:total},(_,step)=>{
      while(ci<changes.length&&changes[ci].step===step)active=changes[ci++];
      while(pi+1<patterns.length&&patterns[pi+1].start<=step)pi++;
      if(step>=musicalEnd)active=null;
      let gap=0;
      if(si+1<positioned.length&&positioned[si+1].start===step){
        previousTempo=part?.bpm??bpm;part=positioned[++si];li=0;
        if(part.transition==="pause"&&step>0){gap=part.pauseMs/1000;time+=gap;}
      }
      const phase=part?step-part.start:0,span=part?Math.min(size,Math.max(1,(positioned[si+1]?.start??musicalEnd)-part.start)):size;
      const tempo=part?.transition==="gradual"&&span>1?previousTempo+(part.bpm-previousTempo)*Math.min(1,phase/(span-1)):part?.bpm??bpm;
      const seconds=60/tempo/m.division;
      while(part?.patterns&&li+1<part.patterns.length&&part.patterns[li+1].start<=phase)li++;const local=part?.patterns?.[li];const hit=local?local.hits[(phase-local.start)%size]:part?.hits?part.hits[phase%size]:patterns[pi].hits[(step-patterns[pi].start)%size];
      const attack=active?.hold==="ring"?(step===active.step?"down":"rest"):hit.hit;
      const event={step,time,duration:seconds,bar:Math.floor(step/size),beat:Math.floor(step%size/m.division),anchorId:active?.anchor.id??null,chord:active?transpose(active.anchor.chord):null,hit:active?attack:"rest",accent:hit.accent,tempo,...(gap?{gapBefore:gap}:{}),...(active?.hold==="mute"&&(changes[ci]?.step??musicalEnd)===step+1?{release:true}:{})};if(cuesByStep.has(step))event.cues=cuesByStep.get(step);time+=seconds;return event;
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
      if(p.patterns!==undefined){if(!Array.isArray(p.patterns)||!p.patterns.length||p.patterns.length>512||p.patterns[0]?.start!==0)throw Error("Patrones locales inválidos.");let prev=-1;for(const r of p.patterns){if(!r||!Number.isInteger(r.start)||r.start<=prev||r.start>100000||!Array.isArray(r.hits)||r.hits.length!==size||r.hits.some(h=>!h||!hits.has(h.hit)||typeof h.accent!=="boolean"))throw Error("Patrón local inválido.");prev=r.start;}}
      return p;
    });
  }
  function sectionConfig(config,index){
    const p=(config.sections||[]).find(p=>p.index===index);
    requireInt(index,0,config.changes.length-1,"Sección");
    return p?{...p,hits:p.hits?.map(h=>({...h}))??null,...(p.patterns?{patterns:p.patterns.map(r=>({start:r.start,hits:r.hits.map(h=>({...h}))}))}:{})}:{index,bpm:config.bpm,transition:"immediate",pauseMs:0,hits:null};
  }
  function setSection(config,index,patch){
    const p={...sectionConfig(config,index),...patch,index};if(Object.prototype.hasOwnProperty.call(patch,"hits")&&!Object.prototype.hasOwnProperty.call(patch,"patterns"))delete p.patterns;if(p.hits)p.hits=p.hits.map(h=>({...h}));if(p.patterns)p.patterns=p.patterns.map(r=>({start:r.start,hits:r.hits.map(h=>({...h}))}));
    const sections=[...(config.sections||[]).filter(s=>s.index!==index),p].sort((a,b)=>a.index-b.index);
    const m=resolution(config.meter,config.division);validateSections({...config,sections},config.changes.length,m.beats*m.division);
    return {...config,sections};
  }
  const cloneHits=h=>h.map(x=>({...x}));
  const rotate=(h,offset)=>Array.from({length:h.length},(_,i)=>({...h[(offset+i)%h.length]}));
  function groupBounds(config,g){
    const index=g.indices[0],last=g.indices.at(-1);
    return {index,start:config.changes[index].step,end:config.changes[last+1]?.step??config.endStep??config.totalSteps};
  }
  // Section navigation uses the same boundaries as the musical timeline.
  function groupRange(config,g){
    const {start,end}=groupBounds(config,g);
    return {start,end,title:g.title};
  }
  function sectionBarCount(config,g){
    const {start,end}=groupBounds(config,g),m=resolution(config.meter,config.division);
    return Math.max(1,Math.ceil((end-start)/(m.beats*m.division)));
  }
  function sectionBarSelection(config,g,value){
    const m=resolution(config.meter,config.division),n=m.beats*m.division;
    const bar=Math.max(1,Math.min(sectionBarCount(config,g),Math.round(Number(value)||1)));
    return {bar,start:groupBounds(config,g).start+(bar-1)*n,hits:sectionBarHits(config,g,bar)};
  }
  function sectionTransitionRange(config,previous,current){
    const p=groupRange(config,previous),c=groupRange(config,current),m=resolution(config.meter,config.division),n=m.beats*m.division;
    return {start:Math.max(p.start,p.end-n),end:Math.min(c.end,c.start+n)};
  }
  // Convert inherited global rhythm to independent, section-relative snapshots,
  // preserving phase and any existing pattern switches inside the section.
  function isolateSections(config,groups){
    let next=config;
    for(const g of groups){
      const {index,start,end}=groupBounds(config,g),p=sectionConfig(config,index);
      if(p.hits){if(!(config.sections||[]).some(s=>s.index===index))next=setSection(next,index,p);continue;}
      const base=config.patterns.filter(r=>r.start<=start).at(-1),initial=rotate(base.hits,start-base.start);
      const local=[{start:0,hits:initial},...config.patterns.filter(r=>r.start>start&&r.start<end).map(r=>({start:r.start-start,hits:cloneHits(r.hits)}))];
      next=setSection(next,index,{...p,hits:initial,...(local.length>1?{patterns:local}:{})});
    }
    return next;
  }
  function sectionHit(config,g,offset){
    const {index,start}=groupBounds(config,g),p=(config.sections||[]).find(p=>p.index===index),local=p?.patterns?.filter(r=>r.start<=offset).at(-1);
    if(local)return {...local.hits[(offset-local.start)%local.hits.length]};
    if(p?.hits)return {...p.hits[offset%p.hits.length]};
    const base=config.patterns.filter(r=>r.start<=start+offset).at(-1);return {...base.hits[(start+offset-base.start)%base.hits.length]};
  }
  function presetHits(config,name){
   const m=resolution(config.meter,config.division),n=m.beats*m.division,w=["down","rest","down","up","rest","down","rest","up"];
   if(name==="worship"&&n!==8)throw Error("Alabanza requiere 4/4 con dos posiciones por pulso.");
   return Array.from({length:n},(_,i)=>({hit:name==="empty"?"rest":name==="ring"?i===0?"down":"rest":name==="all"?i%2?"up":"down":name==="worship"?w[i]:i%m.division===0?"down":"rest",accent:i===0}));
  }
  function decodeRhythmCode(config,code){
    const m=resolution(config.meter,config.division),n=m.beats*m.division,v=code.replace(/\s+/g,"");
    if(v.length!==n||!/^[durmDURM]+$/.test(v))throw Error("El código debe tener "+n+" posiciones (d/u/m/r).");
    const decode={d:"down",u:"up",m:"mute",r:"rest"};
    return [...v].map(x=>({hit:decode[x.toLowerCase()],accent:x!==x.toLowerCase()}));
  }
  function sectionBarHits(config,g,bar){
    const m=resolution(config.meter,config.division),n=m.beats*m.division;return Array.from({length:n},(_,i)=>sectionHit(config,g,(bar-1)*n+i));
  }
  function applySectionPattern(config,groups,g,bar,hits,scope){
    const base=isolateSections(config,groups),{index,start,end}=groupBounds(base,g),m=resolution(base.meter,base.division),n=m.beats*m.division;
    requireInt(bar,1,Math.max(1,Math.ceil((end-start)/n)),"Compás de sección");
    if(!["one","all","forward"].includes(scope)||!Array.isArray(hits)||hits.length!==n)throw Error("Patrón de sección inválido.");
    if(scope==="all")return setSection(base,index,{hits:cloneHits(hits)});
    const p=sectionConfig(base,index),at=(bar-1)*n,until=at+n,old=p.patterns||[{start:0,hits:p.hits}];
    let local=old.filter(r=>r.start<at||(scope==="one"&&r.start>=until));
    if(scope==="one"&&until<end-start&&!local.some(r=>r.start===until)){
      const previous=old.filter(r=>r.start<=until).at(-1);local.push({start:until,hits:rotate(previous.hits,until-previous.start)});
    }
    local.push({start:at,hits:cloneHits(hits)});local.sort((x,y)=>x.start-y.start);
    return setSection(base,index,{hits:cloneHits(local[0].hits),patterns:local});
  }
  function copySection(config,groups,source,target,copyTiming=false){
    if(source===target||!groups.includes(source)||!groups.includes(target))throw Error("Selecciona otra sección.");
    const base=isolateSections(config,groups),from=groupBounds(base,source),to=groupBounds(base,target),p=sectionConfig(base,from.index);
    let next=setSection(base,to.index,{...p,index:to.index,transition:to.index===0?"immediate":p.transition,pauseMs:to.index===0?0:p.pauseMs});
    if(!copyTiming)return next;
    if(source.indices.length!==target.indices.length)throw Error("Las secciones tienen diferente cantidad de acordes. Copia solo el ritmo.");
    const durations=base.changes.map((_,i)=>durationSteps(base,i)),holds=base.changes.map(c=>c.hold||"strum");
    target.indices.forEach((i,k)=>{durations[i]=durationSteps(base,source.indices[k]);holds[i]=base.changes[source.indices[k]].hold||"strum"});
    let step=base.changes[0].step;const changes=base.changes.map((c,i)=>{const out={...c,step,hold:holds[i]};step+=durations[i];return out});
    const m=resolution(base.meter,base.division),bar=m.beats*m.division,total=Math.ceil(step/bar)*bar;requireInt(total,bar,Math.min(100000,512*bar),"Duración total");
    const moved=changes.some((c,i)=>c.step!==base.changes[i].step)||step!==(base.endStep??base.totalSteps);
    return {...next,changes,totalSteps:total,endStep:step,patterns:base.patterns.filter(r=>r.start<total),fragments:moved?[]:base.fragments};
  }
  // Find the actual chord, including sustained chords that entered before this bar.
  function barContext(anchors,config,g,bar,position=0){
    const b=groupBounds(config,g),m=resolution(config.meter,config.division),n=m.beats*m.division;
    requireInt(bar,1,Math.ceil((b.end-b.start)/n),"Compás de sección");
    requireInt(position,0,n-1,"Posición");
    const start=b.start+(bar-1)*n,end=Math.min(start+n,b.end),step=start+position;
    const indices=g.indices.filter(i=>config.changes[i].step<end&&(config.changes[i+1]?.step??config.endStep??config.totalSteps)>start);
    const active=step<end?indices.find(i=>config.changes[i].step<=step&&(config.changes[i+1]?.step??config.endStep??config.totalSteps)>step):undefined;
    return {start,end,indices,active,continuing:indices.length>0&&config.changes[indices[0]].step<start,lines:[...new Set(indices.map(i=>anchors[i].line))]};
  }
  // Convert subdivisions without shifting an existing musical event.
  // A less precise grid is allowed only when every authored event fits exactly.
  function redivide(config,division){
    const old=resolution(config.meter,config.division),next=resolution(config.meter,division);
    if(old.division===next.division)return config;
    const scale=v=>{const x=v*next.division/old.division;if(!Number.isInteger(x))throw Error("La nueva cuadrícula no puede representar todos los tiempos o golpes existentes. Usa una subdivisión compatible.");return x;};
    const n=next.beats*next.division;
    const pattern=hits=>{
      const out=Array.from({length:n},()=>({hit:"rest",accent:false}));
      hits.forEach((h,i)=>{if(h.hit!=="rest"||h.accent){const at=scale(i);out[at]={...h};}});return out;
    };
    const convert=p=>({start:scale(p.start),hits:pattern(p.hits)});
    const totalSteps=scale(config.totalSteps);
    requireInt(totalSteps,n,Math.min(100000,512*n),"Duración total");
    return {...config,division:next.division,totalSteps,...(config.endStep===undefined?{}:{endStep:scale(config.endStep)}),
      changes:config.changes.map(c=>({...c,step:scale(c.step)})),patterns:config.patterns.map(convert),
      ...(config.sections?{sections:config.sections.map(p=>({...p,hits:p.hits?pattern(p.hits):null,...(p.patterns?{patterns:p.patterns.map(convert)}:{})}))}:{}),
      ...(config.fragments?{fragments:config.fragments.map(f=>({...f,start:scale(f.start),end:scale(f.end)}))}:{})};
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
  // Pure playback clock: the UI owns timers, audio scheduling and rendering.
  function playbackSpeed(value){
    return Math.max(25,Math.min(200,Number(value)||100))/100;
  }
  function playbackEvent(timeline,first,end,clock,speed,start,next){
    const count=end-first,cycle=Math.floor(next/count),i=next%count,e=timeline[first+i];
    return {event:e,time:start+cycle*clock.duration+clock.offsets[i],gap:i===0?0:(e.gapBefore||0)/speed};
  }
  function playbackFrame(timeline,first,end,clock,speed,elapsed,loop){
    if(elapsed>=clock.duration&&!loop)return {finished:true};
    const local=elapsed%clock.duration,index=first+clockIndex(clock.offsets,local),e=timeline[index];
    return {finished:false,index,paused:local>=clock.offsets[index-first]+e.duration/speed&&index+1<end};
  }
  function sequenceFrame(schedule,elapsed){
    if(elapsed>=schedule.duration)return {finished:true};
    let index=schedule.windows.findIndex(w=>elapsed<w.next);
    if(index<0)index=schedule.windows.length-1;
    const w=schedule.windows[index];
    if(elapsed>=w.end)return {finished:false,track:index,transition:true,remaining:Math.max(0,w.next-elapsed)};
    return {finished:false,track:index,transition:false,step:Math.min(w.last,w.first+clockIndex(w.offsets,Math.max(0,elapsed-w.start)))};
  }
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
  // Review data is derived without DOM or mutation.
  function reviewSummary(anchors,config,groups){
    const timeline=compile(anchors,config);
    const seconds=Math.round(clockRange(timeline,0,config.endStep??config.totalSteps).duration);
    return [
      ["Velocidad",(config.sections||[]).length?"Por sección":config.bpm+" BPM"],
      ["Compás",config.meter],
      ["Acordes",anchors.length],
      ["Secciones",groups.length],
      ["Duración",Math.floor(seconds/60)+" min "+seconds%60+" s"],
      ["Patrones",config.patterns.length+(config.sections||[]).reduce((n,p)=>n+(p.patterns?.length||0),0)]
    ];
  }
  // Resolve explicit preview range first, then the saved practice range.
  function playbackRange(timeline,config,range,practiceRange,speed){
    const first=range?.start??practiceRange?.start??0,end=range?.end??practiceRange?.end??config.endStep??timeline.length;
    return {first,end,clock:clockRange(timeline,first,end,speed)};
  }
  // Live edits affect only the selected section, never an authored ringing chord.
  function liveSectionEvent(event,anchors,config,group){
    const r=groupRange(config,group);
    sectionConfig(config,group.indices[0]);
    if(event.step>=r.start&&event.step<r.end&&event.chord){
      const anchor=anchors.findIndex(a=>a.id===event.anchorId);
      if(config.changes[anchor]?.hold!=="ring")return {...event,...sectionHit(config,group,event.step-r.start)};
    }
    return event;
  }
  function sequenceTrackTimeline(anchors,config,track,transpose){
    if(track.range&&!(config.fragments||[]).some(r=>r.start===track.range.start&&r.end===track.range.end))throw Error("Hay un fragmento sin rango oficial.");
    if(!Number.isInteger(track.shift)||Math.abs(track.shift)>12||!Number.isInteger(track.capo)||track.capo<0||track.capo>12)throw Error("Tono o capo inválido.");
    return compile(anchors,config,chord=>transpose(chord,track.shift));
  }
  // Pure editing rules for web and native Studio.
  function clampTempo(value){return Math.max(40,Math.min(240,Math.round(value)));}
  function pauseMilliseconds(seconds){return Math.max(0,Math.min(10000,Math.round(Number(seconds)*1000)||0));}
  function identifyPreset(config,sectionHits,hits){
    if(!sectionHits)return "base";
    return ["basic","all","worship","ring","empty"]
      .filter(name=>name!=="worship"||config.meter==="4/4"&&config.division===2)
      .find(name=>JSON.stringify(presetHits(config,name))===JSON.stringify(hits))||"custom";
  }
  function editHit(hits,index,value,toggleAccent){
    return hits.map((h,i)=>i===index?{...h,...(value?{hit:value}:{}),...(toggleAccent?{accent:!h.accent}:{})}:{...h});
  }
  function cycleHit(hits,index){
    const types=["down","up","mute","rest"];
    return hits.map((h,i)=>i===index?{...h,hit:types[(types.indexOf(h.hit)+1)%types.length]}:{...h});
  }
  // Duration and synchronization rules. The UI owns confirmation and undo.
  function durationLabel(config,n){
    const m=resolution(config.meter,config.division),p=n/m.division;
    return Number(p.toFixed(3))+" "+(p===1?"pulso":"pulsos")+(p===m.beats?" · 1 compás":p>m.beats&&p%m.beats===0?" · "+p/m.beats+" compases":"");
  }
  function durationChoices(config){
    const m=resolution(config.meter,config.division),size=m.beats*m.division;
    return [["Medio pulso",m.division/2],["1 pulso",m.division],["2 pulsos",m.division*2],["1 compás",size],["2 compases",size*2],["4 compases",size*4]];
  }
  function pulsesToSteps(config,input){
    const m=resolution(config.meter,config.division),value=Number(input),n=Math.round(value*m.division);
    if(!Number.isFinite(value)||Math.abs(value*m.division-n)>.0001)throw Error("Usa una duración compatible con el ritmo.");
    return n;
  }
  function setAnchorHold(config,index,value){
    return {...config,changes:config.changes.map((c,i)=>i===index?{...c,hold:value}:c)};
  }
  function moveAnchor(config,groups,index,step){
    const group=groups.find(g=>g.indices.includes(index));
    if(index===group.indices[0])throw Error("La entrada de la sección se ajusta con la transición o duración anterior.");
    return {...isolateSections(config,groups),changes:config.changes.map((x,i)=>i===index?{...x,step}:x),fragments:[]};
  }
  function anchorRange(anchors,config,index){
    return {start:config.changes[index].step,end:config.changes[index+1]?.step??config.endStep??config.totalSteps,title:anchors[index].chord};
  }
  function suggestFragmentRange(config,groups,section){
    const matches=groups.filter(g=>g.title===section?.title);
    if(matches.length!==1)throw Error("Sección repetida o sin acordes. Ajusta el rango manualmente.");
    return groupRange(config,matches[0]);
  }
  // Undo snapshots may restore a full arrangement only if no subsequent edit
  // changed its canonical fingerprint. Invalid fingerprints never authorize undo.
  function undoSnapshot(config,selection={}){
    return {...selection,config:JSON.parse(JSON.stringify(config)),after:null};
  }
  function canUndo(snapshot,fingerprint){
    return !!snapshot&&typeof fingerprint==="string"&&fingerprint.length>0&&snapshot.after===fingerprint;
  }
  // For each step, find the next sounding chord belonging to a different anchor.
  // A reverse pass retains the nearest two candidates with distinct anchor IDs.
  function upcomingChordIndices(timeline){
    const result=new Int32Array(timeline.length);
    let nearest=-1,other=-1;
    for(let i=timeline.length-1;i>=0;i--){
      const event=timeline[i];
      result[i]=nearest>=0&&timeline[nearest].anchorId!==event.anchorId?nearest:other;
      if(event.chord){
        if(nearest>=0&&timeline[nearest].anchorId!==event.anchorId)other=nearest;
        nearest=i;
      }
    }
    return result;
  }
  // Canonical anchors are ordered by lyric row and column. Preserve first ID
  // lookup and the exact number of preceding columns, even for unsorted fixtures.
  function indexAnchors(anchors){
    const byLine=new Map(),index=new Map(),ordinals=new Array(anchors.length);
    anchors.forEach((anchor,i)=>{
      if(!byLine.has(anchor.line))byLine.set(anchor.line,[]);
      byLine.get(anchor.line).push(i);
    });
    for(const indices of byLine.values()){
      indices.sort((a,b)=>anchors[a].column-anchors[b].column);
      let rank=0;
      indices.forEach((i,j)=>{
        if(j&&anchors[i].column!==anchors[indices[j-1]].column)rank=j;
        ordinals[i]=rank;
      });
    }
    anchors.forEach((anchor,i)=>{
      if(!index.has(anchor.id))index.set(anchor.id,{anchor,index:i,ordinal:ordinals[i]});
    });
    return index;
  }
  return Object.freeze({cueActions,cueAudiences,lyricCueAnchor,normalizeLyricCues,validLyricCue,setLyricCues,cueText,normalizeCues,cuePosition,setCues,cueEntries,cueWindow,indexAnchors,upcomingChordIndices,undoSnapshot,canUndo,durationLabel,durationChoices,pulsesToSteps,setAnchorHold,moveAnchor,anchorRange,suggestFragmentRange,clampTempo,pauseMilliseconds,identifyPreset,editHit,cycleHit,playbackRange,liveSectionEvent,sequenceTrackTimeline,reviewSummary,meters,divisions,resolution,anchorsFromRows,signature,draft,compile,durationSteps,setDuration,groupAnchors,applyPattern,sectionConfig,setSection,clockRange,clockIndex,playbackSpeed,playbackEvent,playbackFrame,sequenceFrame,groupBounds,groupRange,sectionBarCount,sectionBarSelection,sectionTransitionRange,isolateSections,sectionHit,sectionBarHits,presetHits,decodeRhythmCode,applySectionPattern,copySection,barContext,redivide});
});
