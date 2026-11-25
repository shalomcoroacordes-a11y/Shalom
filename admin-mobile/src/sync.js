"use strict";
const {TABLES}=require("./config");
const {listDrafts,dropDraft,status,cacheCatalog,readCatalog,cachedList}=require("./store");
function createSync(api,auth,network){
 let executing=false,pulling=null;
 async function push(owner){
  if(executing)return{busy:true};
  executing=true;let sent=0,failed=0,conflicts=0;
  try{
   const online=await network();if(!online)return{offline:true};
   const s=await auth.requireFresh();
   if(s.user_id!==owner)throw Error("La sesión no corresponde al propietario de los borradores");
   const access=await api.myAccess();
   if(!access?.authorized)throw Error("Sin permisos de administración");
   const priority=["artists","categories","albums","songs","medleys","repertoires","contact_messages","home_recommendations","site_content"];
   const queue=(await listDrafts(owner)).filter(x=>x.status==="queued"||x.status==="error")
    .sort((a,b)=>priority.indexOf(a.type)-priority.indexOf(b.type));
   for(const draft of queue){
    try{
     const current=await auth.requireFresh();
     if(current.user_id!==owner)throw Error("La sesión cambió durante la sincronización");
     await api.publish(draft.type,draft.body,draft.expected_updated);
     await dropDraft(owner,draft.id);sent++;
    }catch(error){
     const conflict=error.code==="CONFLICT"||error.status===409;
     await status(owner,draft.id,conflict?"conflict":"error",error.message);
     if(conflict)conflicts++;else failed++;
     // Nunca eliminar borradores ante errores; continuar con independientes.
    }
   }
   return{sent,failed,conflicts};
  }finally{executing=false;}
 }
 async function download(owner){
  const online=await network();if(!online)return{offline:true};
  const s=await auth.requireFresh();if(s.user_id!==owner)throw Error("Usuario distinto");
  const access=await api.myAccess();if(!access?.authorized)throw Error("Sin permisos de administración");
  const counts={},data={};
  for(const type of TABLES){
   const current=await auth.requireFresh();
   if(current.user_id!==owner)throw Error("La sesión cambió durante la descarga");
   const rows=await api.list(type);
   if(!Array.isArray(rows))throw Error("Catálogo incompleto: "+type);
   data[type]=rows;counts[type]=rows.length;
  }
  const current=await auth.requireFresh();
  if(current.user_id!==owner)throw Error("La sesión cambió durante la descarga");
  const finalAccess=await api.myAccess();if(!finalAccess?.authorized)throw Error("Permisos revocados durante la descarga");
  await cacheCatalog(owner,data,TABLES);
  return{counts};
 }
 function pull(owner){
  if(pulling){
   if(pulling.owner!==owner)return Promise.reject(Error("Hay otra sesión sincronizando el catálogo"));
   return pulling.promise;
  }
  const promise=download(owner).finally(()=>{pulling=null});
  pulling={owner,promise};
  return promise;
 }
 async function snapshot(owner){return readCatalog(owner,TABLES);}
 async function catalog(owner,type){return cachedList(owner,type);}
 return{push,pull,catalog,snapshot};
}
module.exports={createSync};
