"use strict";
const {TABLES}=require("./config");
const {listDrafts,dropDraft,status,cacheList,cachedList}=require("./store");
function createSync(api,auth,network){
 let executing=false;
 async function push(owner){
  if(executing)return{busy:true};
  const online=await network();if(!online)return{offline:true};
  executing=true;let sent=0,failed=0,conflicts=0;
  try{
   const s=await auth.requireFresh();
   if(s.user_id!==owner)throw Error("La sesión no corresponde al propietario de los borradores");
   await api.myAccess(); // En servidor se comprueba revocación de roles y bloqueo.
   const priority=["artists","categories","albums","songs","medleys","repertoires","contact_messages","home_recommendations","site_content"];
   const queue=(await listDrafts(owner)).filter(x=>x.status==="queued"||x.status==="error")
    .sort((a,b)=>priority.indexOf(a.type)-priority.indexOf(b.type));
   for(const draft of queue){
    try{
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
 async function pull(owner){
  const online=await network();if(!online)return{offline:true};
  const s=await auth.requireFresh();if(s.user_id!==owner)throw Error("Usuario distinto");
  await api.myAccess();
  const counts={};
  for(const type of TABLES){
   const rows=await api.list(type);await cacheList(owner,type,rows);counts[type]=rows.length;
  }
  return{counts};
 }
 async function catalog(owner,type){return cachedList(owner,type);}
 return{push,pull,catalog};
}
module.exports={createSync};
