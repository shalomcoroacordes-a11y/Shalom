/* Optional collection practice controls. Only published and revision-matched data. */
(()=>{
"use strict";
const C=window.ShalomStudioCollections,entry=window.ShalomStudioEntry;
if(!C||!entry)return;
async function load(client,ids,knownSongs=[]){
 const map=new Map(knownSongs.map(s=>[String(s.id),{...s}]));
 const unique=[...new Set(ids.filter(Boolean).map(String))];
 for(let i=0;i<unique.length;i+=100){
  const batch=unique.slice(i,i+100),missing=batch.filter(id=>!map.get(id)?.updated_at);
  if(missing.length){const s=await client.from("songs").select("id,title,lyrics,tone,capo_position,capo_key,updated_at").in("id",missing);if(s.error)throw s.error;for(const row of s.data||[])map.set(String(row.id),row)}
  const variants=await client.from("song_capo_versions").select("id,song_id,label,capo_position,capo_key,sort_order").in("song_id",batch).order("sort_order",{ascending:true});
  if(!variants.error){for(const id of batch){const song=map.get(id);if(song)song._capos=(variants.data||[]).filter(v=>String(v.song_id)===id);}}
  const a=await client.from("song_studio_arrangements").select("song_id,song_revision,arrangement").in("song_id",batch);
  if(a.error)continue;
  for(const r of a.data||[]){const s=map.get(String(r.song_id));if(s?.updated_at===r.song_revision&&r.arrangement?.v===1)map.set(String(r.song_id),{...s,_studio:r.arrangement})}
 }
 return [...map.values()];
}
function button(label,action){const b=document.createElement("button");b.type="button";b.className="song-btn small-btn secondary studio-collection-action";b.textContent=label;b.addEventListener("click",action);return b}
async function play(client,item,onClose){
 const p=item.payload;
 return entry.open({client,song:{...p.song,updated_at:p.song.revision},arrangement:p.arrangement,shift:p.shift,capo:p.capo,range:p.range,onClose});
}
function mount({client,container,articles,parts,songs,kind,title:collectionTitle,individual=true}){
 const plan=C.plan(parts,songs);
 container.querySelectorAll("button.studio-collection-action").forEach(b=>b.remove());
 if(!plan.ready.length)return;
 function run(item){play(client,item).catch(e=>window.alert(e.message))}
 if(individual)for(const item of plan.ready){
  const article=articles[item.index];if(!article)continue;
  article.append(button("♫ "+(item.payload.range?"Practicar fragmento":"Practicar con guitarra"),()=>run(item)));
 }
 if(kind==="misa")return;
 const title=kind==="popurri"?"Practicar fragmentos disponibles":"Ensayar con guitarra";
 const control=button(title+" · "+plan.ready.length+"/"+plan.total,()=>choose(0));
 container.prepend(control);
 if(kind==="popurri"){
  const sequence=C.sequencePlan(parts,songs,collectionTitle);
  if(sequence)container.prepend(button("▶ Practicar popurrí completo",()=>{
   entry.open({client,song:{...sequence.song,updated_at:sequence.song.revision},arrangement:sequence.arrangement,range:sequence.range,shift:sequence.shift,capo:sequence.capo,sequence:sequence.sequence,title:sequence.title}).catch(e=>window.alert(e.message));
  }));
 }
 function choose(index){
  const ready=plan.ready;
  const dialog=document.createElement("dialog"),heading=document.createElement("h3"),status=document.createElement("p"),list=document.createElement("div");
  heading.textContent=title;status.textContent=ready.length+" de "+plan.total+" preparados. Cada canto se inicia manualmente.";
  dialog.className="studio-collection-dialog";
  const close=button("Regresar",()=>dialog.close());
  for(const item of plan.entries){
   const row=document.createElement("div");row.className="studio-collection-row";
   if(item.ready){row.append(button((item.index+1)+". "+item.title,()=>{dialog.close();runQueue(ready.indexOf(item))}))}
   else{const label=document.createElement("span");label.textContent=(item.index+1)+". "+item.title+" · "+item.reason;row.append(label)}
   list.append(row);
  }
  dialog.append(heading,status,list,close);document.body.append(dialog);dialog.addEventListener("close",()=>dialog.remove(),{once:true});dialog.showModal();
  function runQueue(i){play(client,ready[i],()=>{if(i+1<ready.length){const next=document.createElement("dialog"),p=document.createElement("p");p.textContent="Siguiente preparado: "+ready[i+1].title;next.append(p,button("Abrir siguiente",()=>{next.close();runQueue(i+1)}),button("Volver a la lista",()=>{next.close();choose(i)}),button("Terminar ensayo",()=>next.close()));document.body.append(next);next.addEventListener("close",()=>next.remove(),{once:true});next.showModal()}}).catch(e=>window.alert(e.message))}
 }
}
// Contextual actions: printing uses the rendered occurrence, sharing links to the original.
function printOccurrence(article){
 const body=document.body;
 const clear=()=>{body.classList.remove("collection-print-single");article.classList.remove("collection-print-target");window.removeEventListener("afterprint",clear);};
 body.classList.add("collection-print-single");article.classList.add("collection-print-target");
 window.addEventListener("afterprint",clear,{once:true});
 try{window.print();}catch(error){clear();throw error;}
}
function openSongOptions({song,article,onPractice,onCapo}){
 const dialog=document.createElement("dialog"),heading=document.createElement("h3"),status=document.createElement("p");
 dialog.className="studio-collection-dialog collection-song-dialog";dialog.setAttribute("aria-label","Opciones de canto");
 heading.textContent=song.title||"Canto SHALOM";status.setAttribute("role","status");
 const url=new URL("cancion.html?id="+encodeURIComponent(song.id),location.href).href;
 function action(label,fn,close=true){return button(label,()=>{if(close)dialog.close();try{Promise.resolve(fn()).catch(error=>{if(close)window.alert(error.message);else status.textContent=error.message;});}catch(error){if(close)window.alert(error.message);else status.textContent=error.message;}});}
 dialog.append(heading,action("Abrir canto original",()=>{location.href=url;}));
 if(onCapo)dialog.append(action("Cambiar capo",onCapo));
 if(onPractice)dialog.append(action("Practicar con guitarra",onPractice));
 dialog.append(action("Imprimir letra y acordes de este canto",()=>printOccurrence(article)),
  action("Compartir canto original",async()=>{
   if(navigator.share){try{await navigator.share({title:song.title,url});return;}catch(error){if(error.name==="AbortError")return;}}
   if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(url);status.textContent="Enlace copiado.";return;}catch(_){}}
   const input=document.createElement("input");input.readOnly=true;input.value=url;input.setAttribute("aria-label","Enlace para copiar");dialog.append(input);input.select();status.textContent="Copia el enlace del canto.";
  },false),
  action("Abrir SHALOM Offline",()=>{location.href=new URL("offline.html",location.href).href;}),status,button("Cerrar",()=>dialog.close()));
 document.body.append(dialog);dialog.addEventListener("close",()=>dialog.remove(),{once:true});dialog.showModal();
}
// Update only one score, never rebuild the surrounding collection or write to the catalog.
function mountCapos({client,container,articles,parts,songs,kind,title,shift=0,selections=new Map(),onRendered=()=>{}}){
 const capoCore=window.ShalomSongCapo,chords=window.ShalomChords;
 if(!capoCore||!chords)return;
 const byId=new Map(songs.map(s=>[String(s.id),s]));
 const resolved=parts.map((part,i)=>{
  const song=byId.get(String(part.song_id)),selection=capoCore.collectionCapo(song,part,selections.get(i));
  return {part,song,selection};
 });
 const move=(chord,delta)=>String(chord).replace(/(^|\/)([A-G](?:#|b)?)/g,(_,prefix,note)=>{
  const names=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],flat={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
  const index=names.indexOf(flat[note]||note);return prefix+names[((index+delta)%12+12)%12];
 });
 function practiceParts(){return resolved.map(({part,selection})=>({...part,shift:shift+Number(part.shift||0)+selection.offset,capo:selection.chosen.position}));}
 function practice(){
  mount({client,container,articles,parts:practiceParts(),songs,kind,title,individual:false});
 }
 function paint(i){
  const {part,song,selection}=resolved[i],article=articles[i];
  const target=article?.querySelector(".rep-reader-lyrics,.medley-lyrics");
  if(!target)return;
  const lyrics=part.lyrics??song?.lyrics??"Canto no disponible.";
  const delta=shift+Number(part.shift||0)+selection.offset;
  const arrangement=song&&lyrics===song.lyrics?song._studio:null;
  target.innerHTML=chords.render(lyrics,{arrangement,cueOverride:part.cue_override,transpose:c=>move(c,delta)});
  onRendered();
 }
 resolved.forEach(({song,selection},i)=>{
  const article=articles[i];if(!article)return;
  article.querySelector(".collection-capo-control")?.remove();
  article.querySelector(".collection-song-options")?.remove();
  let capoSelect=null;
  if(song&&selection.choices.length>1){
   const label=document.createElement("label"),select=document.createElement("select");
   label.className="collection-capo-control studio-collection-action";label.textContent="Capo de este canto ";
   select.setAttribute("aria-label","Seleccionar capo de "+(song.title||"canto"));
   for(const c of selection.choices){const option=document.createElement("option");option.value=c.id;option.textContent=c.label+(c.key?" · Figuras en "+c.key:"");select.append(option);}
   select.value=selection.chosen.id;label.append(select);capoSelect=select;
   article.insertBefore(label,article.querySelector(".rep-reader-lyrics,.medley-lyrics"));
   select.addEventListener("change",()=>{selections.set(i,select.value);resolved[i].selection=capoCore.collectionCapo(song,resolved[i].part,select.value);paint(i);practice();});
  }
  if(song){const trigger=button("⋮",()=>{const item=C.plan(practiceParts(),songs).entries[i];openSongOptions({song,article,onCapo:capoSelect?()=>{capoSelect.focus();try{capoSelect.showPicker?.();}catch(_){} }:null,onPractice:item?.ready?()=>play(client,item):null});});
   trigger.className="song-btn small-btn secondary collection-song-options";trigger.setAttribute("aria-label","Opciones de "+(song.title||"canto"));article.insertBefore(trigger,article.querySelector(".rep-reader-lyrics,.medley-lyrics"));}
  paint(i);
 });
 practice();
}
window.ShalomStudioCollectionWeb=Object.freeze({load,mount,mountCapos,openSongOptions});
})();