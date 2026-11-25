/* Optional collection practice controls. Only published and revision-matched data. */
(()=>{
"use strict";
const C=window.ShalomStudioCollections,entry=window.ShalomStudioEntry;
if(!C||!entry)return;
async function load(client,ids,knownSongs=[]){
 const map=new Map(knownSongs.map(s=>[String(s.id),s])),result=[];
 const unique=[...new Set(ids.filter(Boolean).map(String))];
 for(let i=0;i<unique.length;i+=100){
  const batch=unique.slice(i,i+100),missing=batch.filter(id=>!map.get(id)?.updated_at);
  if(missing.length){const s=await client.from("songs").select("id,title,lyrics,updated_at").in("id",missing);if(s.error)throw s.error;for(const row of s.data||[])map.set(String(row.id),row)}
  const a=await client.from("song_studio_arrangements").select("song_id,song_revision,arrangement").in("song_id",batch);
  if(a.error){if(["PGRST205","42P01"].includes(a.error.code))return [];throw a.error}
  for(const r of a.data||[]){const s=map.get(String(r.song_id));if(s?.updated_at===r.song_revision&&r.arrangement?.v===1)result.push({...s,_studio:r.arrangement})}
 }
 return result;
}
function button(label,action){const b=document.createElement("button");b.type="button";b.className="song-btn small-btn secondary studio-collection-action";b.textContent=label;b.addEventListener("click",action);return b}
async function play(client,item,onClose){
 const p=item.payload;
 return entry.open({client,song:{...p.song,updated_at:p.song.revision},arrangement:p.arrangement,shift:p.shift,capo:p.capo,range:p.range,onClose});
}
function mount({client,container,articles,parts,songs,kind,title:collectionTitle}){
 const plan=C.plan(parts,songs);
 container.querySelectorAll(".studio-collection-action").forEach(b=>b.remove());
 if(!plan.ready.length)return;
 function run(item){play(client,item).catch(e=>window.alert(e.message))}
 for(const item of plan.ready){
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
window.ShalomStudioCollectionWeb=Object.freeze({load,mount});
})();