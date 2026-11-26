/* Browser adapter for the shared section engine. Keep the rendered chord rows
 * in the original DOM: transpose, cues, print and the normal reader stay intact. */
(()=>{
 const core=globalThis.ShalomSectionReaderCore;
 if(!core)return;
 const readers=new WeakMap();
 const clamp=n=>Math.min(46,Math.max(10,Math.round(n*10)/10));
 function rowsOf(target){
  return [...target.children].map(node=>({
   kind:node.classList.contains("song-section-label")?"section":node.classList.contains("song-empty-line")?"space":"content",
   text:node.textContent,node
  }));
 }
 function mount(target,key,options={}){
  if(!target)return;
  let state=readers.get(target);
  if(!state){
   const controls=document.createElement("div");
   controls.className="section-reader-controls";
   controls.innerHTML='<button type="button" data-action="toggle" aria-pressed="false">Lectura por secciones</button><div class="section-reader-navigation" hidden><select aria-label="Sección del canto"></select><div class="section-reader-buttons"><button type="button" data-action="previous" aria-label="Sección anterior">‹ Anterior</button><span aria-live="polite"></span><button type="button" data-action="next" aria-label="Siguiente sección">Siguiente ›</button></div><div class="section-reader-buttons"><button type="button" data-action="auto" aria-pressed="true">Automático</button><button type="button" data-action="width" aria-pressed="false">Al ancho</button><button type="button" data-action="smaller" aria-label="Reducir letra">A−</button><button type="button" data-action="larger" aria-label="Aumentar letra">A+</button></div></div>';
   target.before(controls);
   state={target,controls,key,index:0,enabled:false,mode:"auto",font:16,sections:[],options,frame:0};
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
  if(state.key!==key){state.key=key;state.index=0;state.enabled=false;state.mode="auto";state.font=16;}
  state.options=options;
  state.sections=core.sectionsOf(rowsOf(target));
  state.index=core.moveIndex(state.index,0,state.sections.length);
  const select=state.controls.querySelector("select");
  select.replaceChildren(...state.sections.map((section,i)=>{
   const option=document.createElement("option");option.value=String(i);option.textContent=(i+1)+". "+section.title;return option;
  }));
  apply(state);
 }
 function setFont(state,font){
  state.font=clamp(font);
  state.target.style.setProperty("--section-reader-font",state.font+"px");
 }
 function apply(state){
  const {target,controls,enabled,sections,index}=state;
  const selected=new Set(sections[index]?.rows.map(row=>row.node)||[]);
  for(const node of target.children)node.classList.toggle("section-reader-excluded",enabled&&!selected.has(node));
  target.classList.toggle("section-reader-active",enabled);
  controls.querySelector(".section-reader-navigation").hidden=!enabled;
  const toggle=controls.querySelector('[data-action="toggle"]');
  toggle.textContent=enabled?"Lectura normal":"Lectura por secciones";
  toggle.setAttribute("aria-pressed",String(enabled));
  controls.querySelector("select").value=String(index);
  controls.querySelector("[aria-live]").textContent=(index+1)+" / "+sections.length;
  controls.querySelector('[data-action="previous"]').disabled=index===0;
  controls.querySelector('[data-action="next"]').disabled=index>=sections.length-1;
  for(const mode of ["auto","width"])controls.querySelector('[data-action="'+mode+'"]').setAttribute("aria-pressed",String(state.mode===mode));
  if(!enabled){target.style.removeProperty("--section-reader-font");return;}
  setFont(state,state.font);
  schedule(state);
 }
 function schedule(state){
  if(!state.enabled||state.frame)return;
  state.frame=requestAnimationFrame(()=>{state.frame=0;fit(state);});
 }
 function fit(state){
  if(!state.enabled||!state.target.clientWidth)return;
  const viewport=window.visualViewport;
  // Native browser pinch zoom is left untouched, especially on Safari/iPhone.
  if(viewport&&Math.abs(viewport.scale-1)>.02)return;
  const stickyHeight=state.options.sticky?.()?.getBoundingClientRect().height||0;
  state.controls.style.scrollMarginTop=(stickyHeight+8)+"px";
  if(state.mode==="manual")return;
  const available=Math.max(1,(viewport?.height||window.innerHeight)-stickyHeight-state.controls.getBoundingClientRect().height-20);
  const font=core.chooseFitFont(10,46,n=>{
   setFont(state,n);
   return state.target.scrollWidth<=state.target.clientWidth+1&&(state.mode==="width"||state.target.getBoundingClientRect().height<=available);
  });
  setFont(state,font);
 }
 function adjust(target,delta){
  const state=readers.get(target);
  if(!state?.enabled)return false;
  state.mode="manual";setFont(state,state.font+delta);apply(state);return true;
 }
 function refresh(target){const state=readers.get(target);if(state)schedule(state);}
 globalThis.ShalomSectionReaderWeb=Object.freeze({mount,adjust,refresh});
})();
