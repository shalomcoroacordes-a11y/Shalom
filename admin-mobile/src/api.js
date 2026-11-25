"use strict";
const {BASE,KEY}=require("./config");
const {mainPayload,relations,ID_FIELDS}=require("./model");
const {readCatalogPages}=require("./catalog-pagination");
function createApi(fetcher,auth){
 async function raw(path,method="GET",body,preference,owner){
  const s=await auth.requireFresh();
  if(owner!==undefined&&s.user_id!==owner)throw Error("La sesión cambió durante la solicitud");
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
 async function list(table,owner){
  // Pin every page to the same account, even if the token is refreshed.
  const session=await auth.requireFresh();
  const expectedOwner=owner===undefined?session.user_id:owner;
  if(expectedOwner!==undefined&&session.user_id!==expectedOwner)throw Error("La sesión cambió durante la descarga");
  return readCatalogPages(table,({order,limit,offset})=>
   raw("/rest/v1/"+quote(table)+"?select=*&order="+quote(order)+"&limit="+limit+"&offset="+offset,"GET",undefined,undefined,expectedOwner));
 }
 async function find(table,id,owner){
  const column=ID_FIELDS[table]||"id";
  const rows=await raw("/rest/v1/"+quote(table)+"?select=*&"+column+"=eq."+quote(id)+"&limit=1","GET",undefined,undefined,owner);
  return rows[0]||null;
 }
 async function publish(table,record,expected,owner){
  const id=record[ID_FIELDS[table]||"id"];
  if(!id)throw Error("Falta identificador de publicación");
  if(table==="artists"){
   return raw("/rest/v1/rpc/admin_publish_artist","POST",{
    p_artist:mainPayload(table,record),p_featured:record.featured_song_ids||[],p_expected:expected||null
   },undefined,owner);
  }
  if(table==="songs"){
   const r=relations(record);
   return raw("/rest/v1/rpc/admin_publish_song","POST",{
    p_song:{...mainPayload(table,record)},
    p_artists:r.song_artists,p_categories:r.song_categories,p_albums:r.album_songs,
    p_links:r.song_links,p_capos:r.song_capo_versions,
    p_expected:expected||null
   },undefined,owner);
  }
  const previous=await find(table,id,owner);
  const payload=mainPayload(table,record);
  if(previous){
   // COMPARACIÓN ATÓMICA: solo cambiar si la versión de servidor no cambió.
   if(!expected||previous.updated_at!==expected){
    const error=new Error("CONFLICT: alguien actualizó el registro. Revisa sus cambios.");
    error.code="CONFLICT";throw error;
   }
   payload.updated_at=new Date().toISOString();
   const column=ID_FIELDS[table]||"id";
   const path="/rest/v1/"+quote(table)+"?"+column+"=eq."+quote(id)+"&updated_at=eq."+quote(expected)+"&select=*";
   const updated=await raw(path,"PATCH",payload,"return=representation",owner);
   if(!Array.isArray(updated)||updated.length!==1){
    const error=new Error("CONFLICT: el servidor cambió antes de guardar. No se sobrescribió.");
    error.code="CONFLICT";throw error;
   }
   return updated[0];
  }
  if(expected){
   const error=new Error("CONFLICT: el registro se eliminó del servidor.");
   error.code="CONFLICT";throw error;
  }
  const created=await raw("/rest/v1/"+quote(table)+"?select=*","POST",[payload],"return=representation",owner);
  if(!Array.isArray(created)||created.length!==1)throw Error("El servidor no confirmó la creación.");
  return created[0];
 }
 async function remove(table,id,owner){
  if(table==="songs")return raw("/rest/v1/rpc/admin_delete_song","POST",{p_song_id:id},undefined,owner);
  const column=ID_FIELDS[table]||"id";
  return raw("/rest/v1/"+quote(table)+"?"+column+"=eq."+quote(id),"DELETE",undefined,"return=representation",owner);
 }
 async function myAccess(owner){return raw("/rest/v1/rpc/admin_my_access","POST",{},undefined,owner);}
 async function redeem(){return raw("/rest/v1/rpc/admin_redeem_invite","POST",{});}
 async function roles(owner){
  const [roles,grants]=await Promise.all([list("admin_roles",owner),list("admin_role_permissions",owner)]);
  return roles.map(role=>({...role,permissions:grants.filter(p=>p.role_id===role.id).map(p=>p.permission)}));
 }
 async function createRole(role){return raw("/rest/v1/rpc/admin_create_role","POST",{p_name:role.name,p_description:role.description||"",p_permissions:role.permissions});}
 async function changeRole(role){return raw("/rest/v1/rpc/admin_update_role","POST",{p_id:role.id,p_name:role.name,p_description:role.description||"",p_permissions:role.permissions});}
 async function assignUserRoles(userId,roleIds,owner){return raw("/rest/v1/rpc/admin_assign_user_roles","POST",{p_user_id:userId,p_role_ids:roleIds},undefined,owner);}
 async function setPermissionOverride(userId,permission,allowed,owner){
  return raw("/rest/v1/rpc/admin_set_permission_override","POST",{p_user_id:userId,p_permission:permission,p_allowed:allowed},undefined,owner);
 }
 async function invite(email,roles){
  return raw("/rest/v1/rpc/admin_invite_user","POST",{p_email:email,p_role_ids:roles});
 }
 async function restoreSong(trashId){return raw("/rest/v1/rpc/admin_restore_song","POST",{p_trash_id:trashId});}
 async function blockUser(id,reason){return raw("/rest/v1/rpc/admin_block_user","POST",{p_user_id:id,p_reason:reason||""});}
 async function unblockUser(id){return raw("/rest/v1/rpc/admin_unblock_user","POST",{p_user_id:id});}
 return{raw,list,find,publish,remove,myAccess,redeem,roles,createRole,changeRole,assignUserRoles,setPermissionOverride,invite,restoreSong,blockUser,unblockUser};
}
module.exports={createApi};
