/* Administrative history browser. The published Studio reader remains unchanged. */
(() => {
"use strict";
const table="song_studio_history";
const reasons={song_revision_changed:"Cambio de revisión",song_deleted:"Canto eliminado",arrangement_replaced:"Arreglo sustituido",arrangement_deleted:"Arreglo eliminado"};
function compatible(row,song){
 return !!row&&!!song?.id&&!!song.updated_at&&row.song_id===song.id&&row.song_revision===song.updated_at&&row.arrangement?.v===1;
}
function previewSong(row,song){
 if(compatible(row,song))return {...song,title:(song.title||"Canto")+" · Historial"};
 const context=row?.song_context;
 if(row?.song_id!==song?.id||context?.updated_at!==row.song_revision||typeof context.lyrics!=="string"||row.arrangement?.v!==1)throw Error("No se conserva la letra exacta de esta revisión. Descarga el respaldo para revisarla manualmente.");
 return {id:row.song_id,updated_at:row.song_revision,lyrics:context.lyrics,title:(context.title||"Canto")+" · Historial"};
}
async function authorize(client,owner){
 const identity=await client.auth.getUser();
 if(!owner||identity.error||identity.data?.user?.id!==owner)throw Error("La sesión cambió. Vuelve a abrir el historial.");
 const {data,error}=await client.rpc("admin_has_permission",{p_permission:"songs.publish"});
 if(error||data!==true)throw Error(error?.message||"No tienes permiso para consultar el historial.");
}
async function open({client,song,owner,onClose}){
 await authorize(client,owner);
 const {data,error}=await client.from(table).select("id,song_id,song_revision,archived_at,reason").eq("song_id",song.id).order("archived_at",{ascending:false}).order("id",{ascending:false}).limit(30);
 if(error)throw Error(error.message);
 await authorize(client,owner);
 const dialog=document.createElement("dialog");
 dialog.className="admin-card";
 dialog.setAttribute("aria-label","Historial Studio");
 Object.assign(dialog.style,{width:"min(92vw,680px)",maxHeight:"82dvh",overflow:"auto"});
 const create=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el};
 const button=(label,fn)=>{const el=create("button",label);el.type="button";el.className="song-btn small-btn secondary";el.onclick=fn;return el};
 const status=create("p","Últimas 30 revisiones guardadas. Las revisiones antiguas nunca se publican automáticamente.");
 status.setAttribute("role","status");
 const close=button("Cerrar historial",()=>dialog.close());
 let busy=false,closed=false;
 async function choose(meta,recover){
  if(busy||closed)return;
  busy=true;
  try{
   await authorize(client,owner);
   const result=await client.from(table).select("id,song_id,song_revision,arrangement,song_context").eq("id",meta.id).eq("song_id",song.id).single();
   if(result.error)throw result.error;
   const row=result.data;
   if(row?.id!==meta.id||row.song_id!==song.id)throw Error("No se confirmó la revisión seleccionada.");
   const current=await client.from("songs").select("id,title,lyrics,updated_at").eq("id",song.id).single();
   if(current.error)throw current.error;
   await authorize(client,owner);
   if(closed)return;
   if(recover){
    if(!compatible(row,current.data))throw Error("La letra cambió. Solo puedes escuchar esta revisión o descargarla desde Respaldo.");
    if(!window.confirm("¿Cargar esta revisión en el editor sin publicarla? Los borradores existentes no se sustituyen hasta que guardes."))return;
    await window.ShalomStudioEntry.open({client,song:current.data,admin:true,recoveryDraft:row.arrangement,expectedOwner:owner,onClose});
   }else{
    const original=previewSong(row,current.data);
    await window.ShalomStudioEntry.open({client,song:original,admin:false,arrangement:row.arrangement});
   }
   if(!closed)dialog.close();
  }catch(e){if(!closed)status.textContent=e?.message||"No se pudo abrir la revisión.";}
  finally{busy=false;}
 }
 dialog.append(create("h3","Historial de "+(song.title||"canto")),status);
 if(!data?.length)dialog.append(create("p","Todavía no hay revisiones históricas."));
 for(const row of data||[]){
  const item=document.createElement("article");item.className="admin-resource-draft";
  const date=new Date(row.archived_at);
  item.append(create("strong",reasons[row.reason]||"Revisión guardada"),create("p",Number.isNaN(date.getTime())?"Sin fecha":date.toLocaleString("es-MX")));
  const actions=document.createElement("div");actions.className="admin-actions";
  actions.append(button("Escuchar revisión",()=>choose(row,false)));
  if(row.song_revision===song.updated_at)actions.append(button("Cargar para editar",()=>choose(row,true)));
  item.append(actions);dialog.append(item);
 }
 dialog.append(close);
 dialog.addEventListener("close",()=>{closed=true;dialog.remove();},{once:true});
 document.body.append(dialog);
 try{dialog.showModal()}catch(e){dialog.remove();throw e;}
}
window.ShalomStudioHistory=Object.freeze({open,compatible,previewSong});
})();
