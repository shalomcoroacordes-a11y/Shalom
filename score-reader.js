/* Renderizador proporcional: recibe el HTML del intérprete con anclajes.
 * Construye su propio DOM antes de insertarlo; no modifica el texto guardado.
 * Las coordenadas de cada acorde se obtienen del renglón real de letra.
 */
(function(root){
 "use strict";
 const doc=root.document;
 const create=(tag,className,text)=>{
  const el=doc.createElement(tag);el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 let fontRequest;
 function loadFont(){
  if(!fontRequest){
   let timer;
   fontRequest=Promise.race([checkFont(),new Promise(resolve=>{timer=root.setTimeout(()=>resolve(false),1800);})]).finally(()=>root.clearTimeout(timer));
  }
  return fontRequest;
 }
 async function checkFont(){
  if(!doc.fonts)return false;
  try{
   const faces=await doc.fonts.load('400 16px Inter',"Áñ");
   const bold=await doc.fonts.load('700 16px Inter',"G/B");
   return faces.length>0&&bold.length>0&&[...faces,...bold].every(face=>face.status==="loaded");
  }catch(_){return false;}
 }
 function buildMarkup(markup){
  const template=doc.createElement("template");
  template.innerHTML=markup;
  const score=create("div","score-proportional");
  for(const block of Array.from(template.content.children)){
   if(block.classList.contains("song-reader-cue")){
    score.append(block.cloneNode(true));continue;
   }
   if(!block.hasAttribute("data-chord-anchors")){
    const kind=block.classList.contains("song-section-label")?"score-section":
     block.classList.contains("song-empty-line")?"score-empty":
     block.classList.contains("song-standalone-chords")?"score-instrumental":"score-plain";
    score.append(create("div",kind,block.textContent));continue;
   }
   const line=create("div","score-pair");
   const chords=create("div","score-chords");
   const lyric=create("div","score-lyric",block.querySelector(".lyric-line").textContent);
   const anchors=JSON.parse(block.dataset.chordAnchors);
   for(const anchor of anchors){
    const note=create("span","score-chord",anchor.chord);
    note.dataset.position=String(anchor.position);chords.append(note);
   }
   line.append(chords,lyric);score.append(line);
  }
  return score;
 }
 function build(source,options={}){
  return buildMarkup(root.ShalomChords.render(source,{...options,includeAnchors:true}));
 }
 function measureLine(line){
  const lyric=line.querySelector(".score-lyric");
  const layer=line.querySelector(".score-chords");
  const notes=Array.from(layer.children);
  const text=lyric.textContent;
  const fontSize=parseFloat(root.getComputedStyle(lyric).fontSize);
  if(!(fontSize>0))throw Error("Score must be visible before measuring");
  // The browser's Range measures the full shaped line, including kerning and accents.
  const textNode=lyric.firstChild;
  const origin=lyric.getBoundingClientRect().left;
  const spaceProbe=create("span","score-space-probe","\u00a0");
  lyric.append(spaceProbe);
  const space=spaceProbe.getBoundingClientRect().width;
  spaceProbe.remove();
  const anchorX=(_,position)=>{
   if(!textNode)return position*space;
   const offset=Math.min(position,text.length);
   const range=doc.createRange();
   range.setStart(textNode,offset);range.collapse(true);
   const x=range.getBoundingClientRect().left-origin;
   return Math.max(0,x)+Math.max(0,position-text.length)*space;
  };
  const widths=new Map(notes.map(note=>[note.textContent,note.getBoundingClientRect().width]));
  const result=root.ShalomScoreLayout.layoutAnchors(text,notes.map(note=>({
   position:Number(note.dataset.position),chord:note.textContent
  })),{anchorX,chordWidth:chord=>widths.get(chord)},fontSize*.22);
  // Relative coordinates preserve the alignment on scaling without a pixel offset.
  const placed=new Map();
  for(const a of result.anchors){
   const key=a.position+":"+a.chord;
   if(!placed.has(key))placed.set(key,[]);
   placed.get(key).push(a);
  }
  for(const note of notes){
   const a=placed.get(note.dataset.position+":"+note.textContent).shift();
   note.style.left=(a.x/fontSize)+"em";
   note.style.bottom=(a.lane*1.16)+"em";
  }
  layer.style.height=(result.lanes*1.16)+"em";
  line.style.minWidth=(result.width/fontSize)+"em";
  return result;
 }
 function relayout(score){
  return Array.from(score.querySelectorAll(".score-pair"),measureLine);
 }
 // Fit a complete section using actual glyph metrics, not character counts.
 // If even the minimum does not fit, keep all content scrollable.
 function fitSection(wrapper,score,{width,height,min=12,max=15}){
  if(!(width>0&&height>0&&min>0&&max>=min))return null;
  function measure(size){
   wrapper.style.fontSize=size+"px";relayout(score);
   return wrapper.scrollWidth<=width+1&&wrapper.getBoundingClientRect().height<=height+1;
  }
  let lo=Math.ceil(min*10),hi=Math.floor(max*10),best=lo;
  while(lo<=hi){const mid=Math.floor((lo+hi)/2);if(measure(mid/10)){best=mid;lo=mid+1;}else hi=mid-1;}
  const fontSize=best/10, fits=measure(fontSize);
  return {fontSize,fits};
 }
 function render(target,source,options={}){
  const score=build(source,options);
  target.replaceChildren(score);
  relayout(score);
  return score;
 }
 // Reserve layout while preparing the final score. Visibility (not display)
 // keeps real glyph geometry measurable. Only the latest request may reveal it.
 const pending=new WeakMap();
 function hold(target){
  const previous=pending.get(target),ticket={visibility:previous?previous.visibility:target.style.visibility};
  pending.set(target,ticket);
  target.style.visibility="hidden";
  return ()=>{
   if(pending.get(target)!==ticket)return;
   pending.delete(target);target.style.visibility=ticket.visibility;
  };
 }
 // Upgrade only markup explicitly prepared by its owner. A stale asynchronous
 // result must never replace newer edits, a different song or a closed view.
 async function upgrade(target){
  if(!target||!target.isConnected||target.firstElementChild?.classList.contains("score-proportional"))return false;
  const original=Array.from(target.childNodes);
  if(!original.length)return false;
  const release=hold(target);
  const scrollTop=target.scrollTop,scrollLeft=target.scrollLeft;
  try{
   if(!await loadFont()||!target.isConnected||
     original.length!==target.childNodes.length||original.some((node,i)=>node!==target.childNodes[i]))return false;
   const score=buildMarkup(target.innerHTML);
   if(!target.getClientRects().length)return false;
   target.replaceChildren(score);
   try{relayout(score);}catch(error){target.replaceChildren(...original);throw error;}
   target.scrollTop=scrollTop;target.scrollLeft=scrollLeft;
   return true;
  }catch(error){target.scrollTop=scrollTop;target.scrollLeft=scrollLeft;console.warn("SHALOM: retained original reader",error);return false;}
  finally{release();}
 }
 root.ShalomScoreReader=Object.freeze({loadFont,build,buildMarkup,render,relayout,upgrade,fitSection,hold});
})(window);
