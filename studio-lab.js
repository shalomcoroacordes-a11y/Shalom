(() => {
"use strict";
const $=id=>document.getElementById(id), core=window.ShalomStudio, guitar=window.ShalomGuitar;
const arrows={down:"↓",up:"↑",mute:"×",rest:"·"},types=Object.keys(arrows), labKey="shalom.studio.lab.v1";
let storageKey=labKey,embedded=window.parent!==window,mode="lab",baseRevision=null,initialized=!embedded;
let practiceRange=null,sequence=null,sequenceTitle="";
let anchors=[],config=null,ctx=null,engine=null,timer=null,frame=null,playing=false,epoch=0;
const note=s=>{$("status").textContent=s};
function safe(fn){return async()=>{try{await fn()}catch(e){stop();note(e.message||String(e))}}}
function elem(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
function readRows(){
 const score=$("score");score.innerHTML=window.ShalomChords.render($("source").value);
 return Array.from(score.children).map(e=>e.classList.contains("song-section-label")?{kind:"section",text:e.textContent}:e.classList.contains("song-line")?{kind:"chords",chordLine:e.querySelector(".chord-line").textContent}:e.classList.contains("song-standalone-chords")?{kind:"chordsOnly",text:e.textContent}:{kind:"other"});
}
function divisions(){const m=$("meter").value;$("division").replaceChildren(...core.divisions[m].map(d=>new Option(String(d),String(d))));$("division").value=String(core.meters[m].division)}
function size(){const m=core.resolution(config.meter,config.division);return m.beats*m.division}
function generate(){
 stop();anchors=core.anchorsFromRows(readRows());if(!anchors.length)throw Error("No se detectaron acordes.");
 config=core.draft(anchors,$("meter").value,Number($("bpm").value),Number($("division").value));$("barEdit").value=1;renderEditor();note("Borrador generado. Ajusta los tiempos en subdivisiones desde cero.")
}
function renderEditor(){
 const d=core.resolution(config.meter,config.division).division;
 $("anchors").replaceChildren(...anchors.map((a,i)=>{
  const wrap=elem("div");wrap.className="anchor-edit";wrap.append(elem("strong",a.chord+" · "+(a.section||"Inicio")+" · línea "+(a.line+1)));
  const fields=elem("div");fields.className="fields";
  function input(label,value,step,handler){const l=elem("label",label),n=elem("input");n.type="number";n.min=label==="Inicio (subdiv.)"?0:step;n.step=step;n.value=value;n.onchange=safe(()=>handler(Number(n.value)));l.append(n);fields.append(l)}
  function confirmTiming(){return !(config.fragments||[]).length||window.confirm("Este cambio requiere volver a sincronizar los fragmentos. ¿Continuar?")}
  input("Inicio (subdiv.)",config.changes[i].step,1,value=>{if(!confirmTiming())return renderEditor();const next={...config,changes:config.changes.map((x,j)=>j===i?{...x,step:value}:x),fragments:[]};core.compile(anchors,next);config=next;renderEditor();note("Inicio actualizado.")});
  input("Duración (pulsos)",Number((core.durationSteps(config,i)/d).toFixed(6)),1/d,value=>{if(!confirmTiming())return renderEditor();const steps=Math.round(value*d);if(!Number.isFinite(value)||Math.abs(value*d-steps)>.0001)throw Error("Usa una duración compatible con las subdivisiones.");const next=core.setDuration(config,i,steps);core.compile(anchors,next);config=next;renderEditor();note("Duración actualizada. Se movieron los acordes siguientes; revisa los patrones por compás.")});
  const l=elem("label","Comportamiento"),select=elem("select");select.replaceChildren(new Option("Continuar rasgueando","strum"),new Option("Un golpe y resonar","ring"),new Option("Rasguear y apagar al final","mute"));select.value=config.changes[i].hold||"strum";select.onchange=()=>{config.changes[i].hold=select.value;note("Comportamiento actualizado.")};l.append(select);fields.append(l);wrap.append(fields);return wrap;
 }));
 $("total").value=config.totalSteps/size();$("barEdit").max=config.totalSteps/size();renderPattern();renderFragments();
}
function renderFragments(){
 const sections=window.ShalomStudioCollections.sections($("source").value),select=$("fragmentSelect"),prev=select.value;
 select.replaceChildren(...sections.map(s=>new Option((s.index+1)+". "+s.title,String(s.index))));
 if(sections.some(s=>String(s.index)===prev))select.value=prev;
 $("fragmentEditor").hidden=sections.length<2;showFragment();
}
function showFragment(){
 const range=(config?.fragments||[]).find(r=>r.index===Number($("fragmentSelect").value));
 $("fragmentStart").max=config.totalSteps-1;$("fragmentEnd").max=config.totalSteps;
 $("fragmentStart").value=range?.start??0;$("fragmentEnd").value=range?.end??config.totalSteps;
 $("fragmentStatus").textContent=range?"Rango asignado: "+range.start+"–"+range.end+" (fin exclusivo).":"Sin sincronización publicada para esta sección.";
}
$("fragmentSelect").onchange=showFragment;
$("fragmentSave").onclick=safe(()=>{const range={index:Number($("fragmentSelect").value),start:Number($("fragmentStart").value),end:Number($("fragmentEnd").value)};if(!window.ShalomStudioCollections.validRange(range,config.totalSteps))throw Error("Rango de fragmento inválido.");config.fragments=[...(config.fragments||[]).filter(r=>r.index!==range.index),range];showFragment();});
$("fragmentRemove").onclick=safe(()=>{config.fragments=(config.fragments||[]).filter(r=>r.index!==Number($("fragmentSelect").value));showFragment()});
function currentPattern(create=false){
 const bar=Math.max(1,Math.min(config.totalSteps/size(),Number($("barEdit").value)||1));$("barEdit").value=bar;const start=(bar-1)*size();
 let p=config.patterns.find(p=>p.start===start);
 if(!p){const prev=config.patterns.filter(p=>p.start<=start).at(-1);p={start,hits:prev.hits.map(h=>({...h}))};if(create){config.patterns.push(p);config.patterns.sort((a,b)=>a.start-b.start)}}
 return p
}
function renderPattern(){
 const p=currentPattern();const m=core.resolution(config.meter,config.division);
 $("grid").replaceChildren(...p.hits.map((h,i)=>{const wrap=elem("div");wrap.className="pulse";const b=elem("button",arrows[h.hit]);b.setAttribute("aria-label","Golpe "+(i+1));b.onclick=()=>{const p=currentPattern(true);p.hits[i].hit=types[(types.indexOf(p.hits[i].hit)+1)%types.length];renderPattern()};const accent=elem("button",h.accent?"●":"○");accent.setAttribute("aria-label","Acento "+(i+1));accent.setAttribute("aria-pressed",String(h.accent));accent.onclick=()=>{const p=currentPattern(true);p.hits[i].accent=!p.hits[i].accent;renderPattern()};wrap.append(elem("small",(Math.floor(i/m.division)+1)+"."+(i%m.division+1)),b,accent);return wrap}));
}
const noteNames=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],flats={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
function shifted(chord,move){return chord.replace(/(^|\/)([A-G][#b]?)/g,(_,prefix,n)=>prefix+noteNames[(noteNames.indexOf(flats[n]||n)+move+120)%12]);}
function validate(){
 if(!config)throw Error("Prepara el borrador.");
 if(config.meter!==$("meter").value||config.division!==Number($("division").value))throw Error("Cambió la resolución: genera otro borrador.");
 const current=core.anchorsFromRows(readRows());if(core.signature(current)!==config.source)throw Error("Los acordes cambiaron: genera otro borrador.");
 config.bpm=Number($("bpm").value);anchors=current;const timeline=core.compile(anchors,config);for(const c of new Set(anchors.map(a=>a.chord)))guitar.voicing(c);return timeline
}
function diagram(chord){
 if(!chord){$("diagram").replaceChildren();return}
 const shape=guitar.voicing(chord),pressed=shape.filter(f=>f>0),base=Math.max(...pressed)>4?Math.min(...pressed):1;
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 144 125");
 function draw(tag,attrs,text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;svg.append(e)}
 for(let i=0;i<6;i++)draw("line",{x1:22+20*i,x2:22+20*i,y1:19,y2:111,stroke:"#92a699","stroke-width":i<3?1.5:1});
 for(let i=0;i<5;i++)draw("line",{x1:22,x2:122,y1:19+23*i,y2:19+23*i,stroke:"#92a699","stroke-width":i===0&&base===1?4:1});
 if(base>1)draw("text",{x:1,y:34,fill:"#a8d9b5","font-size":10},base+"fr");
 shape.forEach((f,i)=>{const x=22+i*20;if(f>0)draw("circle",{cx:x,cy:19+(f-base+.5)*23,r:6.5,fill:"#a8d9b5"});else if(f===0)draw("circle",{cx:x,cy:8,r:3.5,stroke:"#a8d9b5",fill:"none"});else draw("text",{x,y:12,"text-anchor":"middle",fill:"#a8d9b5"},"×")});$("diagram").replaceChildren(svg)
}
function showStep(timeline,i){
 const e=timeline[i];if(!e)return;const n=size(),start=e.bar*n;
 if($("chord").textContent!==(e.chord||"—")){$("chord").textContent=e.chord||"—";diagram(e.chord)}
 $("where").textContent="Compás "+(e.bar+1)+" · Pulso "+(e.beat+1);
 const upcoming=timeline.find((x,j)=>j>i&&x.anchorId!==e.anchorId&&x.chord);
 $("transportChord").textContent=(e.chord||"—")+" → "+(upcoming?.chord||"Fin");
 $("transportWhere").textContent=$("where").textContent;
 const live=$("live"), pattern=timeline.slice(start,start+n).map(x=>arrows[x.hit]+(x.accent?"′":""));
 const key=pattern.join("|");
 if(live.dataset.pattern!==key){
  live.replaceChildren(...pattern.map(text=>{const b=elem("button",text);b.disabled=true;return b}));
  live.dataset.pattern=key;
 }
 live.querySelector(".active")?.classList.remove("active");
 live.children[i-start]?.classList.add("active");
 const anchor=anchors.find(a=>a.id===e.anchorId),score=$("score");
 const line=anchor?.line===undefined?"":String(anchor.line);
 if(score.dataset.activeLine!==line||(!score.querySelector(".active")&&line!=="")){
  score.querySelector(".active")?.classList.remove("active");
  if(line!=="")score.children[Number(line)]?.classList.add("active");
  score.dataset.activeLine=line;
 }
 if(score.dataset.activeAnchor!==String(e.anchorId)||!score.querySelector(".active-chord")){
  score.querySelector(".active-chord")?.classList.remove("active-chord");
  if(anchor){const row=score.children[anchor.line],target=row?.querySelector(".chord-line")||row;
   if(target){if(!target.dataset.chordTokens){const parts=target.textContent.split(/(\s+)/);target.replaceChildren(...parts.map(p=>{if(!p.trim())return document.createTextNode(p);const span=elem("span",p);span.className="chord-token";return span}));target.dataset.chordTokens="1"}
    const index=anchors.filter(a=>a.line===anchor.line&&a.column<anchor.column).length;target.querySelectorAll(".chord-token")[index]?.classList.add("active-chord");
   }}
  score.dataset.activeAnchor=String(e.anchorId);
 }
}
function stop(){playing=false;epoch++;clearInterval(timer);cancelAnimationFrame(frame);engine?.stop()}
function prepareSequence(){
 const tracks=sequence.map(p=>{
  $("source").value=p.song.lyrics;const a=core.anchorsFromRows(readRows()),cfg=window.ShalomStudioCodec.decode(a,p.arrangement);
  if(p.range&&!(cfg.fragments||[]).some(r=>r.start===p.range.start&&r.end===p.range.end))throw Error("Hay un fragmento sin rango oficial.");
  if(!Number.isInteger(p.shift)||Math.abs(p.shift)>12||!Number.isInteger(p.capo)||p.capo<0||p.capo>12)throw Error("Tono o capo inválido.");
  const timeline=core.compile(a,cfg,chord=>shifted(chord,p.shift));
  for(const chord of new Set(timeline.map(e=>e.chord).filter(Boolean)))guitar.voicing(chord);
  return {...p,anchors:a,config:cfg,timeline};
 });
 return tracks;
}
function displayTrack(track,index){
 anchors=track.anchors;config=track.config;practiceRange=track.range||null;
 $("source").value=track.song.lyrics;
 $("score").innerHTML=window.ShalomChords.render(track.song.lyrics,{transpose:chord=>shifted(chord,track.shift)});
 $("studioTitle").textContent=sequenceTitle;
 $("labNote").textContent=(index+1)+"/"+sequence.length+" · "+track.song.title+(track.range?.title?" · "+track.range.title:"");
 $("shift").value=track.shift;$("capo").value=track.capo;
 $("score").dataset.activeLine="";
}
async function playSequence(){
 stop();const tracks=prepareSequence(),speed=Math.max(25,Math.min(200,Number($("speed").value)||100))/100;
 const schedule=window.ShalomStudioCollections.scheduleTracks(tracks,speed);
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;
 playing=true;engine.volume(Number($("volume").value)/100);
 const start=ctx.currentTime+.16;let cursor=0,activeTrack=-1,lastStep=-1;
 function tick(){
  if(!playing)return;
  try{while(cursor<schedule.events.length&&start+schedule.events[cursor].time<ctx.currentTime+.12){
   const item=schedule.events[cursor++],t=start+item.time,track=tracks[item.track];
   if(item.release){engine.releaseAt(Math.max(t,ctx.currentTime));continue}
   if(t<ctx.currentTime-.03)continue;
   const e=track.timeline[item.step];
   engine.strum({...e,duration:e.duration/speed},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo:track.capo});if(e.release)engine.releaseAt(Math.max(t+e.duration/speed,ctx.currentTime));
   if($("metro").checked&&e.step%track.config.division===0)engine.click(Math.max(t,ctx.currentTime),e.beat===0);
  }}catch(e){stop();note(e.message)}
 }
 function animate(){
  if(!playing)return;
  const elapsed=Math.max(0,ctx.currentTime-start);
  if(elapsed>=schedule.duration){stop();note("Popurrí finalizado.");return}
  let index=schedule.windows.findIndex(w=>elapsed<w.next);
  if(index<0)index=schedule.windows.length-1;
  const w=schedule.windows[index],track=tracks[index];
  if(index!==activeTrack){displayTrack(track,index);activeTrack=index;lastStep=-1}
  if(elapsed>=w.end){$("where").textContent="Transición · "+Math.max(0,w.next-elapsed).toFixed(1)+" s";$("live").querySelector(".active")?.classList.remove("active");}
  else{const i=Math.min(w.last,w.first+Math.floor(Math.max(0,elapsed-w.start)/w.step));if(i!==lastStep){showStep(track.timeline,i);lastStep=i}}
  frame=requestAnimationFrame(animate);
 }
 timer=setInterval(tick,25);tick();animate();note("Popurrí continuo · acompañamientos oficiales.");
}
async function play(){
 if(sequence)return playSequence();
 stop();validate();const move=Number($("shift").value);if(!Number.isInteger(move)||Math.abs(move)>12)throw Error("Transposición inválida.");const timeline=core.compile(anchors,config,c=>shifted(c,move));for(const c of new Set(timeline.map(e=>e.chord).filter(Boolean)))guitar.voicing(c);$("score").innerHTML=window.ShalomChords.render($("source").value,{transpose:c=>shifted(c,move)});const speed=Math.max(25,Math.min(200,Number($("speed").value)||100))/100,capo=Number($("capo").value);if(!Number.isInteger(capo)||capo<0||capo>12)throw Error("Capo inválido");
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible en este dispositivo.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;playing=true;engine.volume(Number($("volume").value)/100);
 const first=practiceRange?.start??0,end=practiceRange?.end??timeline.length;
 if(!window.ShalomStudioCollections.validRange({start:first,end},timeline.length))throw Error("El fragmento no tiene límites válidos.");
 const count=end-first,duration=count*timeline[0].duration/speed,start=ctx.currentTime+.16;let next=0,last=-1;
 const tick=()=>{if(!playing)return;try{while(start+next*timeline[0].duration/speed<ctx.currentTime+.12){if(!$("loop").checked&&next>=count)break;const e=timeline[first+next%count],t=start+next*e.duration/speed;next++;if(t<ctx.currentTime-.03)continue;engine.strum({...e,duration:e.duration/speed},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo});if(e.release)engine.releaseAt(Math.max(t+e.duration/speed,ctx.currentTime));if($("metro").checked&&e.step%config.division===0)engine.click(Math.max(t,ctx.currentTime),e.beat===0)}}catch(e){stop();note(e.message)}};
 function animate(){if(!playing)return;const elapsed=ctx.currentTime-start;if(elapsed>=duration&&!$("loop").checked){stop();note("Práctica finalizada.");return}const i=first+Math.max(0,Math.floor(elapsed/(timeline[0].duration/speed)))%count;if(i!==last){showStep(timeline,i);last=i}frame=requestAnimationFrame(animate)}
 timer=setInterval(tick,25);tick();animate();note("Guitarra sintetizada · reproducción local.")
}
function switchView(edit){if(mode==="public"&&edit)return;stop();if(!edit){const t=validate();showStep(t,practiceRange?.start??0)}$("editor").hidden=!edit;$("player").hidden=edit;$("viewEdit").setAttribute("aria-pressed",String(edit));$("viewPlay").setAttribute("aria-pressed",String(!edit))}
$("meter").onchange=divisions;$("generate").onclick=safe(generate);$("barEdit").onchange=safe(renderPattern);
$("total").onchange=safe(()=>{const n=Number($("total").value);if(!Number.isInteger(n)||n<1||n>512)throw Error("Número de compases inválido.");const total=n*size();if(config.changes.some(c=>c.step>=total)||config.patterns.some(p=>p.start>=total)||(config.fragments||[]).some(r=>r.end>total))throw Error("Hay acordes o patrones fuera de la duración elegida.");config.totalSteps=total;renderEditor()});
$("applyPreset").onclick=safe(()=>{const p=currentPattern(true),m=core.resolution(config.meter,config.division),choice=$("preset").value,pattern=["down","rest","down","up","rest","up","down","up"];if(choice==="worship"&&(config.meter!=="4/4"||m.division!==2))throw Error("Este patrón requiere 4/4 en corcheas.");p.hits=p.hits.map((_,i)=>({hit:choice==="empty"?"rest":choice==="all"?i%2?"up":"down":choice==="worship"?pattern[i]:i%m.division===0?"down":"rest",accent:i===0}));renderPattern()});
$("save").onclick=safe(()=>{validate();if(mode==="public")return;localStorage.setItem(storageKey,JSON.stringify(mode==="admin"?{revision:baseRevision,config}:{source:$("source").value,config}));note("Borrador guardado en este dispositivo; no publicado.")});
$("publish").onclick=safe(()=>{if(mode!=="admin")return;validate();if(!window.confirm("¿Publicar este acompañamiento para todos los músicos?"))return;window.parent.postMessage({type:"shalom-studio-publish",arrangement:window.ShalomStudioCodec.encode(anchors,config)},location.origin);note("Publicando…")});
$("viewEdit").onclick=safe(()=>switchView(true));$("viewPlay").onclick=safe(()=>switchView(false));$("play").onclick=safe(play);$("pause").onclick=()=>{stop();note("Reproducción detenida.")};$("volume").oninput=()=>engine?.volume(Number($("volume").value)/100);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});window.addEventListener("pagehide",()=>{stop();engine?.dispose();ctx?.close().catch(()=>{});ctx=null;engine=null});
if(!embedded){divisions();try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved){$("source").value=saved.source;config=saved.config;$("meter").value=config.meter;divisions();$("division").value=config.division;$("bpm").value=config.bpm;anchors=core.anchorsFromRows(readRows());validate();renderEditor()}else generate()}catch(e){generate();note("No se pudo recuperar el borrador anterior: "+e.message)}
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./offline-sw.js").catch(()=>note("No se pudo preparar la caché offline."));
}else{
 $("studioMain").hidden=true;
 window.addEventListener("message",e=>{if(e.origin!==location.origin||e.source!==window.parent)return;const d=e.data||{};if(d.type==="shalom-studio-result"&&mode==="admin"){note(d.message);return}if(d.type!=="shalom-studio-init"||initialized)return;initialized=true;try{mode=d.mode==="admin"?"admin":"public";practiceRange=mode==="public"?d.range||null:null;sequence=mode==="public"&&Array.isArray(d.sequence)&&d.sequence.length>=2?d.sequence:null;sequenceTitle=String(d.title||"Popurrí");baseRevision=d.song.revision;storageKey=labKey+"."+d.song.id;$("source").value=d.song.lyrics;$("source").readOnly=true;$("sourceLabel").hidden=true;$("labHeader").hidden=true;$("studioTitle").textContent=d.song.title+(practiceRange?.title?" · "+practiceRange.title:"");$("labNote").textContent=mode==="admin"?"Configura los acordes existentes. Los borradores no son públicos.":"Acompañamiento publicado · guitarra sintetizada";$("shift").value=Number(d.shift)||0;$("capo").value=Number(d.capo)||0;anchors=core.anchorsFromRows(readRows());let draft=null;if(mode==="admin"){try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved?.revision===baseRevision&&saved.config?.source===core.signature(anchors))draft=saved.config}catch{}}config=draft||(d.arrangement?window.ShalomStudioCodec.decode(anchors,d.arrangement):null);if(!config){if(mode==="public")throw Error("No hay acompañamiento disponible.");divisions();generate()}else{$("meter").value=config.meter;divisions();$("division").value=String(config.division);$("bpm").value=config.bpm;validate();renderEditor()}if(practiceRange){if(!(config.fragments||[]).some(r=>r.start===practiceRange.start&&r.end===practiceRange.end))throw Error("Fragmento sin sincronización publicada.");$("loop").checked=false;}$("publish").hidden=mode!=="admin";$("studioNav").hidden=mode==="public";$("studioMain").hidden=false;switchView(mode==="admin");if(sequence){$("studioTitle").textContent=sequenceTitle;$("labNote").textContent="Popurrí continuo · "+sequence.length+" fragmentos";$("loop").checked=false;$("loop").closest("label").hidden=true;$("shift").closest("label").hidden=true;$("capo").closest("label").hidden=true;}}catch(err){$("studioMain").hidden=false;$("editor").hidden=true;$("player").hidden=true;$("studioNav").hidden=true;note(err.message)}});
 window.parent.postMessage({type:"shalom-studio-ready"},location.origin);
}
})();