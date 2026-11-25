"use strict";
const {canPublish}=require("./permissions");
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const draftKey=id=>"studio:"+id,publishedKey=id=>"studio-published:"+id;
function createStudioPersistence({api,store,network}){
 const tails=new Map();
 function run(owner,song,work){
  if(!owner||!song?.id||!song.revision)return Promise.reject(Error("Sesión o revisión del canto no disponible."));
  const key=JSON.stringify([owner,song.id]);
  const task=(tails.get(key)||Promise.resolve()).then(work);
  const tail=task.catch(()=>{});tails.set(key,tail);
  tail.then(()=>{if(tails.get(key)===tail)tails.delete(key);});
  return task;
 }
 const record=(song,arrangement)=>({id:song.id,revision:song.revision,arrangement});
 function saveLocal(owner,song,arrangement){
  return store.cacheList(owner,draftKey(song.id),[record(song,arrangement)]);
 }
 async function fetchArrangement(owner,song){
  const rows=await api.raw("/rest/v1/song_studio_arrangements?select=arrangement,song_revision&song_id=eq."+encodeURIComponent(song.id)+"&song_revision=eq."+encodeURIComponent(song.revision)+"&limit=1","GET",undefined,undefined,owner);
  if(!Array.isArray(rows))throw Error("No se pudo consultar el acompañamiento.");
  if(rows.length&&rows[0].song_revision!==song.revision)throw Error("La revisión consultada no corresponde al canto.");
  return rows[0]?.arrangement||null;
 }
 function read(owner,song,offline){
  return run(owner,song,async()=>{
   const local=(await store.cachedList(owner,draftKey(song.id)))[0];
   let arrangement=null,checked=false;
   if(!offline){
    arrangement=await fetchArrangement(owner,song);checked=true;
    await store.cacheList(owner,publishedKey(song.id),arrangement?[record(song,arrangement)]:[]);
   }else{
    const old=(await store.cachedList(owner,publishedKey(song.id)))[0];
    if(old?.revision===song.revision)arrangement=old.arrangement;
   }
   return{id:song.id,revision:song.revision,arrangement,draft:local?.revision===song.revision?local.arrangement:null,checked};
  });
 }
 function saveDraft(owner,song,arrangement){
  return run(owner,song,()=>saveLocal(owner,song,arrangement));
 }
 async function assertRevision(owner,song){
  const current=await api.find("songs",song.id,owner);
  if(!current||current.updated_at!==song.revision)throw Error("El canto cambió en el servidor. Conservamos tu borrador; revisa la letra y los acordes antes de publicar.");
 }
 function publish(owner,song,arrangement){
  return run(owner,song,async()=>{
   // Persist before the first remote request. An ambiguous response never loses the edit.
   await saveLocal(owner,song,arrangement);
   if(!await network())throw Error("Sin conexión. Tu borrador se conservó en el teléfono.");
   const current=await api.myAccess(owner);
   if(!canPublish(current,"songs"))throw Error("No tienes permiso de publicación.");
   await assertRevision(owner,song);
   const rows=await api.raw("/rest/v1/song_studio_arrangements?on_conflict=song_id&select=song_id,song_revision","POST",{song_id:song.id,song_revision:song.revision,arrangement},"resolution=merge-duplicates,return=representation",owner);
   if(!Array.isArray(rows)||rows[0]?.song_id!==song.id||rows[0]?.song_revision!==song.revision)throw Error("No se confirmó la publicación.");
   const verified=await fetchArrangement(owner,song);
   if(!verified)throw Error("No se pudo verificar la publicación. Vuelve a abrir Studio para revisar el estado.");
   if(canonical(verified)!==canonical(arrangement))throw Error("La versión guardada difiere de la enviada. Revisa Studio.");
   await assertRevision(owner,song);
   // The confirmed cache and the draft deletion commit in the same local transaction.
   const published=publishedKey(song.id),draft=draftKey(song.id);
   await store.cacheCatalog(owner,{[published]:[record(song,verified)],[draft]:[]},[published,draft]);
  });
 }
 return Object.freeze({read,saveDraft,publish});
}
module.exports={createStudioPersistence,canonical};
