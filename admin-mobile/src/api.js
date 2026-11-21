"use strict";
const {BASE,KEY}=require("./config");
const {mainPayload,relations,ID_FIELDS}=require("./model");
function createApi(fetcher,auth){
 async function raw(path,method="GET",body,preference){
  const s=await auth.requireFresh();
  const options={method,headers:{apikey:KEY,Authorization:"Bearer "+s.access_token,Accept:"application/json",...(body!==undefined?{"Content-Type":"application/json"}:{}),...(preference?{Prefer:preference}:{})}};
  if(body!==undefined)options.body=JSON.stringify(body);
  const response=await fetcher(BASE+path,options);
  const t=await response.text();
  let result;try{result=t?JSON.parse(t):null;}catch(_){result=t;}
  if(!response.ok){
   const error=new Error(result?.message||result?.error||"Error de servidor ("+response.status+")");
   error.status=response.status;error.code=/CONFLICT/.test(error.message)?"CONFLICT":result?.code;throw error;
  }
  return result;
 }
 const quote=value=>encodeURIComponent(String(value));
 async function list(table){
  const result=[];let offset=0;const limit=250;
  while(true){
   const rows=await raw("/rest/v1/"+quote(table)+"?select=*&limit="+limit+"&offset="+offset);
   if(!Array.isArray(rows))throw Error("No se pudo leer el catálogo");
   result.push(...rows);if(rows.length<limit)return result;offset+=rows.length;
   if(offset>20000)throw Error("Catálogo demasiado grande: falta paginación");
  }
 }
 async function find(table,id){
  const column=ID_FIELDS[table]||"id";
  const rows=await raw("/rest/v1/"+quote(table)+"?select=*&"+column+"=eq."+quote(id)+"&limit=1");
  return rows[0]||null;
 }
 async function publish(table,record,expected){
  const id=record[ID_FIELDS[table]||"id"];
  if(!id)throw Error("Falta identificador de publicación");
  if(table==="songs"){
   const r=relations(record);
   return raw("/rest/v1/rpc/admin_publish_song","POST",{
    p_song:{...mainPayload(table,record)},
    p_artists:r.song_artists,p_categories:r.song_categories,p_albums:r.album_songs,
    p_links:r.song_links,p_capos:r.song_capo_versions,
    p_expected:expected||null
   });
  }
  const previous=await find(table,id);
  if(previous && previous.updated_at && (!expected || previous.updated_at!==expected)){
   const error=new Error("Otra persona modificó este contenido. Revisa los cambios antes de publicar.");
   error.code="CONFLICT";throw error;
  }
  if(!previous&&expected){const error=new Error("El contenido ya no existe en el servidor");error.code="CONFLICT";throw error;}
  const payload=mainPayload(table,record);
  const idField=ID_FIELDS[table]||"id";
  const result=await raw("/rest/v1/"+quote(table)+"?on_conflict="+idField,"POST",[payload],"resolution=merge-duplicates,return=representation");
  if(!Array.isArray(result)||result.length!==1)throw Error("Publicación no confirmada por el servidor");
  return result[0];
 }
 async function remove(table,id){
  if(table==="songs")return raw("/rest/v1/rpc/admin_delete_song","POST",{p_song_id:id});
  const column=ID_FIELDS[table]||"id";
  return raw("/rest/v1/"+quote(table)+"?"+column+"=eq."+quote(id),"DELETE",undefined,"return=representation");
 }
 async function myAccess(){return raw("/rest/v1/rpc/admin_my_access","POST",{});}
 async function redeem(){return raw("/rest/v1/rpc/admin_redeem_invite","POST",{});}
 async function roles(){
  const [roles,grants]=await Promise.all([list("admin_roles"),list("admin_role_permissions")]);
  return roles.map(role=>({...role,permissions:grants.filter(p=>p.role_id===role.id).map(p=>p.permission)}));
 }
 async function createRole(role){return raw("/rest/v1/rpc/admin_create_role","POST",{p_name:role.name,p_description:role.description||"",p_permissions:role.permissions});}
 async function changeRole(role){return raw("/rest/v1/rpc/admin_update_role","POST",{p_id:role.id,p_name:role.name,p_description:role.description||"",p_permissions:role.permissions});}
 async function assignUserRoles(userId,roleIds){return raw("/rest/v1/rpc/admin_assign_user_roles","POST",{p_user_id:userId,p_role_ids:roleIds});}
 async function invite(email,roles){
  return raw("/rest/v1/rpc/admin_invite_user","POST",{p_email:email,p_role_ids:roles});
 }
 async function blockUser(id,reason){return raw("/rest/v1/rpc/admin_block_user","POST",{p_user_id:id,p_reason:reason||""});}
 async function unblockUser(id){return raw("/rest/v1/rpc/admin_unblock_user","POST",{p_user_id:id});}
 return{raw,list,find,publish,remove,myAccess,redeem,roles,createRole,changeRole,assignUserRoles,invite,blockUser,unblockUser};
}
module.exports={createApi};
