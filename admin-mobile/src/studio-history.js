"use strict";
const {canPublish}=require("./permissions");
const table="/rest/v1/song_studio_history";
const q=encodeURIComponent;
function createStudioHistory({api,network}){
 async function authorize(owner){
  if(!owner||!await network())throw Error("El historial requiere conexión y sesión activa.");
  if(!canPublish(await api.myAccess(owner),"songs"))throw Error("No tienes permiso para consultar el historial.");
 }
 const read=(path,owner)=>api.raw(path,"GET",undefined,undefined,owner);
 async function list(owner,id){
  if(!id)throw Error("Canto no disponible.");
  await authorize(owner);
  const rows=await read(table+"?select=id,song_id,song_revision,archived_at,reason&song_id=eq."+q(id)+"&order=archived_at.desc,id.desc&limit=30",owner);
  await authorize(owner);
  if(!Array.isArray(rows)||rows.some(r=>r.song_id!==id||!r.id||!r.song_revision))throw Error("Historial inválido.");
  return rows;
 }
 async function select(owner,id,revisionId,recover){
  if(!id||!revisionId)throw Error("Revisión no disponible.");
  await authorize(owner);
  const rows=await read(table+"?select=id,song_id,song_revision,arrangement,song_context&id=eq."+q(revisionId)+"&song_id=eq."+q(id)+"&limit=1",owner);
  const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(!row||row.id!==revisionId||row.song_id!==id||!row.song_revision||row.arrangement?.v!==1)throw Error("No se confirmó la revisión.");
  const current=await api.find("songs",id,owner);
  await authorize(owner);
  if(!current||current.id!==id)throw Error("El canto ya no está disponible.");
  const compatible=current.updated_at===row.song_revision;
  if(recover&&!compatible)throw Error("La letra cambió. Solo puedes escuchar la revisión original.");
  const source=compatible?current:row.song_context;
  if(!source||source.updated_at!==row.song_revision||typeof source.lyrics!=="string")throw Error("No se conserva la letra exacta de esta revisión.");
  return {song:{id,title:source.title||"Canto",lyrics:source.lyrics,revision:row.song_revision},arrangement:row.arrangement};
 }
 return Object.freeze({list,select});
}
module.exports={createStudioHistory};
