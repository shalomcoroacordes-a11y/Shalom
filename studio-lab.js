(() => {
"use strict";
const $=id=>document.getElementById(id), core=window.ShalomStudio, guitar=window.ShalomGuitar;
const {clampScoreFont,touchDistance,touchCenter,pinchFont,followTarget}=window.ShalomStudioReadingGeometry;
const arrows={down:"↓",up:"↑",mute:"×",rest:"·"}, labKey="shalom.studio.lab.v1";
let storageKey=labKey,embedded=window.parent!==window,mode="lab",baseRevision=null,initialized=!embedded;
let practiceRange=null,sequence=null,sequenceTitle="";
let stage=0,anchorIndex=0,groups=[],selectedHit=0,taps=[],timingUndo=null,editorScroll=0;
let audition=false,auditionPattern=null,baseline=null,pendingSave=null,backPending=false;
let openSection=0,inlineSection=null,rhythmIndex=0,rhythmUndo=null;
let publishedFingerprint=null,draftFingerprint=null,saveError="",pendingKind=null;
const fingerprint=()=>{try{return config?JSON.stringify(window.ShalomStudioCodec.encode(anchors,config)):null}catch{return null}};
let anchors=[],config=null,ctx=null,engine=null,timer=null,frame=null,playing=false,epoch=0;
const note=s=>{$("status").textContent=s;$("editorStatus").textContent=s;renderEditingState()};
function renderEditingState(fp=fingerprint()){renderSaveState(fp);renderUndoState(fp)}
function renderUndoState(fp=fingerprint()){$("undoTiming").disabled=!core.canUndo(timingUndo,fp);$("undoRhythm").disabled=!core.canUndo(rhythmUndo,fp)}
function rememberTiming(next){const previous=core.undoSnapshot(config);config=next;previous.after=fingerprint();timingUndo=previous;}
function renderSaveState(fp=fingerprint()){
 const {state,title,detail,disabled}=window.ShalomStudioSaveState.describe({
  fingerprint:fp,publishedFingerprint,draftFingerprint,pendingSave,pendingKind,saveError
 });
 $("saveState").dataset.state=state;
 $("saveStateTitle").textContent=title;
 $("saveStateDetail").textContent=detail;
 $("save").disabled=disabled;
 $("publish").disabled=disabled;
}
function finishSave(ok,message){
 const kind=pendingKind,fp=pendingSave;
 pendingSave=null;pendingKind=null;
 if(ok&&fp!==null){baseline=fp;saveError="";if(kind==="publish"){publishedFingerprint=fp;draftFingerprint=null;try{localStorage.removeItem(storageKey)}catch{}}else draftFingerprint=fp;}
 else if(!ok)saveError=message||"Intenta nuevamente.";
 note(message||"Guardado.");
}
function submitSave(kind){
 if(mode==="public"||pendingSave!==null)return;
 validate();
 if(kind==="publish"&&(mode!=="admin"||!window.confirm("¿Publicar este acompañamiento para todos los músicos?")))return;
 pendingSave=fingerprint();pendingKind=kind;saveError="";
 try{
  const arrangement=window.ShalomStudioCodec.encode(anchors,config);
  if(kind==="publish"){window.parent.postMessage({type:"shalom-studio-publish",arrangement},location.origin);note("Publicando…");}
  else{localStorage.setItem(storageKey,JSON.stringify(mode==="admin"?{revision:baseRevision,config}:{source:$("source").value,config}));finishSave(true,"Borrador guardado en este dispositivo; no publicado.");}
 }catch(e){finishSave(false,e.message||"No se pudo guardar.")}
}

function safe(fn){return async()=>{try{await fn()}catch(e){stop();note(e.message||String(e))}}}
function elem(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
// Reuse only the untransposed, unhighlighted score for the exact current source.
let originalScore=null;
function readRows(){
 const score=$("score"),source=$("source").value;
 if(originalScore?.source===source&&originalScore.score===score)return originalScore.rows;
 originalScore=null;
 score.innerHTML=window.ShalomChords.render(source);
 const rows=Array.from(score.children).map(e=>e.classList.contains("song-section-label")?{kind:"section",text:e.textContent}:e.classList.contains("song-line")?{kind:"chords",chordLine:e.querySelector(".chord-line").textContent}:e.classList.contains("song-standalone-chords")?{kind:"chordsOnly",text:e.textContent}:{kind:"other"});
 originalScore={source,score,rows};
 return rows;
}
function renderPlaybackScore(source,move){
 originalScore=null;
 $("score").innerHTML=window.ShalomChords.render(source,{transpose:chord=>shifted(chord,move)});
}
function divisions(){const m=$("meter").value;$("division").replaceChildren(...core.divisions[m].map(d=>new Option(d+" por pulso"+(d===core.meters[m].division?" · recomendado":""),String(d))));$("division").value=String(core.meters[m].division)}
function size(){const m=core.resolution(config.meter,config.division);return m.beats*m.division}
function generate(){
 stop();anchors=core.anchorsFromRows(readRows());if(!anchors.length)throw Error("No se detectaron acordes.");
 config=core.draft(anchors,$("meter").value,Number($("bpm").value),Number($("division").value));$("barEdit").value=1;anchorIndex=0;timingUndo=null;rhythmUndo=null;renderEditor();note("Borrador inicial preparado. Ajusta los acordes en el paso 2.")
}
function durationText(n){return core.durationLabel(config,n)}
function confirmTiming(){return !(config.fragments||[]).length||window.confirm("Este cambio requiere volver a sincronizar fragmentos. ¿Continuar?")}
function changeTiming(next){core.compile(anchors,next);rememberTiming(next);renderEditor();note("Tiempo actualizado. Revisa los patrones por compás.")}
function chooseAnchor(i){anchorIndex=Math.max(0,Math.min(anchors.length-1,i));const k=groups.findIndex(g=>g.indices.includes(anchorIndex));if(k>=0){rhythmIndex=k;openSection=k;$("barEdit").value=1;}renderEditor()}
function renderEditor(){
 if(!config||!anchors.length)return;
 groups=core.groupAnchors(anchors,readRows());anchorIndex=Math.max(0,Math.min(anchors.length-1,anchorIndex));
 const gi=Math.max(0,groups.findIndex(g=>g.indices.includes(anchorIndex))),g=groups[gi],a=anchors[anchorIndex],m=core.resolution(config.meter,config.division),duration=core.durationSteps(config,anchorIndex),pos=config.changes[anchorIndex].step;
 $("anchorSection").replaceChildren(...groups.map((x,i)=>new Option((i+1)+". "+x.title,String(i))));$("anchorSection").value=String(gi);$("sectionInfo").textContent="Acorde "+(g.indices.indexOf(anchorIndex)+1)+" de "+g.indices.length;$("sectionPulses").textContent=Number(((core.groupBounds(config,g).end-core.groupBounds(config,g).start)/m.division).toFixed(3))+" pulsos";
 $("anchorRail").replaceChildren(...g.indices.map(i=>{const b=elem("button",anchors[i].chord);b.setAttribute("aria-pressed",String(i===anchorIndex));b.onclick=()=>chooseAnchor(i);b.append(elem("small",durationText(core.durationSteps(config,i)).split(" · ")[0]));return b}));
 const context=$("sectionScore");context.replaceChildren(...[...new Set(g.indices.map(i=>anchors[i].line))].map(line=>{const original=$("score").children[line];if(!original)return elem("div","Parte instrumental");const clone=original.cloneNode(true),chords=clone.querySelector(".chord-line")||(clone.classList.contains("song-standalone-chords")?clone:null);clone.classList.remove("active");clone.querySelectorAll(".active-chord").forEach(n=>n.classList.remove("active-chord"));if(chords){let ordinal=0;const lineIndices=anchors.map((x,i)=>x.line===line?i:-1).filter(i=>i>=0);chords.replaceChildren(...chords.textContent.split(/(\s+)/).map(t=>{if(!t.trim())return document.createTextNode(t);const i=lineIndices[ordinal++],span=elem("span",t);span.className="selectable-chord"+(i===anchorIndex?" active-chord":"");if(g.indices.includes(i)){span.setAttribute("role","button");span.tabIndex=0;span.setAttribute("aria-label","Seleccionar "+anchors[i].chord);span.onclick=()=>chooseAnchor(i);span.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();chooseAnchor(i)}};}return span;}));}return clone;}));
 const wrap=elem("article");wrap.className="selected-anchor compact-anchor";const heading=elem("div");heading.className="anchor-duration-heading";const local=pos-core.groupBounds(config,g).start;const info=elem("div");info.append(elem("strong","Duración del acorde"),elem("small","Compás "+(Math.floor(local/size())+1)+" · Pulso "+(Math.floor(local%size()/m.division)+1)+(local%m.division?" · entre pulsos":"")));heading.append(elem("h3",a.chord),info);wrap.append(heading);
 function setSteps(n){if(!confirmTiming())return renderEditor();changeTiming(core.setDuration(core.isolateSections(config,groups),anchorIndex,n))}
 const quick=elem("div");quick.className="duration-choices";
 for(const [title,n] of core.durationChoices(config)){if(!Number.isInteger(n)||n<1)continue;const b=elem("button",title);b.setAttribute("aria-pressed",String(duration===n));b.onclick=safe(()=>setSteps(n));quick.append(b)}
 const counter=elem("div");counter.className="duration-counter";const minus=elem("button","−"),plus=elem("button","+");minus.disabled=duration<=1;minus.onclick=safe(()=>setSteps(Math.max(1,duration-Math.max(1,Math.floor(m.division/2)))));plus.onclick=safe(()=>setSteps(duration+Math.max(1,Math.floor(m.division/2))));counter.append(minus,elem("strong",durationText(duration)),plus);wrap.append(counter,quick);
 const detail=elem("details");detail.className="advanced";detail.append(elem("summary","Duración personalizada"));const input=elem("input");input.type="number";input.step="any";input.min=1/m.division;input.value=Number((duration/m.division).toFixed(6));input.onchange=safe(()=>{setSteps(core.pulsesToSteps(config,input.value))});const custom=elem("label","Pulsos exactos");custom.append(input);detail.append(custom);wrap.append(detail);
 const behavior=elem("fieldset");behavior.className="anchor-hold";behavior.append(elem("legend","Comportamiento del acorde"));for(const [value,label] of [["strum","Seguir rasgueando"],["ring","Tocar y dejar sonar"],["mute","Apagar al finalizar"]]){const row=elem("label"),radio=elem("input");radio.type="radio";radio.name="anchorHold";radio.value=value;radio.checked=(config.changes[anchorIndex].hold||"strum")===value;radio.onchange=()=>{if(!radio.checked)return;config=core.setAnchorHold(config,anchorIndex,value);note("Comportamiento actualizado.")};row.append(radio,document.createTextNode(label));behavior.append(row);}wrap.append(behavior);$("anchors").replaceChildren(wrap);
 $("anchorStart").value=pos;$("anchorStart").disabled=anchorIndex===g.indices[0];$("anchorStart").min=(config.changes[anchorIndex-1]?.step??-1)+1;$("anchorStart").max=(config.changes[anchorIndex+1]?.step??config.endStep??config.totalSteps)-1;$("prevAnchor").disabled=anchorIndex===0;$("nextAnchor").disabled=anchorIndex===anchors.length-1;$("total").value=config.totalSteps/size();$("barEdit").max=config.totalSteps/size();$("tempoSlider").value=$("bpm").value;const fp=fingerprint();renderPattern(fp);renderFragments(fp);renderReview(fp);renderSections();
}
function renderReview(fp=fingerprint()){if(!config)return;renderEditingState(fp);const summary=core.reviewSummary(anchors,config,groups);$("reviewSummary").replaceChildren(...summary.map(([k,v])=>{const d=elem("div");d.append(elem("small",k),elem("strong",String(v)));return d}))}
function sectionUpdate(g,patch,refresh=true){
 const live=inlineSection===groups.indexOf(g)&&Object.keys(patch).every(k=>k==="hits");if(!live)stop();
 // Explicitly initialize every section to preserve the independent base and avoid a section leaking into the next.
 config=core.setSection(core.isolateSections(config,groups),g.indices[0],patch);renderReview();renderPattern();if(refresh)renderSections();
}
function cueLabel(c){return core.cueActions[c.action]+" · "+core.cueAudiences[c.audience]+(c.text?" · "+c.text:"")}
function cueSectionEditor(g){
 const panel=elem("details");panel.className="advanced cue-editor";panel.append(elem("summary","Indicaciones musicales y litúrgicas"));
 const cues=config.cues||[],local=cues.map((c,i)=>({c,i})).filter(({c})=>g.indices.includes(c.index));
 const list=elem("div");list.className="cue-list";
 const bar=elem("select");for(let i=1;i<=core.sectionBarCount(config,g);i++)bar.append(new Option("Compás "+i,String(i)));
 const action=elem("select");for(const [k,v] of Object.entries(core.cueActions))action.append(new Option(v,k));
 const audience=elem("select");for(const [k,v] of Object.entries(core.cueAudiences))audience.append(new Option(v,k));
 const description=elem("textarea");description.maxLength=160;description.rows=2;description.placeholder="Ej. Esperar al sacerdote o repetir dos veces";
 const fields=elem("div");fields.className="fields";
 for(const [title,input] of [["Ubicación",bar],["Acción",action],["Destinatario",audience],["Detalle",description]]){const label=elem("label",title);label.append(input);fields.append(label);}
 let editing=-1,originalBar="";
 const save=elem("button","Agregar indicación");save.type="button";
 const cancel=elem("button","Cancelar edición");cancel.type="button";cancel.hidden=true;
 function commit(next){const updated=core.setCues(config,next);core.compile(anchors,updated);stop();config=updated;renderReview();renderSections();$("sectionCards").querySelector('[data-open="true"] .cue-editor').open=true;note("Indicaciones actualizadas. Guarda o publica el acompañamiento.");}
 cancel.onclick=()=>{editing=-1;save.textContent="Agregar indicación";cancel.hidden=true;description.value="";};
 save.onclick=safe(()=>{const pos=editing>=0&&bar.value===originalBar?{index:cues[editing].index,ticks:cues[editing].ticks}:core.cuePosition(config,g,Number(bar.value));const value={...pos,action:action.value,audience:audience.value,text:description.value};const next=cues.slice();if(editing<0)next.push(value);else next[editing]=value;commit(next);});
 const bounds=core.groupBounds(config,g),division=config.division;
 for(const {c,i} of local){
  const row=elem("div");row.className="cue-item";const step=config.changes[c.index].step+c.ticks*division/24;
  const n=Math.floor((step-bounds.start)/size())+1;
  const info=elem("div");info.append(elem("small","Compás "+n),elem("strong",cueLabel(c)));
  const edit=elem("button","Editar");edit.type="button";edit.onclick=()=>{editing=i;bar.value=String(n);originalBar=bar.value;action.value=c.action;audience.value=c.audience;description.value=c.text;save.textContent="Guardar indicación";cancel.hidden=false;description.focus();};
  const remove=elem("button","Quitar");remove.type="button";remove.onclick=safe(()=>{if(window.confirm("¿Quitar esta indicación?"))commit(cues.filter((_,j)=>i!==j));});
  row.append(info,edit,remove);list.append(row);
 }
 if(!local.length)list.append(elem("small","Sin indicaciones en esta sección."));
 panel.append(list,fields,save,cancel,elem("small","Son instrucciones visuales: no cambian el rasgueo ni ejecutan repeticiones automáticamente."));
 return panel;
}
let cueTimeline=null,cueEvents=[],cueStep=0,cueRange=null;
function renderCues(timeline,step,range=null){
 if(cueTimeline!==timeline){cueTimeline=timeline;cueEvents=core.cueEntries(timeline);const list=$("cueOverviewList");list.replaceChildren(...cueEvents.filter(x=>!range||x.step>=range.start&&x.step<range.end).flatMap(x=>x.cues.map(c=>{const row=elem("li",cueLabel(c));row.prepend(elem("small","Compás del canto "+(Math.floor(x.step/size())+1)+" · "));return row;})));$("cueOverview").hidden=!list.children.length;$("cueToggleLabel").hidden=!list.children.length;}
 cueStep=step;cueRange=range;
 const visible=$("cueVisible").checked;
 $("cueOverview").hidden=!visible||!$("cueOverviewList").children.length;
 const {current,next}=core.cueWindow(cueEvents,step,size(),range);
 const box=$("liveCue"),now=$("cueCurrent"),later=$("cueNext"),prev=box.hidden;
 box.hidden=!visible||(!current&&!next);
 const a=current?current.cues.map(cueLabel).join(" · "):"",b=next?"Después: "+next.cues.map(cueLabel).join(" · "):"";
 const changed=now.textContent!==a||later.textContent!==b;
 if(now.textContent!==a)now.textContent=a;if(later.textContent!==b)later.textContent=b;
 if(changed||prev!==box.hidden)syncTransportSpace();
}
$("cueVisible").onchange=()=>{if(cueTimeline)renderCues(cueTimeline,cueStep,cueRange);else $("cueOverview").hidden=!$("cueVisible").checked||!$("cueOverviewList").children.length;syncTransportSpace()};
function renderSections(){
 if(!config||!groups.length)return;
 $("structureSummary").textContent=groups.length+" secciones · "+anchors.length+" acordes";const root=$("sectionCards");root.replaceChildren(...groups.map((g,k)=>{
 const p=core.sectionConfig(config,g.indices[0]),hits=core.sectionBarHits(config,g,1),card=elem("article");card.className="section-card";card.dataset.open=String(openSection===k);
 const toggle=elem("button");toggle.className="section-toggle";toggle.setAttribute("aria-expanded",String(openSection===k));
 const number=elem("span",String(k+1));number.className="section-number";const title=elem("span");title.className="section-row-title";title.append(elem("strong",g.title),elem("small",p.bpm+" BPM · "+g.indices.length+" acordes · "+(p.patterns?.length>1?"Variaciones":p.hits?"Propio":"Inicial")));const chevron=elem("span",openSection===k?"⌃":"⌄");chevron.className="section-chevron";toggle.append(number,title,chevron);toggle.onclick=()=>{stop();openSection=openSection===k?-1:k;rhythmIndex=k;$("barEdit").value=1;renderPattern();renderSections()};card.append(toggle);
 if(openSection!==k)return card;
 const panel=elem("div");panel.className="section-controls";
 const label=elem("label","Velocidad de esta sección"),readout=elem("div");readout.className="section-tempo";const minus=elem("button","−"),plus=elem("button","+"),amount=elem("input");amount.type="number";amount.min=40;amount.max=240;amount.value=p.bpm;amount.setAttribute("aria-label","BPM de "+g.title);readout.append(minus,amount,elem("small","BPM"),plus);label.append(readout);panel.append(label);
 const slider=elem("input");slider.type="range";slider.min=40;slider.max=240;slider.value=p.bpm;slider.setAttribute("aria-label","Velocidad de "+g.title);panel.append(slider);
 function tempo(v){const n=core.clampTempo(Number(v)||p.bpm);sectionUpdate(g,{bpm:n});}
 minus.onclick=()=>tempo(p.bpm-5);plus.onclick=()=>tempo(p.bpm+5);amount.onchange=()=>tempo(amount.value);slider.oninput=()=>amount.value=slider.value;slider.onchange=()=>tempo(slider.value);
 const tempos=elem("div");tempos.className="tempo-labels";tempos.append(elem("small","Tranquilo"),elem("small","Rápido"));tempos.hidden=true;panel.append(tempos);
 const patLabel=elem("label","Rasgueo"),pat=elem("select");pat.replaceChildren(new Option("Rasgueo sencillo independiente","base"),new Option("Suave · abajo en cada pulso","basic"),new Option("Alternado · abajo y arriba","all"),new Option("Alabanza · ocho posiciones","worship"),new Option("Un golpe por compás","ring"),new Option("Vacío · crear desde cero","empty"),new Option("Personalizado","custom"));pat.querySelector('option[value="worship"]').disabled=config.meter!=="4/4"||config.division!==2;pat.value=core.identifyPreset(config,p.hits,hits);pat.onchange=safe(()=>{if(pat.value==="custom")return;if(p.patterns?.length>1&&!window.confirm("¿Reemplazar las variaciones de esta sección?")){renderSections();return;}sectionUpdate(g,{hits:pat.value==="base"?core.presetHits(config,"basic"):core.presetHits(config,pat.value)})});patLabel.append(pat);const rhythmSettings=elem("details");rhythmSettings.className="advanced section-rhythm-settings";rhythmSettings.append(elem("summary","Cambiar patrón o importar código"),patLabel);
 if(p.patterns?.length>1)panel.append(elem("small","Esta sección tiene variaciones por compás. Edítalas en Rasgueo avanzado; cambiar el patrón aquí reemplaza solo esta sección."));const pattern=elem("div");pattern.className="section-pattern";hits.forEach((h,i)=>{const b=elem("button",arrows[h.hit]+(h.accent?"′":""));b.setAttribute("aria-label","Golpe "+(i+1)+": "+h.hit+". Toca para cambiar.");b.onclick=()=>{if(p.patterns?.length>1&&!window.confirm("¿Reemplazar todas las variaciones de esta sección por un único rasgueo?"))return;const next=core.cycleHit(hits,i);sectionUpdate(g,{hits:next})};pattern.append(b)});const rhythmHeading=elem("div");rhythmHeading.className="section-rhythm-heading";rhythmHeading.append(elem("span","Rasgueo actual"),elem("small",p.patterns?.length>1?"Variaciones":p.hits?"Personalizado":"Inicial"));panel.append(rhythmHeading,pattern);
 const importBox=elem("details");importBox.className="advanced";importBox.append(elem("summary","Importar código de rasgueo"));const code=elem("input");code.type="text";code.placeholder="Drdurdru";code.setAttribute("aria-label","Código de rasgueo");const importBtn=elem("button","Importar");importBtn.onclick=safe(()=>{const hits=core.decodeRhythmCode(config,code.value);if(p.patterns?.length>1&&!window.confirm("¿Reemplazar las variaciones de esta sección?"))return;sectionUpdate(g,{hits});note("Rasgueo importado.")});importBox.append(code,importBtn);rhythmSettings.append(importBox);panel.append(rhythmSettings);
 if(k>0){const l=elem("label","Cómo entrar desde la sección anterior"),s=elem("select");s.replaceChildren(new Option("Cambio directo","immediate"),new Option("Cambio gradual de velocidad","gradual"),new Option("Pausa antes de entrar","pause"));s.value=p.transition;s.onchange=()=>sectionUpdate(g,{transition:s.value,pauseMs:s.value==="pause"?(p.pauseMs||1000):0});l.append(s);panel.append(l);if(p.transition==="pause"){const pause=elem("label","Pausa (segundos)"),n=elem("input");n.type="number";n.min=0;n.max=10;n.step=.5;n.value=p.pauseMs/1000;n.onchange=()=>sectionUpdate(g,{pauseMs:core.pauseMilliseconds(n.value)});pause.append(n);panel.append(pause)}}
 const actions=elem("div");actions.className="section-quick-actions";const hear=elem("button",inlineSection===k?"■ Detener":"▶ Escuchar");hear.className="section-hear";hear.onclick=safe(async()=>{if(inlineSection===k){stop();return;}await play(core.groupRange(config,g),k)});const chords=elem("button","♫ Acordes");chords.onclick=()=>{chooseAnchor(g.indices[0]);showStage(1)};const advanced=elem("button","↕ Rasgueo");advanced.onclick=()=>{rhythmIndex=k;$("barEdit").value=1;renderPattern();showStage(2)};actions.append(hear,chords,advanced);panel.append(actions);if(k>0){const transition=elem("button","▶ Escuchar entrada desde "+groups[k-1].title);transition.onclick=safe(async()=>{if(inlineSection===k){stop();return;}await play(core.sectionTransitionRange(config,groups[k-1],g),k)});panel.append(transition)}
 if(groups.length>1){const copyPanel=elem("details");copyPanel.className="advanced section-copy-panel";copyPanel.append(elem("summary","Copiar configuración a otra sección"));const l=elem("label","Destino"),target=elem("select");target.replaceChildren(...groups.map((x,i)=>i===k?null:new Option((i+1)+". "+x.title,String(i))).filter(Boolean));l.append(target);const copy=elem("button","Copiar configuración completa");copy.onclick=safe(()=>{const destIndex=Number(target.value),dest=groups[destIndex];if(!dest)return;const same=g.indices.length===dest.indices.length;const question=same?"¿Copiar tempo, todos los rasgueos, transición, duraciones y resonancia a "+dest.title+"?":"Las secciones tienen diferente cantidad de acordes. ¿Copiar tempo, rasgueos y transición conservando las duraciones de destino?";if(!window.confirm(question))return;if(same&&!confirmTiming())return;stop();const next=core.copySection(config,groups,g,dest,same);core.compile(anchors,next);rememberTiming(next);openSection=destIndex;rhythmIndex=destIndex;anchorIndex=dest.indices[0];$("barEdit").value=1;renderEditor();note(same?"Configuración completa copiada a "+dest.title+".":"Ritmo copiado a "+dest.title+". Se conservaron sus duraciones.");});copyPanel.append(l,copy);panel.append(copyPanel);const quickCopy=elem("button","▣ Copiar");quickCopy.onclick=()=>{copyPanel.open=!copyPanel.open;if(copyPanel.open)copyPanel.scrollIntoView({block:"nearest",behavior:"smooth"});};actions.append(quickCopy)}
 panel.append(cueSectionEditor(g));const status=elem("p","");status.className="note section-listen-status";panel.append(status);card.append(panel);return card;
 }));
}
$("sectionPlayAll").onclick=safe(()=>preview());
$("sectionAdvanced").onclick=()=>showStage(1);
function showStage(n,scroll=true){if(scroll)stop();stage=Math.max(0,Math.min(4,n));$("rhythmDockContext").hidden=stage!==2;for(let i=0;i<5;i++)$("stage"+i).hidden=i!==stage;document.querySelectorAll("#editorSteps [data-stage]").forEach(b=>{const active=Number(b.dataset.stage)===stage;b.setAttribute("aria-pressed",String(active));if(active)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current")});$("stageLabel").textContent="Paso "+(stage+1)+" de 5";$("stageBack").disabled=stage===0;$("stageNext").textContent=stage===3?"Escuchar canto ▶":stage===4?"Volver al rasgueo":"Continuar ›";$("editor").dataset.stage=String(stage);if(stage===3)renderReview();if(stage===0)renderSections();if(stage===2)renderPattern();if(scroll)window.scrollTo(0,0)}
async function preview(range=null){if(mode==="public")return;editorScroll=window.scrollY;practiceRange=range;switchView(false);$("loop").checked=false;await play()}
$("anchorSection").onchange=()=>chooseAnchor(groups[Number($("anchorSection").value)].indices[0]);
$("prevAnchor").onclick=()=>chooseAnchor(anchorIndex-1);$("nextAnchor").onclick=()=>chooseAnchor(anchorIndex+1);
$("anchorStart").onchange=safe(()=>{if(!confirmTiming())return renderEditor();changeTiming(core.moveAnchor(config,groups,anchorIndex,Number($("anchorStart").value)))});
$("undoTiming").onclick=()=>{if(core.canUndo(timingUndo,fingerprint())){stop();config=timingUndo.config;timingUndo=null;$("meter").value=config.meter;divisions();$("division").value=String(config.division);$("bpm").value=config.bpm;renderEditor();note("Ajuste anterior recuperado.")}};
$("hearChord").onclick=safe(()=>preview(core.anchorRange(anchors,config,anchorIndex)));
$("hearSection").onclick=safe(()=>preview(core.groupRange(config,groups.find(g=>g.indices.includes(anchorIndex)))));
$("hearAll").onclick=safe(()=>preview());
$("stageBack").onclick=()=>showStage(stage-1);$("stageNext").onclick=safe(()=>stage===3?preview():stage===4?showStage(2):(validate(),showStage(stage+1)));
document.querySelectorAll("#editorSteps [data-stage]").forEach(b=>b.onclick=safe(()=>{validate();showStage(Number(b.dataset.stage))}));
function setTempo(value){const n=core.clampTempo(value);if(!Number.isFinite(n))return;$("bpm").value=n;$("tempoSlider").value=n;if(config)config.bpm=n;renderReview();renderSections()}
$("bpm").onchange=()=>setTempo(Number($("bpm").value));$("tempoSlider").oninput=()=>setTempo(Number($("tempoSlider").value));$("tempoMinus").onclick=()=>setTempo(Number($("bpm").value)-5);$("tempoPlus").onclick=()=>setTempo(Number($("bpm").value)+5);
$("tapTempo").onclick=()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);if(taps.length>6)taps.shift();if(taps.length>=2){setTempo(60000*(taps.length-1)/(now-taps[0]));$("tempoHelp").textContent="Velocidad detectada: "+$("bpm").value+" BPM."}else $("tempoHelp").textContent="Sigue marcando pulsos."};
$("hearTempo").onclick=safe(async()=>{stop();if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}const generation=epoch;await ctx.resume();if(epoch!==generation)return;const beat=60/Number($("bpm").value),m=core.meters[$("meter").value],start=ctx.currentTime+.05;engine.volume(.7);for(let i=0;i<m.beats*2;i++)engine.click(start+i*beat,i%m.beats===0);note("Escuchando dos compases de referencia.")});
function renderFragments(fp=fingerprint()){
 const sections=window.ShalomStudioCollections.sections($("source").value),select=$("fragmentSelect"),prev=select.value;
 select.replaceChildren(...sections.map(s=>new Option((s.index+1)+". "+s.title,String(s.index))));
 if(sections.some(s=>String(s.index)===prev))select.value=prev;
 $("fragmentEditor").hidden=sections.length<2;showFragment(fp);
}
function showFragment(fp=fingerprint()){
 renderEditingState(fp);
 const range=(config?.fragments||[]).find(r=>r.index===Number($("fragmentSelect").value));
 $("fragmentStart").max=config.totalSteps-1;$("fragmentEnd").max=config.totalSteps;
 $("fragmentStart").value=range?.start??0;$("fragmentEnd").value=range?.end??config.totalSteps;
 $("fragmentStatus").textContent=range?"Rango asignado: "+range.start+"–"+range.end+" (fin exclusivo).":"Sin sincronización publicada para esta sección.";
}
$("fragmentSelect").onchange=()=>showFragment();
$("autoFragment").onclick=safe(()=>{const sections=window.ShalomStudioCollections.sections($("source").value),section=sections[Number($("fragmentSelect").value)];const range=core.suggestFragmentRange(config,groups,section);$("fragmentStart").value=range.start;$("fragmentEnd").value=range.end;$("fragmentStatus").textContent="Rango sugerido. Confirma con Asignar rango."});
$("fragmentSave").onclick=safe(()=>{const range={index:Number($("fragmentSelect").value),start:Number($("fragmentStart").value),end:Number($("fragmentEnd").value)};if(!window.ShalomStudioCollections.validRange(range,config.totalSteps))throw Error("Rango de fragmento inválido.");config.fragments=[...(config.fragments||[]).filter(r=>r.index!==range.index),range];showFragment();});
$("fragmentRemove").onclick=safe(()=>{config.fragments=(config.fragments||[]).filter(r=>r.index!==Number($("fragmentSelect").value));showFragment()});
function rhythmGroup(){return groups[Math.max(0,Math.min(groups.length-1,rhythmIndex))]}
function currentPattern(){
 const {bar,start,hits}=core.sectionBarSelection(config,rhythmGroup(),$("barEdit").value);$("barEdit").value=bar;
 return {start,hits};
}
$("rhythmSection").onchange=()=>{stop();rhythmIndex=Number($("rhythmSection").value);openSection=rhythmIndex;anchorIndex=rhythmGroup().indices[0];$("barEdit").value=1;renderPattern()};
function renderBarContext(position=selectedHit){
 const g=rhythmGroup(),bar=Number($("barEdit").value),ctx=core.barContext(anchors,config,g,bar,position),active=ctx.active===undefined?null:anchors[ctx.active];
 const chord=active?.chord||"Sin acorde en esta posición";
 const title=(rhythmIndex+1)+". "+g.title+" · Compás "+bar+" de "+core.sectionBarCount(config,rhythmGroup());
 $("barSummary").textContent=title;$("barActiveChord").textContent="Acorde en esta posición: "+chord+(active&&config.changes[ctx.active].step<ctx.start?" · continúa del compás anterior":"");
 $("rhythmDockTitle").textContent=title+" · "+chord;
 const lyricAt=line=>$("score").children[line]?.querySelector(".lyric-line")?.textContent?.trim()||"Parte instrumental";
 $("rhythmDockLyric").textContent=active?lyricAt(active.line):"Final del compás · sin acorde";
 $("barLyrics").replaceChildren(...ctx.lines.map(line=>{
  const box=elem("div");box.className="context-line"+(active?.line===line?" context-active":"");
  const original=$("score").children[line];
  if(original){const clone=original.cloneNode(true),chords=clone.querySelector(".chord-line")||(clone.classList.contains("song-standalone-chords")?clone:null);clone.classList.remove("active");clone.querySelectorAll(".active-chord").forEach(n=>n.classList.remove("active-chord"));
   if(chords){let ordinal=0;const lineAnchors=anchors.filter(a=>a.line===line);chords.replaceChildren(...chords.textContent.split(/(\s+)/).map(t=>{if(!t.trim())return document.createTextNode(t);const span=elem("span",t);if(lineAnchors[ordinal++]===active)span.className="context-chord-active";return span;}));}
   box.append(clone);
  }else box.append(elem("div",lyricAt(line)));return box;
 }));
 if(!ctx.lines.length)$("barLyrics").append(elem("div","Sin letra asociada en este compás."));
}
function renderPattern(fp=fingerprint()){
 if(!config||!groups.length)return;rhythmIndex=Math.max(0,Math.min(groups.length-1,rhythmIndex));$("rhythmSection").replaceChildren(...groups.map((g,i)=>new Option((i+1)+". "+g.title,String(i))));$("rhythmSection").value=String(rhythmIndex);$("barEdit").max=core.sectionBarCount(config,rhythmGroup());
 const p=currentPattern(),m=core.resolution(config.meter,config.division),bar=Number($("barEdit").value);selectedHit=Math.max(0,Math.min(p.hits.length-1,selectedHit));$("prevBar").disabled=bar<=1;$("nextBar").disabled=bar>=core.sectionBarCount(config,rhythmGroup());
 const g=rhythmGroup();$("rhythmMeterTempo").textContent=config.meter+" · "+core.sectionConfig(config,g.indices[0]).bpm+" BPM";$("undoRhythm").disabled=!core.canUndo(rhythmUndo,fp);$("rhythmDivision").replaceChildren(...core.divisions[config.meter].map(d=>new Option(d+" posiciones por pulso · "+d*m.beats+" por compás",String(d))));$("rhythmDivision").value=String(config.division);$("grid").dataset.dense=String(m.division>4);$("grid").style.setProperty("--pulse-count",String(m.division));renderBarContext();
 $("preset").querySelector('option[value="worship"]').disabled=config.meter!=="4/4"||m.division!==2;
 $("grid").replaceChildren(...Array.from({length:m.beats},(_,beat)=>{const g=elem("div");g.className="beat-group";g.append(elem("small","Pulso "+(beat+1)));const cells=elem("div");cells.className="beat-cells";for(let j=0;j<m.division;j++){const i=beat*m.division+j,h=p.hits[i],b=elem("button",arrows[h.hit]+(h.accent?"′":""));b.dataset.pulse=String(i);b.setAttribute("aria-pressed",String(selectedHit===i));b.setAttribute("aria-label","Pulso "+(beat+1)+", posición "+(j+1)+": "+h.hit);b.onclick=()=>{selectedHit=i;renderPattern();const panel=$("hitEditor");const r=panel.getBoundingClientRect(),dock=$("editorDock").getBoundingClientRect();if(r.bottom>dock.top)window.scrollBy({top:r.bottom-dock.top+8,behavior:"smooth"});};cells.append(b)}g.append(cells);return g}));
 auditionPattern=p.hits.map(h=>({...h}));
 const hit=p.hits[selectedHit];$("hitSelection").textContent="Pulso "+(Math.floor(selectedHit/m.division)+1)+" · posición "+(selectedHit%m.division+1);document.querySelectorAll("#hitTools [data-hit]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.hit===hit.hit)));$("toggleAccent").setAttribute("aria-pressed",String(hit.accent));
}
function changeHit(value,accent){const previous=core.undoSnapshot(config,{section:rhythmIndex,bar:Number($("barEdit").value),hit:selectedHit});const p=currentPattern(),hits=core.editHit(p.hits,selectedHit,value,accent);config=core.applySectionPattern(config,groups,rhythmGroup(),Number($("barEdit").value),hits,"one");previous.after=fingerprint();rhythmUndo=previous;renderPattern();renderReview()}
document.querySelectorAll("#hitTools [data-hit]").forEach(b=>b.onclick=safe(()=>changeHit(b.dataset.hit,false)));$("toggleAccent").onclick=safe(()=>changeHit(null,true));$("returnRhythm").onclick=()=>showStage(2);$("undoRhythm").onclick=safe(()=>{if(!core.canUndo(rhythmUndo,fingerprint()))return;stop();const prev=rhythmUndo;rhythmUndo=null;config=prev.config;rhythmIndex=prev.section;$("barEdit").value=prev.bar;selectedHit=prev.hit;renderPattern();renderReview();note("Rasgueo anterior recuperado.");});
$("prevBar").onclick=()=>{stop();$("barEdit").value=Math.max(1,Number($("barEdit").value)-1);renderPattern()};$("nextBar").onclick=()=>{stop();$("barEdit").value=Math.min(core.sectionBarCount(config,rhythmGroup()),Number($("barEdit").value)+1);renderPattern()};
async function auditionBar(){
 if(audition){stop();return;}
 stop();validate();const bar=Number($("barEdit").value),g=rhythmGroup(),bounds=core.groupBounds(config,g),startStep=bounds.start+(bar-1)*size(),n=size(),timeline=core.compile(anchors,config),events=timeline.slice(startStep,Math.min(startStep+n,bounds.end));
 const firstChord=events.find(e=>e.chord)?.chord||anchors[anchorIndex]?.chord;if(!firstChord)throw Error("No hay un acorde para escuchar.");
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;
 const beat=60/core.sectionConfig(config,g.indices[0]).bpm/config.division,barTime=n*beat,start=ctx.currentTime+.2;let next=0,last=-1;
 engine.volume(Number($("volume").value)/100);audition=true;$("hearBar").textContent="■ Detener rasgueo";$("auditionStatus").textContent="Edita mientras escuchas; los cambios entran en los próximos golpes.";
 function tick(){if(!audition)return;try{while(start+next*beat<ctx.currentTime+.10){if(!$("repeatBar").checked&&next>=n)break;const i=next%n,t=start+next*beat;next++;if(t<ctx.currentTime-.035)continue;const e=events[i],hit=auditionPattern[i];engine.strum({...e,...(e?hit:{hit:"rest",accent:false}),chord:e?.chord||null,duration:beat},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo:Number($("capo").value)||0});}}catch(e){stop();note(e.message)}}
 function animate(){if(!audition)return;const elapsed=ctx.currentTime-start;if(elapsed>=barTime&&!$("repeatBar").checked){stop();return}const i=Math.max(0,Math.floor(elapsed/beat))%n;if(i!==last||!$("grid").querySelector(".audition-active")){renderBarContext(i);$("grid").querySelector(".audition-active")?.classList.remove("audition-active");$("grid").querySelector('[data-pulse="'+i+'"]')?.classList.add("audition-active");last=i;}frame=requestAnimationFrame(animate)}
 timer=setInterval(tick,25);tick();animate();
}
$("hearBar").onclick=safe(auditionBar);

$("copyPattern").onclick=safe(()=>{if(!window.confirm("¿Usar este rasgueo en toda la sección "+rhythmGroup().title+"?"))return;config=core.applySectionPattern(config,groups,rhythmGroup(),Number($("barEdit").value),currentPattern().hits,"all");renderPattern();renderReview();note("Patrón aplicado solo a "+rhythmGroup().title+".")});
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
// Keep the active line within the unobstructed reading area; manual reading remains available.
let lastFollowedLine=null,followTouchY=null,scoreFont=16,scorePinch=null,pinchConsumed=false;
function setScoreFont(value){
 scoreFont=clampScoreFont(value);$("score").style.setProperty("--studio-score-font",scoreFont+"px");$("scoreSize").value=String(Math.round(scoreFont));$("scoreSmaller").disabled=scoreFont<=10;$("scoreLarger").disabled=scoreFont>=46;
}
function startScorePinch(e){
 const distance=touchDistance(e.touches);if(distance<1)return;
 const center=touchCenter(e.touches),score=$("score"),row=Array.from(score.children).find(r=>{const box=r.getBoundingClientRect();return center.y>=box.top&&center.y<=box.bottom});
 const rect=row?.getBoundingClientRect(),box=score.getBoundingClientRect();
 scorePinch={initial:scoreFont,distance,row,ratioY:rect?Math.max(0,Math.min(1,(center.y-rect.top)/Math.max(1,rect.height))):0,contentX:score.scrollLeft+center.x-box.left};
 pinchConsumed=true;followTouchY=null;
 if(e.cancelable)e.preventDefault();
}
function moveScorePinch(e){
 if(!scorePinch){startScorePinch(e);return;}
 if(e.cancelable)e.preventDefault();
 const p=scorePinch,center=touchCenter(e.touches),score=$("score");
 setScoreFont(pinchFont(p.initial,p.distance,touchDistance(e.touches)));
 if(p.row?.isConnected){const rect=p.row.getBoundingClientRect();const delta=rect.top+rect.height*p.ratioY-center.y;if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:"instant"});}
 const box=score.getBoundingClientRect();score.scrollLeft=p.contentX*(scoreFont/p.initial)-(center.x-box.left);
}
function endScoreTouch(e){
 if(e.touches.length<2){if(scorePinch){scorePinch=null;lastFollowedLine=null;}followTouchY=null;}
 if(e.touches.length===0)pinchConsumed=false;
}
$("scoreSmaller").onclick=()=>setScoreFont(scoreFont-1);
$("scoreLarger").onclick=()=>setScoreFont(scoreFont+1);
$("scoreReset").onclick=()=>setScoreFont(16);
setScoreFont(16);

