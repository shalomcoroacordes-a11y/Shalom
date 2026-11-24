(() => {
"use strict";
const $=id=>document.getElementById(id), core=window.ShalomStudio, guitar=window.ShalomGuitar;
const arrows={down:"↓",up:"↑",mute:"×",rest:"·"},types=Object.keys(arrows), labKey="shalom.studio.lab.v1";
let storageKey=labKey,embedded=window.parent!==window,mode="lab",baseRevision=null,initialized=!embedded;
let practiceRange=null,sequence=null,sequenceTitle="";
let stage=0,anchorIndex=0,groups=[],selectedHit=0,taps=[],timingUndo=null,editorScroll=0;
let audition=false,auditionPattern=null,baseline=null,pendingSave=null,backPending=false;
let openSection=0,inlineSection=null;
const fingerprint=()=>config?JSON.stringify(config):null;
let anchors=[],config=null,ctx=null,engine=null,timer=null,frame=null,playing=false,epoch=0;
const note=s=>{$("status").textContent=s;$("editorStatus").textContent=s};
function safe(fn){return async()=>{try{await fn()}catch(e){stop();note(e.message||String(e))}}}
function elem(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
function readRows(){
 const score=$("score");score.innerHTML=window.ShalomChords.render($("source").value);
 return Array.from(score.children).map(e=>e.classList.contains("song-section-label")?{kind:"section",text:e.textContent}:e.classList.contains("song-line")?{kind:"chords",chordLine:e.querySelector(".chord-line").textContent}:e.classList.contains("song-standalone-chords")?{kind:"chordsOnly",text:e.textContent}:{kind:"other"});
}
function divisions(){const m=$("meter").value;$("division").replaceChildren(...core.divisions[m].map(d=>new Option(d+" por pulso"+(d===core.meters[m].division?" · recomendado":""),String(d))));$("division").value=String(core.meters[m].division)}
function size(){const m=core.resolution(config.meter,config.division);return m.beats*m.division}
function generate(){
 stop();anchors=core.anchorsFromRows(readRows());if(!anchors.length)throw Error("No se detectaron acordes.");
 config=core.draft(anchors,$("meter").value,Number($("bpm").value),Number($("division").value));$("barEdit").value=1;anchorIndex=0;timingUndo=null;renderEditor();note("Borrador inicial preparado. Ajusta los acordes en el paso 2.")
}
function durationText(n){const m=core.resolution(config.meter,config.division),p=n/m.division;return Number(p.toFixed(3))+" "+(p===1?"pulso":"pulsos")+(p===m.beats?" · 1 compás":p>m.beats&&p%m.beats===0?" · "+p/m.beats+" compases":"")}
function confirmTiming(){return !(config.fragments||[]).length||window.confirm("Este cambio requiere volver a sincronizar fragmentos. ¿Continuar?")}
function changeTiming(next){core.compile(anchors,next);timingUndo=JSON.parse(JSON.stringify(config));config=next;renderEditor();note("Tiempo actualizado. Revisa los patrones por compás.")}
function chooseAnchor(i){anchorIndex=Math.max(0,Math.min(anchors.length-1,i));renderEditor()}
function renderEditor(){
 if(!config||!anchors.length)return;
 groups=core.groupAnchors(anchors,readRows());anchorIndex=Math.max(0,Math.min(anchors.length-1,anchorIndex));
 const gi=Math.max(0,groups.findIndex(g=>g.indices.includes(anchorIndex))),g=groups[gi],a=anchors[anchorIndex],m=core.resolution(config.meter,config.division),duration=core.durationSteps(config,anchorIndex),pos=config.changes[anchorIndex].step;
 $("anchorSection").replaceChildren(...groups.map((x,i)=>new Option((i+1)+". "+x.title,String(i))));$("anchorSection").value=String(gi);$("sectionInfo").textContent=g.indices.length+" acordes · sección "+(gi+1)+" de "+groups.length;
 $("anchorRail").replaceChildren(...g.indices.map(i=>{const b=elem("button",anchors[i].chord);b.setAttribute("aria-pressed",String(i===anchorIndex));b.onclick=()=>chooseAnchor(i);b.append(elem("small",durationText(core.durationSteps(config,i)).split(" · ")[0]));return b}));
 const row=$("score").children[a.line],lyric=row?.querySelector(".lyric-line")?.textContent||"Parte instrumental",wrap=elem("article");wrap.className="guide-panel selected-anchor";
 wrap.append(elem("small","ACORDE "+(anchorIndex+1)+" DE "+anchors.length),elem("h3",a.chord));const context=elem("div");context.className="anchor-lyric";if(row){const clone=row.cloneNode(true),chords=clone.querySelector(".chord-line")||clone,ord=anchors.filter(x=>x.line===a.line&&x.column<a.column).length;let j=0;chords.replaceChildren(...chords.textContent.split(/(\s+)/).map(t=>{if(!t.trim())return document.createTextNode(t);const span=elem("span",t);if(j++===ord)span.className="active-chord";return span}));context.append(clone)}else context.textContent=lyric.trim();wrap.append(context);wrap.append(elem("small","Entra en el compás "+(Math.floor(pos/size())+1)+", pulso "+(Math.floor(pos%size()/m.division)+1)+(pos%m.division?" · entre pulsos":"")),elem("h4","¿Cuánto tiempo se mantiene?"));
 function setSteps(n){if(!confirmTiming())return renderEditor();changeTiming(core.setDuration(config,anchorIndex,n))}
 const quick=elem("div");quick.className="duration-choices";
 for(const [title,n] of [["Medio pulso",m.division/2],["1 pulso",m.division],["2 pulsos",m.division*2],["1 compás",size()],["2 compases",size()*2],["4 compases",size()*4]]){if(!Number.isInteger(n)||n<1)continue;const b=elem("button",title);b.setAttribute("aria-pressed",String(duration===n));b.onclick=safe(()=>setSteps(n));quick.append(b)}wrap.append(quick);
 const counter=elem("div");counter.className="duration-counter";const minus=elem("button","−"),plus=elem("button","+");minus.disabled=duration<=1;minus.onclick=safe(()=>setSteps(Math.max(1,duration-m.division)));plus.onclick=safe(()=>setSteps(duration+m.division));counter.append(minus,elem("strong",durationText(duration)),plus);wrap.append(counter);
 const detail=elem("details");detail.className="advanced";detail.append(elem("summary","Duración personalizada"));const input=elem("input");input.type="number";input.step="any";input.min=1/m.division;input.value=Number((duration/m.division).toFixed(6));input.onchange=safe(()=>{const value=Number(input.value),n=Math.round(value*m.division);if(!Number.isFinite(value)||Math.abs(value*m.division-n)>.0001)throw Error("Usa una duración compatible con el ritmo.");setSteps(n)});const custom=elem("label","Pulsos exactos");custom.append(input);detail.append(custom);wrap.append(detail);
 const behavior=elem("label","¿Cómo se toca?"),select=elem("select");select.replaceChildren(new Option("Seguir rasgueando","strum"),new Option("Tocar una vez y dejar sonar","ring"),new Option("Rasguear y apagar al final","mute"));select.value=config.changes[anchorIndex].hold||"strum";select.onchange=()=>{config.changes[anchorIndex].hold=select.value;note("Comportamiento actualizado.")};behavior.append(select);wrap.append(behavior);$("anchors").replaceChildren(wrap);
 const rail=$("anchorRail"),chosen=rail.querySelector("[aria-pressed=true]");if(chosen)rail.scrollLeft=Math.max(0,chosen.offsetLeft-rail.offsetLeft-rail.clientWidth/2+chosen.offsetWidth/2);$("anchorStart").value=pos;$("anchorStart").max=(config.endStep??config.totalSteps)-1;$("prevAnchor").disabled=anchorIndex===0;$("nextAnchor").disabled=anchorIndex===anchors.length-1;$("undoTiming").disabled=!timingUndo;$("total").value=config.totalSteps/size();$("barEdit").max=config.totalSteps/size();$("tempoSlider").value=$("bpm").value;renderPattern();renderFragments();renderReview();renderSections();
}
function renderReview(){if(!config)return;const t=core.compile(anchors,config),sec=Math.round(core.clockRange(t,0,config.endStep??config.totalSteps).duration);$("reviewSummary").replaceChildren(...[["Velocidad",(config.sections||[]).length?"Por sección":config.bpm+" BPM"],["Compás",config.meter],["Acordes",anchors.length],["Secciones",groups.length],["Duración",Math.floor(sec/60)+" min "+sec%60+" s"],["Patrones",config.patterns.length]].map(([k,v])=>{const d=elem("div");d.append(elem("small",k),elem("strong",String(v)));return d}))}
function presetHits(name){
 const m=core.resolution(config.meter,config.division),n=size(),w=["down","rest","down","up","rest","down","rest","up"];
 if(name==="worship"&&n!==8)throw Error("Alabanza requiere 4/4 con dos posiciones por pulso.");
 return Array.from({length:n},(_,i)=>({hit:name==="empty"?"rest":name==="ring"?i===0?"down":"rest":name==="all"?i%2?"up":"down":name==="worship"?w[i]:i%m.division===0?"down":"rest",accent:i===0}));
}
function sectionHits(g,p){const index=g.indices[0],start=config.changes[index].step,base=config.patterns.filter(x=>x.start<=start).at(-1);return p.hits||Array.from({length:size()},(_,i)=>({...base.hits[(start-base.start+i)%size()]}))}
function sectionUpdate(g,patch,refresh=true){
 stop();
 // Explicitly initialize every section to preserve the independent base and avoid a section leaking into the next.
 for(const x of groups){const i=x.indices[0];if(!(config.sections||[]).some(p=>p.index===i))config=core.setSection(config,i,{});}
 config=core.setSection(config,g.indices[0],patch);renderReview();if(refresh)renderSections();
}
function renderSections(){
 if(!config||!groups.length)return;
 const root=$("sectionCards");root.replaceChildren(...groups.map((g,k)=>{
 const p=core.sectionConfig(config,g.indices[0]),hits=sectionHits(g,p),card=elem("article");card.className="section-card";
 const toggle=elem("button");toggle.className="section-toggle";toggle.setAttribute("aria-expanded",String(openSection===k));
 const title=elem("span");title.append(elem("strong",(k+1)+". "+g.title),elem("small",p.bpm+" BPM · "+(p.hits?"Rasgueo propio":"Rasgueo general")+" · "+g.indices.length+" acordes"));toggle.append(title,elem("span",openSection===k?"−":"+"));toggle.onclick=()=>{stop();openSection=openSection===k?-1:k;renderSections()};card.append(toggle);
 if(openSection!==k)return card;
 const panel=elem("div");panel.className="section-controls";
 const label=elem("label","Velocidad de esta sección"),readout=elem("div");readout.className="section-tempo";const minus=elem("button","−"),plus=elem("button","+"),amount=elem("input");amount.type="number";amount.min=40;amount.max=240;amount.value=p.bpm;amount.setAttribute("aria-label","BPM de "+g.title);readout.append(minus,amount,elem("small","BPM"),plus);label.append(readout);panel.append(label);
 const slider=elem("input");slider.type="range";slider.min=40;slider.max=240;slider.value=p.bpm;slider.setAttribute("aria-label","Velocidad de "+g.title);panel.append(slider);
 function tempo(v){const n=Math.max(40,Math.min(240,Math.round(Number(v)||p.bpm)));sectionUpdate(g,{bpm:n});}
 minus.onclick=()=>tempo(p.bpm-5);plus.onclick=()=>tempo(p.bpm+5);amount.onchange=()=>tempo(amount.value);slider.oninput=()=>amount.value=slider.value;slider.onchange=()=>tempo(slider.value);
 const tempos=elem("div");tempos.className="tempo-labels";tempos.append(elem("small","Tranquilo"),elem("small","Rápido"));panel.append(tempos);
 const patLabel=elem("label","Rasgueo"),pat=elem("select");pat.replaceChildren(new Option("Usar rasgueo general","base"),new Option("Suave · abajo en cada pulso","basic"),new Option("Alternado · abajo y arriba","all"),new Option("Alabanza · ocho posiciones","worship"),new Option("Un golpe por compás","ring"),new Option("Vacío · crear desde cero","empty"),new Option("Personalizado","custom"));pat.querySelector('option[value="worship"]').disabled=config.meter!=="4/4"||config.division!==2;pat.value=p.hits?"custom":"base";pat.onchange=safe(()=>{if(pat.value==="custom")return;sectionUpdate(g,{hits:pat.value==="base"?null:presetHits(pat.value)})});patLabel.append(pat);panel.append(patLabel);
 const pattern=elem("div");pattern.className="section-pattern";hits.forEach((h,i)=>{const b=elem("button",arrows[h.hit]+(h.accent?"′":""));b.setAttribute("aria-label","Golpe "+(i+1)+": "+h.hit+". Toca para cambiar.");b.onclick=()=>{const next=hits.map((v,j)=>j===i?{...v,hit:types[(types.indexOf(v.hit)+1)%types.length]}:{...v});sectionUpdate(g,{hits:next})};pattern.append(b)});panel.append(pattern,elem("small","Toca una flecha para cambiar: ↓ abajo, ↑ arriba, × apagado, · sin golpe."));
 const importBox=elem("details");importBox.className="advanced";importBox.append(elem("summary","Importar código de rasgueo"));const code=elem("input");code.type="text";code.placeholder="Drdurdru";code.setAttribute("aria-label","Código de rasgueo");const importBtn=elem("button","Importar");importBtn.onclick=safe(()=>{const v=code.value.replace(/\s+/g,"");if(v.length!==size()||!/^[durmDURM]+$/.test(v))throw Error("El código debe tener "+size()+" posiciones (d/u/m/r).");const decode={d:"down",u:"up",m:"mute",r:"rest"};sectionUpdate(g,{hits:[...v].map(x=>({hit:decode[x.toLowerCase()],accent:x!==x.toLowerCase()}))});note("Rasgueo importado.")});importBox.append(code,importBtn);panel.append(importBox);
 if(k>0){const l=elem("label","Cómo entrar desde la sección anterior"),s=elem("select");s.replaceChildren(new Option("Cambio directo","immediate"),new Option("Cambio gradual de velocidad","gradual"),new Option("Pausa antes de entrar","pause"));s.value=p.transition;s.onchange=()=>sectionUpdate(g,{transition:s.value,pauseMs:s.value==="pause"?(p.pauseMs||1000):0});l.append(s);panel.append(l);if(p.transition==="pause"){const pause=elem("label","Pausa (segundos)"),n=elem("input");n.type="number";n.min=0;n.max=10;n.step=.5;n.value=p.pauseMs/1000;n.onchange=()=>sectionUpdate(g,{pauseMs:Math.max(0,Math.min(10000,Math.round(Number(n.value)*1000)||0))});pause.append(n);panel.append(pause)}}
 const actions=elem("div");actions.className="button-row";const hear=elem("button",inlineSection===k?"■ Detener":"▶ Escuchar sección");hear.className="section-hear";hear.onclick=safe(async()=>{if(inlineSection===k){stop();return;}await play(groupRange(g),k)});const chords=elem("button","Ajustar acordes");chords.onclick=()=>{chooseAnchor(g.indices[0]);showStage(1)};actions.append(hear,chords);panel.append(actions);
 if(groups.length>1){const l=elem("label","Copiar configuración a otra sección"),target=elem("select");target.replaceChildren(...groups.map((x,i)=>i===k?null:new Option((i+1)+". "+x.title,String(i))).filter(Boolean));l.append(target);const copy=elem("button","Copiar tempo, rasgueo y transición");copy.onclick=()=>{const dest=groups[Number(target.value)];if(dest&&window.confirm("¿Reemplazar la configuración de "+dest.title+"?")){sectionUpdate(dest,{bpm:p.bpm,hits:hits.map(h=>({...h})),transition:p.transition,pauseMs:p.pauseMs});note("Configuración copiada. Los acordes no cambiaron.")}};panel.append(l,copy)}
 const status=elem("p","");status.className="note section-listen-status";panel.append(status);card.append(panel);return card;
 }));
}
$("sectionPlayAll").onclick=safe(()=>preview());
$("sectionAdvanced").onclick=()=>showStage(1);
function showStage(n,scroll=true){if(scroll)stop();stage=Math.max(0,Math.min(3,n));for(let i=0;i<4;i++)$("stage"+i).hidden=i!==stage;document.querySelectorAll("#editorSteps [data-stage]").forEach(b=>{const active=Number(b.dataset.stage)===stage;b.setAttribute("aria-pressed",String(active));if(active)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current")});$("stageLabel").textContent="Paso "+(stage+1)+" de 4";$("stageBack").disabled=stage===0;$("stageNext").textContent=stage===3?"Escuchar canto ▶":"Continuar ›";if(stage===3)renderReview();if(stage===0)renderSections();if(scroll)window.scrollTo(0,0)}
function groupRange(g){return {start:config.changes[g.indices[0]].step,end:config.changes[g.indices.at(-1)+1]?.step??config.endStep??config.totalSteps,title:g.title}}
async function preview(range=null){if(mode==="public")return;editorScroll=window.scrollY;practiceRange=range;switchView(false);$("loop").checked=false;await play()}
$("anchorSection").onchange=()=>chooseAnchor(groups[Number($("anchorSection").value)].indices[0]);
$("prevAnchor").onclick=()=>chooseAnchor(anchorIndex-1);$("nextAnchor").onclick=()=>chooseAnchor(anchorIndex+1);
$("anchorStart").onchange=safe(()=>{if(!confirmTiming())return renderEditor();changeTiming({...config,changes:config.changes.map((x,i)=>i===anchorIndex?{...x,step:Number($("anchorStart").value)}:x),fragments:[]})});
$("undoTiming").onclick=()=>{if(timingUndo){config=timingUndo;timingUndo=null;renderEditor();note("Ajuste anterior recuperado.")}};
$("hearChord").onclick=safe(()=>preview({start:config.changes[anchorIndex].step,end:config.changes[anchorIndex+1]?.step??config.endStep??config.totalSteps,title:anchors[anchorIndex].chord}));
$("hearSection").onclick=safe(()=>preview(groupRange(groups.find(g=>g.indices.includes(anchorIndex)))));
$("hearAll").onclick=safe(()=>preview());
$("stageBack").onclick=()=>showStage(stage-1);$("stageNext").onclick=safe(()=>stage===3?preview():(validate(),showStage(stage+1)));
document.querySelectorAll("#editorSteps [data-stage]").forEach(b=>b.onclick=safe(()=>{validate();showStage(Number(b.dataset.stage))}));
function setTempo(value){const n=Math.max(40,Math.min(240,Math.round(value)));if(!Number.isFinite(n))return;$("bpm").value=n;$("tempoSlider").value=n;if(config)config.bpm=n;renderReview();renderSections()}
$("bpm").onchange=()=>setTempo(Number($("bpm").value));$("tempoSlider").oninput=()=>setTempo(Number($("tempoSlider").value));$("tempoMinus").onclick=()=>setTempo(Number($("bpm").value)-5);$("tempoPlus").onclick=()=>setTempo(Number($("bpm").value)+5);
$("tapTempo").onclick=()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);if(taps.length>6)taps.shift();if(taps.length>=2){setTempo(60000*(taps.length-1)/(now-taps[0]));$("tempoHelp").textContent="Velocidad detectada: "+$("bpm").value+" BPM."}else $("tempoHelp").textContent="Sigue marcando pulsos."};
$("hearTempo").onclick=safe(async()=>{stop();if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}const generation=epoch;await ctx.resume();if(epoch!==generation)return;const beat=60/Number($("bpm").value),m=core.meters[$("meter").value],start=ctx.currentTime+.05;engine.volume(.7);for(let i=0;i<m.beats*2;i++)engine.click(start+i*beat,i%m.beats===0);note("Escuchando dos compases de referencia.")});
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
$("autoFragment").onclick=safe(()=>{const sections=window.ShalomStudioCollections.sections($("source").value),section=sections[Number($("fragmentSelect").value)],matches=groups.filter(g=>g.title===section?.title);if(matches.length!==1)throw Error("Sección repetida o sin acordes. Ajusta el rango manualmente.");const range=groupRange(matches[0]);$("fragmentStart").value=range.start;$("fragmentEnd").value=range.end;$("fragmentStatus").textContent="Rango sugerido. Confirma con Asignar rango."});
$("fragmentSave").onclick=safe(()=>{const range={index:Number($("fragmentSelect").value),start:Number($("fragmentStart").value),end:Number($("fragmentEnd").value)};if(!window.ShalomStudioCollections.validRange(range,config.totalSteps))throw Error("Rango de fragmento inválido.");config.fragments=[...(config.fragments||[]).filter(r=>r.index!==range.index),range];showFragment();});
$("fragmentRemove").onclick=safe(()=>{config.fragments=(config.fragments||[]).filter(r=>r.index!==Number($("fragmentSelect").value));showFragment()});
function currentPattern(create=false){
 const bar=Math.max(1,Math.min(config.totalSteps/size(),Math.round(Number($("barEdit").value)||1)));$("barEdit").value=bar;const start=(bar-1)*size();
 let p=config.patterns.find(p=>p.start===start);
 if(!p){const prev=config.patterns.filter(p=>p.start<=start).at(-1);p={start,hits:prev.hits.map(h=>({...h}))};if(create){config.patterns.push(p);config.patterns.sort((a,b)=>a.start-b.start)}}
 return p
}
function renderPattern(){
 const p=currentPattern(),m=core.resolution(config.meter,config.division),bar=Number($("barEdit").value);selectedHit=Math.max(0,Math.min(p.hits.length-1,selectedHit));$("prevBar").disabled=bar<=1;$("nextBar").disabled=bar>=config.totalSteps/size();
 const symbols=anchors.filter((a,i)=>config.changes[i].step>=p.start&&config.changes[i].step<p.start+size()).map(a=>a.chord);$("barSummary").textContent="Compás "+bar+" de "+config.totalSteps/size()+(symbols.length?" · "+symbols.join(" → "):" · Continúa el acorde anterior");
 $("preset").querySelector('option[value="worship"]').disabled=config.meter!=="4/4"||m.division!==2;
 $("grid").replaceChildren(...Array.from({length:m.beats},(_,beat)=>{const g=elem("div");g.className="beat-group";g.append(elem("small","Pulso "+(beat+1)));const cells=elem("div");cells.className="beat-cells";for(let j=0;j<m.division;j++){const i=beat*m.division+j,h=p.hits[i],b=elem("button",arrows[h.hit]+(h.accent?"′":""));b.dataset.pulse=String(i);b.setAttribute("aria-pressed",String(selectedHit===i));b.setAttribute("aria-label","Pulso "+(beat+1)+", posición "+(j+1)+": "+h.hit);b.onclick=()=>{selectedHit=i;renderPattern()};cells.append(b)}g.append(cells);return g}));
 auditionPattern=p.hits.map(h=>({...h}));
 const hit=p.hits[selectedHit];$("hitSelection").textContent="Pulso "+(Math.floor(selectedHit/m.division)+1)+" · posición "+(selectedHit%m.division+1);document.querySelectorAll("#hitTools [data-hit]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.hit===hit.hit)));$("toggleAccent").setAttribute("aria-pressed",String(hit.accent));
}
function changeHit(value,accent){const p=currentPattern(),hits=p.hits.map((h,i)=>i===selectedHit?{...h,...(value?{hit:value}:{}),...(accent?{accent:!h.accent}:{})}:{...h});config=core.applyPattern(config,Number($("barEdit").value),hits,"one");renderPattern();renderReview()}
document.querySelectorAll("#hitTools [data-hit]").forEach(b=>b.onclick=safe(()=>changeHit(b.dataset.hit,false)));$("toggleAccent").onclick=safe(()=>changeHit(null,true));
$("prevBar").onclick=()=>{stop();$("barEdit").value=Math.max(1,Number($("barEdit").value)-1);renderPattern()};$("nextBar").onclick=()=>{stop();$("barEdit").value=Math.min(config.totalSteps/size(),Number($("barEdit").value)+1);renderPattern()};
async function auditionBar(){
 if(audition){stop();return;}
 stop();validate();const bar=Number($("barEdit").value),startStep=(bar-1)*size(),n=size(),timeline=core.compile(anchors,config),events=timeline.slice(startStep,startStep+n);
 const firstChord=events.find(e=>e.chord)?.chord||anchors[anchorIndex]?.chord;if(!firstChord)throw Error("No hay un acorde para escuchar.");
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;
 const beat=events[0].duration,barTime=n*beat,start=ctx.currentTime+.2;let next=0,last=-1;
 engine.volume(Number($("volume").value)/100);audition=true;$("hearBar").textContent="■ Detener rasgueo";$("auditionStatus").textContent="Edita mientras escuchas; los cambios entran en los próximos golpes.";
 function tick(){if(!audition)return;try{while(start+next*beat<ctx.currentTime+.10){if(!$("repeatBar").checked&&next>=n)break;const i=next%n,t=start+next*beat;next++;if(t<ctx.currentTime-.035)continue;const e=events[i],hit=auditionPattern[i];engine.strum({...e,...hit,chord:e.chord||firstChord,duration:beat},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo:Number($("capo").value)||0});}}catch(e){stop();note(e.message)}}
 function animate(){if(!audition)return;const elapsed=ctx.currentTime-start;if(elapsed>=barTime&&!$("repeatBar").checked){stop();return}const i=Math.max(0,Math.floor(elapsed/beat))%n;if(i!==last||!$("grid").querySelector(".audition-active")){$("grid").querySelector(".audition-active")?.classList.remove("audition-active");$("grid").querySelector('[data-pulse="'+i+'"]')?.classList.add("audition-active");last=i;}frame=requestAnimationFrame(animate)}
 timer=setInterval(tick,25);tick();animate();
}
$("hearBar").onclick=safe(auditionBar);

$("copyPattern").onclick=safe(()=>{if(config.patterns.length>1&&!window.confirm("Esto reemplaza los patrones de todo el canto. ¿Continuar?"))return;config=core.applyPattern(config,Number($("barEdit").value),currentPattern().hits,"all");renderPattern();renderReview();note("Patrón aplicado a todo el canto.")});
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
function stop(){const wasInline=inlineSection;inlineSection=null;playing=false;audition=false;epoch++;clearInterval(timer);cancelAnimationFrame(frame);engine?.stop();$("hearBar").textContent="▶ Escuchar rasgueo";$("auditionStatus").textContent="Escucha aquí sin salir del editor.";$("grid").querySelector(".audition-active")?.classList.remove("audition-active");if(wasInline!==null){const b=$("sectionCards").querySelector(".section-hear");if(b)b.textContent="▶ Escuchar sección";const s=$("sectionCards").querySelector(".section-listen-status");if(s)s.textContent="Escucha detenida."}}
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
  else{const i=Math.min(w.last,w.first+core.clockIndex(w.offsets,Math.max(0,elapsed-w.start)));if(i!==lastStep){showStep(track.timeline,i);lastStep=i}}
  frame=requestAnimationFrame(animate);
 }
 timer=setInterval(tick,25);tick();animate();note("Popurrí continuo · acompañamientos oficiales.");
}
async function play(range=null,inline=null){
 if(sequence)return playSequence();
 stop();validate();const move=Number($("shift").value);if(!Number.isInteger(move)||Math.abs(move)>12)throw Error("Transposición inválida.");const timeline=core.compile(anchors,config,c=>shifted(c,move));for(const c of new Set(timeline.map(e=>e.chord).filter(Boolean)))guitar.voicing(c);
 if(inline===null)$("score").innerHTML=window.ShalomChords.render($("source").value,{transpose:c=>shifted(c,move)});
 const speed=Math.max(25,Math.min(200,Number($("speed").value)||100))/100,capo=Number($("capo").value);if(!Number.isInteger(capo)||capo<0||capo>12)throw Error("Capo inválido");
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible en este dispositivo.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;playing=true;inlineSection=inline;engine.volume(Number($("volume").value)/100);
 const first=range?.start??practiceRange?.start??0,end=range?.end??practiceRange?.end??config.endStep??timeline.length,clock=core.clockRange(timeline,first,end,speed);
 const count=end-first,duration=clock.duration,start=ctx.currentTime+.16;let next=0,last=-1;
 const loop=()=>inline===null&&$("loop").checked;
 if(inline!==null){const b=$("sectionCards").querySelector(".section-hear");if(b)b.textContent="■ Detener";}
 const tick=()=>{if(!playing)return;try{while(true){if(!loop()&&next>=count)break;const cycle=Math.floor(next/count),i=next%count,e=timeline[first+i],t=start+cycle*duration+clock.offsets[i],gap=i===0?0:(e.gapBefore||0)/speed;
   if(gap&&t-gap<ctx.currentTime+.12&&t>=ctx.currentTime-.03&&next!==lastGap){engine.releaseAt(Math.max(t-gap,ctx.currentTime));lastGap=next;}
   if(t>=ctx.currentTime+.12)break;next++;if(t<ctx.currentTime-.03)continue;engine.strum({...e,duration:e.duration/speed},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo});if(e.release)engine.releaseAt(Math.max(t+e.duration/speed,ctx.currentTime));if($("metro").checked&&e.step%config.division===0)engine.click(Math.max(t,ctx.currentTime),e.beat===0);
 }}catch(e){stop();note(e.message)}};
 let lastGap=-1;
 function animate(){if(!playing)return;const elapsed=Math.max(0,ctx.currentTime-start);if(elapsed>=duration&&!loop()){stop();note("Práctica finalizada.");return}const i=first+core.clockIndex(clock.offsets,elapsed%duration);if(i!==last){if(inline===null)showStep(timeline,i);else{const s=$("sectionCards").querySelector(".section-listen-status");if(s)s.textContent=(timeline[i].chord||"Silencio")+" · "+Math.round(timeline[i].tempo)+" BPM";}last=i}frame=requestAnimationFrame(animate)}
 timer=setInterval(tick,25);tick();animate();note("Guitarra sintetizada · reproducción local.");
}
function switchView(edit){if(mode==="public"&&edit)return;stop();if(!edit){const t=validate();showStep(t,practiceRange?.start??0)}else{practiceRange=null;renderEditor();showStage(stage,false)}$("editor").hidden=!edit;$("player").hidden=edit;$("viewEdit").setAttribute("aria-pressed",String(edit));$("viewPlay").setAttribute("aria-pressed",String(!edit));window.scrollTo(0,edit?editorScroll:0)}
function changeResolution(){if(!config){divisions();return;}const meter=$("meter").value,division=Number($("division").value);if(meter===config.meter&&division===config.division)return;if(!window.confirm("Cambiar la forma de contar reinicia la duración y el rasgueo. ¿Continuar?")){$("meter").value=config.meter;divisions();$("division").value=config.division;return;}if(meter!==config.meter)divisions();generate()}
$("meter").onchange=safe(changeResolution);$("division").onchange=safe(changeResolution);$("generate").onclick=safe(()=>{if(!config||window.confirm("¿Reemplazar la preparación musical actual?"))generate()});$("barEdit").onchange=safe(()=>{stop();renderPattern()});
$("total").onchange=safe(()=>{const n=Number($("total").value);if(!Number.isInteger(n)||n<1||n>512)throw Error("Número de compases inválido.");const total=n*size();if((config.endStep!==undefined&&config.endStep>total)||config.changes.some(c=>c.step>=total)||config.patterns.some(p=>p.start>=total)||(config.fragments||[]).some(r=>r.end>total))throw Error("Hay acordes o patrones fuera de la duración elegida.");changeTiming({...config,totalSteps:total})});
$("applyPreset").onclick=safe(()=>{const m=core.resolution(config.meter,config.division),choice=$("preset").value,scope=$("patternScope").value,pattern=["down","rest","down","up","rest","up","down","up"];if(choice==="worship"&&(config.meter!=="4/4"||m.division!==2))throw Error("Este patrón requiere 4/4 y dos posiciones por pulso.");if(scope!=="one"&&config.patterns.length>1&&!window.confirm("Se reemplazarán los patrones del rango elegido. ¿Continuar?"))return;const hits=Array.from({length:size()},(_,i)=>({hit:choice==="empty"?"rest":choice==="all"?i%2?"up":"down":choice==="worship"?pattern[i]:i%m.division===0?"down":"rest",accent:i===0}));config=core.applyPattern(config,Number($("barEdit").value),hits,scope);renderPattern();renderReview();note("Patrón aplicado.")});
$("save").onclick=safe(()=>{validate();if(mode==="public")return;pendingSave=fingerprint();localStorage.setItem(storageKey,JSON.stringify(mode==="admin"?{revision:baseRevision,config}:{source:$("source").value,config}));baseline=pendingSave;pendingSave=null;note("Borrador guardado en este dispositivo; no publicado.")});
$("publish").onclick=safe(()=>{if(mode!=="admin")return;validate();if(!window.confirm("¿Publicar este acompañamiento para todos los músicos?"))return;pendingSave=fingerprint();window.parent.postMessage({type:"shalom-studio-publish",arrangement:window.ShalomStudioCodec.encode(anchors,config)},location.origin);note("Publicando…")});
$("viewEdit").onclick=safe(()=>switchView(true));$("viewPlay").onclick=safe(()=>{if(mode!=="public"){editorScroll=window.scrollY;practiceRange=null}switchView(false)});$("play").onclick=safe(play);$("pause").onclick=()=>{stop();note("Reproducción detenida.")};$("volume").oninput=()=>engine?.volume(Number($("volume").value)/100);
window.__shalomStudioBack=function(){
 if(backPending)return false;
 stop();
 if(mode!=="public"&&config){
  if(!$("player").hidden){switchView(true);return false;}
  if(stage>0){showStage(stage-1);return false;}
  if(pendingSave!==null){note("Espera la confirmación del guardado.");return false;}
  if(baseline!==fingerprint()){backPending=true;const leave=window.confirm("Hay cambios sin guardar. ¿Salir y perder estos cambios?");backPending=false;if(!leave)return false;}
 }
 return true;
};
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});window.addEventListener("pagehide",()=>{stop();engine?.dispose();ctx?.close().catch(()=>{});ctx=null;engine=null});
if(!embedded){divisions();try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved){$("source").value=saved.source;config=saved.config;$("meter").value=config.meter;divisions();$("division").value=config.division;$("bpm").value=config.bpm;anchors=core.anchorsFromRows(readRows());validate();renderEditor()}else generate()}catch(e){generate();note("No se pudo recuperar el borrador anterior: "+e.message)}
showStage(0,false);baseline=fingerprint();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./offline-sw.js").catch(()=>note("No se pudo preparar la caché offline."));
}else{
 $("studioMain").hidden=true;
 window.addEventListener("message",e=>{if(e.origin!==location.origin||e.source!==window.parent)return;const d=e.data||{};if(d.type==="shalom-studio-result"&&mode==="admin"){if(d.ok&&pendingSave!==null)baseline=pendingSave;pendingSave=null;note(d.message);return}if(d.type!=="shalom-studio-init"||initialized)return;initialized=true;try{mode=d.mode==="admin"?"admin":"public";practiceRange=mode==="public"?d.range||null:null;sequence=mode==="public"&&Array.isArray(d.sequence)&&d.sequence.length>=2?d.sequence:null;sequenceTitle=String(d.title||"Popurrí");baseRevision=d.song.revision;storageKey=labKey+"."+d.song.id;$("source").value=d.song.lyrics;$("source").readOnly=true;$("sourceLabel").hidden=true;$("labHeader").hidden=true;$("studioTitle").textContent=d.song.title+(practiceRange?.title?" · "+practiceRange.title:"");$("labNote").textContent=mode==="admin"?"Configura los acordes existentes. Los borradores no son públicos.":"Acompañamiento publicado · guitarra sintetizada";$("shift").value=Number(d.shift)||0;$("capo").value=Number(d.capo)||0;anchors=core.anchorsFromRows(readRows());let draft=null;if(mode==="admin"){try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved?.revision===baseRevision&&saved.config?.source===core.signature(anchors))draft=saved.config}catch{}}config=draft||(d.arrangement?window.ShalomStudioCodec.decode(anchors,d.arrangement):null);if(!config){if(mode==="public")throw Error("No hay acompañamiento disponible.");divisions();generate()}else{$("meter").value=config.meter;divisions();$("division").value=String(config.division);$("bpm").value=config.bpm;validate();renderEditor()}if(practiceRange){if(!(config.fragments||[]).some(r=>r.start===practiceRange.start&&r.end===practiceRange.end))throw Error("Fragmento sin sincronización publicada.");$("loop").checked=false;}$("publish").hidden=mode!=="admin";$("studioNav").hidden=mode==="public";$("studioMain").hidden=false;switchView(mode==="admin");baseline=fingerprint();if(sequence){$("studioTitle").textContent=sequenceTitle;$("labNote").textContent="Popurrí continuo · "+sequence.length+" fragmentos";$("loop").checked=false;$("loop").closest("label").hidden=true;$("shift").closest("label").hidden=true;$("capo").closest("label").hidden=true;}}catch(err){$("studioMain").hidden=false;$("editor").hidden=true;$("player").hidden=true;$("studioNav").hidden=true;note(err.message)}});
 window.parent.postMessage({type:"shalom-studio-ready"},location.origin);
}
})();