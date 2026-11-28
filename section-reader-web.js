/* Browser adapter for the shared section engine. Keep the rendered chord rows
 * in the original DOM: transpose, cues, print and the normal reader stay intact. */
(()=>{
 const core=globalThis.ShalomSectionReaderCore;
 if(!core)return;
 const readers=new WeakMap();
 const clamp=n=>Math.min(46,Math.max(10,Math.round(n*10)/10));
 const scoreOf=target=>target.firstElementChild?.classList.contains("score-proportional")?target.firstElementChild:target;
 function rowsOf(target){
  return [...scoreOf(target).children].map(node=>({
   kind:(node.classList.contains("song-section-label")||node.classList.contains("score-section"))?"section":(node.classList.contains("song-empty-line")||node.classList.contains("score-empty"))?"space":"content",
   text:node.textContent,node
  }));
 }
 function mount(target,key,options={}){
  if(!target)return;
  update(target,key,options,[{target,article:null,title:""}]);
 }
 function mountCollection(container,key,options={}){
  if(!container)return;
  const entries=[...container.querySelectorAll(options.articleSelector)].map(article=>({article,target:article.querySelector(options.scoreSelector),title:article.querySelector("h3")?.textContent||"Canto"})).filter(entry=>entry.target);
  update(container,key,options,entries);
 }
 function update(target,key,options,entries){
  if(!target)return;
  let state=readers.get(target);
  if(!state){
   const controls=document.createElement("div");
   controls.className="section-reader-controls";
   controls.innerHTML='<button type="button" data-action="toggle" aria-pressed="false">Lectura por secciones</button><div class="section-reader-navigation" hidden><select aria-label="Sección del canto"></select><div class="section-reader-buttons"><button type="button" data-action="previous" aria-label="Sección anterior">‹ Anterior</button><span aria-live="polite"></span><button type="button" data-action="next" aria-label="Siguiente sección">Siguiente ›</button></div><div class="section-reader-buttons"><button type="button" data-action="auto" aria-pressed="true">Automático</button><button type="button" data-action="width" aria-pressed="false">Al ancho</button><button type="button" data-action="smaller" aria-label="Reducir letra">A−</button><button type="button" data-action="larger" aria-label="Aumentar letra">A+</button></div></div>';
   target.before(controls);
   state={target,controls,key,index:0,enabled:false,mode:"auto",font:16,sections:[],entries:[],options,frame:0};
   readers.set(target,state);
   controls.addEventListener("click",event=>{
    const action=event.target.closest("[data-action]")?.dataset.action;
    if(action==="toggle"){state.enabled=!state.enabled;apply(state);if(state.enabled)controls.scrollIntoView({block:"start"});}
    if(action==="previous"||action==="next"){state.index=core.moveIndex(state.index,action==="previous"?-1:1,state.sections.length);apply(state);}
    if(action==="auto"||action==="width"){state.mode=action;apply(state);}
    if(action==="smaller"||action==="larger")adjust(target,action==="smaller"?-1:1);
   });
   controls.querySelector("select").addEventListener("change",event=>{state.index=core.moveIndex(Number(event.target.value),0,state.sections.length);apply(state);});
   const resize=()=>schedule(state);
   window.addEventListener("resize",resize);
   window.visualViewport?.addEventListener("resize",resize);
   document.fonts?.ready.then(resize);
  }
  const previous=state.key===key?state.sections[state.index]?.key:null;
  if(state.key!==key){state.key=key;state.index=0;state.enabled=false;state.mode="auto";state.font=16;}
  state.options=options;
  state.entries=entries;
  state.sections=core.navigation(entries.map(entry=>({rows:rowsOf(entry.target)})));
  const same=state.sections.findIndex(section=>section.key===previous);
  state.index=same>=0?same:core.moveIndex(state.index,0,state.sections.length);
  if(!state.sections.length)state.enabled=false;
  state.controls.hidden=!state.sections.length;
  const select=state.controls.querySelector("select");
  select.replaceChildren(...state.sections.map((section,i)=>{
   const option=document.createElement("option");option.value=String(i);option.textContent=(entries[section.entryIndex]?.title?entries[section.entryIndex].title+" · ":"")+(section.sectionIndex+1)+". "+section.title;return option;
  }));
  apply(state);
 }
 function setFont(state,font){
  state.font=clamp(font);
  state.entries[state.sections[state.index]?.entryIndex]?.target.style.setProperty("--section-reader-font",state.font+"px");
 }
 function apply(state){
  const {controls,enabled,sections,index,entries}=state;
  const current=sections[index],selected=new Set(current?.rows.map(row=>row.node)||[]);
  entries.forEach(({target,article},i)=>{
   const active=enabled&&i===current?.entryIndex;
   article?.classList.toggle("section-reader-excluded-article",enabled&&!active);
   for(const node of scoreOf(target).children)node.classList.toggle("section-reader-excluded",active&&!selected.has(node));
   if((active||!enabled)&&scoreOf(target)!==target)window.ShalomScoreReader?.relayout(scoreOf(target));
   target.classList.toggle("section-reader-active",active);
   if(!active)target.style.removeProperty("--section-reader-font");
  });
  controls.querySelector(".section-reader-navigation").hidden=!enabled;
  const toggle=controls.querySelector('[data-action="toggle"]');
  toggle.textContent=enabled?"Lectura normal":"Lectura por secciones";
  toggle.setAttribute("aria-pressed",String(enabled));
  controls.querySelector("select").value=String(index);
  controls.querySelector("[aria-live]").textContent=sections.length?(index+1)+" / "+sections.length:"0 / 0";
  for(const [action,delta,label,boundary] of [["previous",-1,"‹ Anterior","‹ Canto anterior"],["next",1,"Siguiente ›","Siguiente canto ›"]]){
   const button=controls.querySelector('[data-action="'+action+'"]'),neighbor=sections[index+delta];
   button.disabled=!neighbor;
   button.textContent=neighbor&&neighbor.entryIndex!==current?.entryIndex?boundary:label;
   button.setAttribute("aria-label",button.textContent);
  }
  for(const mode of ["auto","width"])controls.querySelector('[data-action="'+mode+'"]').setAttribute("aria-pressed",String(state.mode===mode));
  if(!enabled)return;
  setFont(state,state.font);
  schedule(state);
 }
 function schedule(state){
  if(!state.enabled||state.frame)return;
  state.frame=requestAnimationFrame(()=>{state.frame=0;fit(state);});
 }
 function fit(state){
  const target=state.entries[state.sections[state.index]?.entryIndex]?.target;
  if(!state.enabled||!target?.clientWidth)return;
  const viewport=window.visualViewport;
  // Native browser pinch zoom is left untouched, especially on Safari/iPhone.
  if(viewport&&Math.abs(viewport.scale-1)>.02)return;
  const stickyHeight=state.options.sticky?.()?.getBoundingClientRect().height||0;
  state.controls.style.scrollMarginTop=(stickyHeight+8)+"px";
  if(state.mode==="manual")return;
  const controlRect=state.controls.getBoundingClientRect(),scoreRect=target.getBoundingClientRect();
  const gap=Math.max(0,scoreRect.top-controlRect.bottom)||0;
  const available=Math.max(1,(viewport?.height||window.innerHeight)-stickyHeight-controlRect.height-gap-20);
  const font=core.chooseFitFont(12,15,n=>{
   setFont(state,n);
   const score=scoreOf(target);
   if(score!==target)window.ShalomScoreReader?.relayout(score);
   return target.scrollWidth<=target.clientWidth+1&&score.scrollWidth<=score.clientWidth+1&&(state.mode==="width"||target.getBoundingClientRect().height<=available);
  });
  setFont(state,font);
  if(scoreOf(target)!==target)window.ShalomScoreReader?.relayout(scoreOf(target));
 }
 function adjust(target,delta){
  const state=readers.get(target);
  if(!state?.enabled)return false;
  state.mode="manual";setFont(state,state.font+delta);apply(state);return true;
 }
 function refresh(target){const state=readers.get(target);if(state)schedule(state);}
 function selectEntry(target,index){
  const state=readers.get(target);
  if(!state?.enabled)return false;
  const next=state.sections.findIndex(section=>section.entryIndex===index);
  if(next<0)return false;
  state.index=next;apply(state);state.controls.scrollIntoView({block:"start"});return true;
 }
 globalThis.ShalomSectionReaderWeb=Object.freeze({mount,mountCollection,selectEntry,adjust,refresh});
})();