function syncTransportSpace(){
 if($("player").hidden)return;
 const h=$("transport").getBoundingClientRect().height;
 $("player").style.paddingBottom=Math.ceil(h+28)+"px";
}
function followLine(line,force=false){
 if(scorePinch||pinchConsumed||$("player").hidden||$("followScore").getAttribute("aria-pressed")!=="true"||!$("playerExtras").hidden||line==="")return;
 if(!force&&lastFollowedLine===line)return;
 const row=$("score").children[Number(line)];if(!row)return;
 lastFollowedLine=line;
 const delta=followTarget(row.getBoundingClientRect(),$("transport").getBoundingClientRect().top);
 if(delta)window.scrollBy({top:delta,behavior:"instant"});
}
function setFollow(value){
 const b=$("followScore");b.setAttribute("aria-pressed",String(value));b.textContent=value?"✓ Seguir letra":"Seguir letra";
 if(value){lastFollowedLine=null;followLine($("score").dataset.activeLine||"",true);}
}
function playerPanel(name=null){
 for(const [id,button] of [["diagramPanel","toggleDiagram"],["playerSettings","togglePlayerSettings"]]){
  const open=id===name;$(id).hidden=!open;$(button).setAttribute("aria-expanded",String(open));
 }
 $("playerExtras").hidden=!name;syncTransportSpace();if(!name)followLine($("score").dataset.activeLine||"",true);
}
$("followScore").onclick=()=>setFollow($("followScore").getAttribute("aria-pressed")!=="true");
$("toggleDiagram").onclick=()=>playerPanel($("diagramPanel").hidden?"diagramPanel":null);
$("togglePlayerSettings").onclick=()=>playerPanel($("playerSettings").hidden?"playerSettings":null);
$("score").addEventListener("touchstart",e=>{if(e.touches.length>=2){startScorePinch(e);return;}if(!pinchConsumed)followTouchY=e.touches[0]?.clientY??null;},{passive:false});
$("score").addEventListener("touchmove",e=>{
 if(e.touches.length>=2){moveScorePinch(e);return;}
 if(!pinchConsumed&&playing&&followTouchY!==null&&Math.abs((e.touches[0]?.clientY??followTouchY)-followTouchY)>14)setFollow(false);
},{passive:false});
$("score").addEventListener("touchend",endScoreTouch,{passive:true});
$("score").addEventListener("touchcancel",endScoreTouch,{passive:true});
$("score").addEventListener("wheel",e=>{if(playing&&Math.abs(e.deltaY)>Math.abs(e.deltaX))setFollow(false)},{passive:true});
window.addEventListener("resize",syncTransportSpace);
if(typeof ResizeObserver!=="undefined")new ResizeObserver(syncTransportSpace).observe($("transport"));
// The compiled playback timeline is read-only; index once per active timeline.
let indexedTimeline=null,upcomingIndices=null;
function nextPlaybackChord(timeline,index){
 if(indexedTimeline!==timeline){upcomingIndices=core.upcomingChordIndices(timeline);indexedTimeline=timeline;}
 return timeline[upcomingIndices[index]];
}
let indexedAnchors=null,activeAnchorIndex=null;
function playbackAnchor(id){
 if(indexedAnchors!==anchors){activeAnchorIndex=core.indexAnchors(anchors);indexedAnchors=anchors;}
 return activeAnchorIndex.get(id);
}
function showStep(timeline,i){
 const e=timeline[i];if(!e)return;renderCues(timeline,i,practiceRange);originalScore=null;const n=size(),active=playbackAnchor(e.anchorId),anchorIndex=active?.index??-1,parts=config.sections||[],part=anchorIndex<0?null:parts.filter(p=>p.index<=anchorIndex).at(-1),sectionStart=part?config.changes[part.index].step:0,sectionEnd=part?(config.changes[parts.find(p=>p.index>part.index)?.index]?.step??config.endStep??timeline.length):timeline.length,local=e.step-sectionStart,bar=Math.floor(local/n),beat=Math.floor(local%n/config.division),start=sectionStart+bar*n;
 if($("chord").textContent!==(e.chord||"—")){$("chord").textContent=e.chord||"—";diagram(e.chord)}
 $("transportSection").textContent=anchors[anchorIndex]?.section||"Inicio";$("where").textContent="Compás "+(bar+1)+" · Pulso "+(beat+1)+(e.tempo?" · "+Math.round(e.tempo)+" BPM":"");
 const upcoming=nextPlaybackChord(timeline,i);
 $("transportChord").textContent=(e.chord||"—")+" → "+(upcoming?.chord||"Fin");
 $("transportWhere").textContent=$("where").textContent;
 const live=$("live"), pattern=timeline.slice(start,Math.min(start+n,sectionEnd)).map(x=>arrows[x.hit]+(x.accent?"′":""));
 const key=pattern.join("|");
 if(live.dataset.pattern!==key){
  live.replaceChildren(...pattern.map(text=>{const b=elem("button",text);b.disabled=true;return b}));
  live.dataset.pattern=key;
 }
 live.querySelector(".active")?.classList.remove("active");
 const currentPulse=live.children[i-start];currentPulse?.classList.add("active");if(currentPulse){const r=currentPulse.getBoundingClientRect(),v=live.getBoundingClientRect();if(r.left<v.left||r.right>v.right)live.scrollLeft+=r.left-v.left-(v.width-r.width)/2;}
 const anchor=active?.anchor,score=$("score");
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
    const index=active.ordinal;target.querySelectorAll(".chord-token")[index]?.classList.add("active-chord");
   }}
  score.dataset.activeAnchor=String(e.anchorId);
 }
 if(playing)followLine(line);
}
function stop(){cueTimeline=null;cueEvents=[];$("liveCue").hidden=true;syncTransportSpace();indexedTimeline=null;upcomingIndices=null;indexedAnchors=null;activeAnchorIndex=null;const wasInline=inlineSection;inlineSection=null;playing=false;audition=false;epoch++;clearInterval(timer);cancelAnimationFrame(frame);engine?.stop();$("hearBar").textContent="▶ Escuchar compás";$("auditionStatus").textContent="";$("grid").querySelector(".audition-active")?.classList.remove("audition-active");if(wasInline!==null){const b=$("sectionCards").querySelector(".section-hear");if(b)b.textContent="▶ Escuchar";const s=$("sectionCards").querySelector(".section-listen-status");if(s)s.textContent="Escucha detenida."}}
function prepareSequence(){
 const tracks=sequence.map(p=>{
  $("source").value=p.song.lyrics;const a=core.anchorsFromRows(readRows()),cfg=window.ShalomStudioCodec.decode(a,p.arrangement);
  const timeline=core.sequenceTrackTimeline(a,cfg,p,shifted);
  for(const chord of new Set(timeline.map(e=>e.chord).filter(Boolean)))guitar.voicing(chord);
  return {...p,anchors:a,config:cfg,timeline};
 });
 return tracks;
}
function displayTrack(track,index){
 anchors=track.anchors;config=track.config;practiceRange=track.range||null;
 $("source").value=track.song.lyrics;
 renderPlaybackScore(track.song.lyrics,track.shift);
 $("studioTitle").textContent=sequenceTitle;
 $("labNote").textContent=(index+1)+"/"+sequence.length+" · "+track.song.title+(track.range?.title?" · "+track.range.title:"");
 $("shift").value=track.shift;$("capo").value=track.capo;
 $("score").dataset.activeLine="";$("score").dataset.activeAnchor="";lastFollowedLine=null;
}
async function playSequence(){
 stop();const tracks=prepareSequence(),speed=core.playbackSpeed($("speed").value);
 const schedule=window.ShalomStudioCollections.scheduleTracks(tracks,speed);
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;
 playing=true;lastFollowedLine=null;playerPanel();engine.volume(Number($("volume").value)/100);
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
  const position=core.sequenceFrame(schedule,elapsed);
  if(position.finished){stop();note("Popurrí finalizado.");return}
  const index=position.track,track=tracks[index];
  if(index!==activeTrack){displayTrack(track,index);activeTrack=index;lastStep=-1}
  if(position.transition){$("liveCue").hidden=true;syncTransportSpace();$("where").textContent="Transición · "+position.remaining.toFixed(1)+" s";$("transportWhere").textContent=$("where").textContent;$("live").querySelector(".active")?.classList.remove("active");}
  else{const i=position.step;if(i!==lastStep){showStep(track.timeline,i);lastStep=i}}
  frame=requestAnimationFrame(animate);
 }
 timer=setInterval(tick,25);tick();animate();note("Popurrí continuo · acompañamientos oficiales.");
}
async function play(range=null,inline=null){
 if(sequence)return playSequence();
 stop();validate();const move=Number($("shift").value);if(!Number.isInteger(move)||Math.abs(move)>12)throw Error("Transposición inválida.");const timeline=core.compile(anchors,config,c=>shifted(c,move));for(const c of new Set(timeline.map(e=>e.chord).filter(Boolean)))guitar.voicing(c);
 if(inline===null){renderPlaybackScore($("source").value,move);$("score").dataset.activeLine="";$("score").dataset.activeAnchor="";lastFollowedLine=null;playerPanel();}
 const speed=core.playbackSpeed($("speed").value),capo=Number($("capo").value);if(!Number.isInteger(capo)||capo<0||capo>12)throw Error("Capo inválido");
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error("Audio no disponible en este dispositivo.");ctx=new Audio();engine=guitar.createEngine(ctx)}
 const generation=epoch;await ctx.resume();if(epoch!==generation)return;playing=true;inlineSection=inline;engine.volume(Number($("volume").value)/100);
 const {first,end,clock}=core.playbackRange(timeline,config,range,practiceRange,speed);
 const count=end-first,start=ctx.currentTime+.16;let next=0,last=-1;
 const loop=()=>inline===null&&$("loop").checked;
 if(inline!==null){const b=$("sectionCards").querySelector(".section-hear");if(b)b.textContent="■ Detener";}
 const tick=()=>{if(!playing)return;try{while(true){if(!loop()&&next>=count)break;const {event:e,time:t,gap}=core.playbackEvent(timeline,first,end,clock,speed,start,next);
   if(gap&&t-gap<ctx.currentTime+.12&&t>=ctx.currentTime-.03&&next!==lastGap){engine.releaseAt(Math.max(t-gap,ctx.currentTime));lastGap=next;}
   if(t>=ctx.currentTime+.12)break;next++;if(t<ctx.currentTime-.03)continue;const sound=inline===null?e:core.liveSectionEvent(e,anchors,config,groups[inline]);engine.strum({...sound,duration:e.duration/speed},Math.max(t,ctx.currentTime),{tone:$("tone").value,capo});if(e.release)engine.releaseAt(Math.max(t+e.duration/speed,ctx.currentTime));if($("metro").checked&&e.step%config.division===0)engine.click(Math.max(t,ctx.currentTime),e.beat===0);
 }}catch(e){stop();note(e.message)}};
 let lastGap=-1;
 function animate(){if(!playing)return;const elapsed=Math.max(0,ctx.currentTime-start),position=core.playbackFrame(timeline,first,end,clock,speed,elapsed,loop());if(position.finished){stop();note("Práctica finalizada.");return}const {index:i,paused}=position;if(paused){if(inline===null){$("liveCue").hidden=true;syncTransportSpace();$("where").textContent="Pausa entre secciones";$("transportWhere").textContent="Pausa entre secciones";}else{const s=$("sectionCards").querySelector(".section-listen-status");if(s)s.textContent="Pausa entre secciones";}last=-1;}else if(i!==last){if(inline===null)showStep(timeline,i);else{const s=$("sectionCards").querySelector(".section-listen-status");if(s)s.textContent=(timeline[i].chord||"Silencio")+" · "+Math.round(timeline[i].tempo)+" BPM";}last=i}frame=requestAnimationFrame(animate)}
 timer=setInterval(tick,25);tick();animate();note("Guitarra sintetizada · reproducción local.");
}
function switchView(edit){if(mode==="public"&&edit)return;stop();if(!edit){validate();const move=Number($("shift").value)||0;renderPlaybackScore($("source").value,move);$("score").dataset.activeLine="";$("score").dataset.activeAnchor="";lastFollowedLine=null;showStep(core.compile(anchors,config,c=>shifted(c,move)),practiceRange?.start??0)}else{practiceRange=null;renderEditor();showStage(stage,false)}$("editor").hidden=!edit;$("player").hidden=edit;$("viewEdit").setAttribute("aria-pressed",String(edit));$("viewPlay").setAttribute("aria-pressed",String(!edit));window.scrollTo(0,edit?editorScroll:0);if(!edit){playerPanel();syncTransportSpace();}}
function changeDivision(division){
 if(!config||division===config.division)return;
 const old=config.division;
 try{
  const next=core.redivide(config,division);core.compile(anchors,next);stop();
  rememberTiming(next);
  selectedHit=Math.min(size()-1,Math.round(selectedHit*division/old));
  $("division").value=String(division);renderEditor();note("Cuadrícula actualizada. Se conservaron los golpes, tiempos y secciones.");
 }catch(e){$("division").value=String(config.division);$("rhythmDivision").value=String(config.division);throw e;}
}
$("rhythmDivision").onchange=safe(()=>changeDivision(Number($("rhythmDivision").value)));
function changeResolution(){if(!config){divisions();return;}const meter=$("meter").value,division=Number($("division").value);if(meter===config.meter){changeDivision(division);return;}if(!window.confirm("Cambiar el compás reinicia duración, rasgueo e indicaciones. ¿Continuar?")){$("meter").value=config.meter;divisions();$("division").value=config.division;return;}divisions();generate()}
$("meter").onchange=safe(changeResolution);$("division").onchange=safe(changeResolution);$("generate").onclick=safe(()=>{if(!config||window.confirm("¿Reemplazar la preparación musical actual, incluidas sus indicaciones?"))generate()});$("barEdit").onchange=safe(()=>{stop();renderPattern()});
$("total").onchange=safe(()=>{const n=Number($("total").value);if(!Number.isInteger(n)||n<1||n>512)throw Error("Número de compases inválido.");const total=n*size();if((config.endStep!==undefined&&config.endStep>total)||config.changes.some(c=>c.step>=total)||config.patterns.some(p=>p.start>=total)||(config.fragments||[]).some(r=>r.end>total))throw Error("Hay acordes o patrones fuera de la duración elegida.");changeTiming({...config,totalSteps:total})});
$("applyPreset").onclick=safe(()=>{const choice=$("preset").value,scope=$("patternScope").value,g=rhythmGroup();if(scope!=="one"&&!window.confirm("¿Aplicar el patrón al rango elegido de "+g.title+"?"))return;config=core.applySectionPattern(config,groups,g,Number($("barEdit").value),core.presetHits(config,choice),scope);renderPattern();renderReview();note("Patrón aplicado solo a "+g.title+".")});
$("save").onclick=safe(()=>submitSave("draft"));
$("publish").onclick=safe(()=>submitSave("publish"));
$("viewEdit").onclick=safe(()=>switchView(true));$("viewPlay").onclick=safe(()=>{if(mode!=="public"){editorScroll=window.scrollY;practiceRange=null}switchView(false)});$("play").onclick=safe(play);$("pause").onclick=()=>{stop();note("Reproducción detenida.")};$("volume").oninput=()=>engine?.volume(Number($("volume").value)/100);
window.__shalomStudioBack=function(){
 if(backPending)return false;
 if(!$("player").hidden&&!$("playerExtras").hidden){playerPanel();return false;}
 stop();
 if(mode!=="public"&&config){
  if(!$("player").hidden){switchView(true);return false;}
  if(stage>0){showStage(stage-1);return false;}
  if(pendingSave!==null){note("Espera la confirmación del guardado.");return false;}
  if(baseline!==fingerprint()||(!publishedFingerprint&&!draftFingerprint&&mode==="admin")){backPending=true;const leave=window.confirm("Hay cambios sin guardar. ¿Salir y perder estos cambios?");backPending=false;if(!leave)return false;}
 }
 return true;
};
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});window.addEventListener("pagehide",()=>{stop();engine?.dispose();ctx?.close().catch(()=>{});ctx=null;engine=null});
if(!embedded){divisions();try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved){$("source").value=saved.source;config=saved.config;$("meter").value=config.meter;divisions();$("division").value=config.division;$("bpm").value=config.bpm;anchors=core.anchorsFromRows(readRows());validate();renderEditor()}else generate()}catch(e){generate();note("No se pudo recuperar el borrador anterior: "+e.message)}
showStage(0,false);baseline=fingerprint();renderSaveState();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./offline-sw.js").catch(()=>note("No se pudo preparar la caché offline."));
}else{
 $("studioMain").hidden=true;
 window.addEventListener("message",e=>{if(e.origin!==location.origin||e.source!==window.parent)return;const d=e.data||{};if(d.type==="shalom-studio-result"&&mode==="admin"){finishSave(d.ok,d.message);return}if(d.type!=="shalom-studio-init"||initialized)return;initialized=true;try{mode=d.mode==="admin"?"admin":"public";practiceRange=mode==="public"?d.range||null:null;sequence=mode==="public"&&Array.isArray(d.sequence)&&d.sequence.length>=2?d.sequence:null;sequenceTitle=String(d.title||"Popurrí");baseRevision=d.song.revision;storageKey=labKey+"."+d.song.id;$("source").value=d.song.lyrics;$("source").readOnly=true;$("sourceLabel").hidden=true;$("labHeader").hidden=true;$("studioTitle").textContent=d.song.title+(practiceRange?.title?" · "+practiceRange.title:"");$("labNote").textContent=mode==="admin"?"Configura los acordes existentes. Los borradores no son públicos.":"Acompañamiento publicado · guitarra sintetizada";$("shift").value=Number(d.shift)||0;$("capo").value=Number(d.capo)||0;anchors=core.anchorsFromRows(readRows());let draft=null;if(mode==="admin"){try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved?.revision===baseRevision&&saved.config?.source===core.signature(anchors))draft=saved.config}catch{}}const published=d.arrangement?window.ShalomStudioCodec.decode(anchors,d.arrangement):null;publishedFingerprint=published?JSON.stringify(window.ShalomStudioCodec.encode(anchors,published)):null;draftFingerprint=draft?JSON.stringify(window.ShalomStudioCodec.encode(anchors,draft)):null;const recovered=mode==="admin"&&d.recoveryDraft?window.ShalomStudioCodec.decode(anchors,d.recoveryDraft):null;config=recovered||draft||published;if(!config){if(mode==="public")throw Error("No hay acompañamiento disponible.");divisions();generate()}else{$("meter").value=config.meter;divisions();$("division").value=String(config.division);$("bpm").value=config.bpm;validate();renderEditor()}if(practiceRange){if(!(config.fragments||[]).some(r=>r.start===practiceRange.start&&r.end===practiceRange.end))throw Error("Fragmento sin sincronización publicada.");$("loop").checked=false;}$("publish").hidden=mode!=="admin";$("studioNav").hidden=mode==="public";$("studioMain").hidden=false;switchView(mode==="admin");baseline=recovered?null:fingerprint();renderSaveState();if(recovered)note("Revisión histórica cargada para editar. Guarda un borrador o publica solo después de revisarla.");if(sequence){$("studioTitle").textContent=sequenceTitle;$("labNote").textContent="Popurrí continuo · "+sequence.length+" fragmentos";$("loop").checked=false;$("loop").closest("label").hidden=true;$("shift").closest("label").hidden=true;$("capo").closest("label").hidden=true;}}catch(err){$("studioMain").hidden=false;$("editor").hidden=true;$("player").hidden=true;$("studioNav").hidden=true;note(err.message)}});
 window.parent.postMessage({type:"shalom-studio-ready"},location.origin);
}
})();