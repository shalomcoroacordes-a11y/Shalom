"use strict";
const {BASE,KEY}=require("./config");
const SESSION_KEY="shalom.admin.session.v1";
function createAuth(fetcher,secure) {
 let refreshing=null;
 async function request(path,method,body,token){
  const response=await fetcher(BASE+path,{method,headers:{"apikey":KEY,"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let value;try{value=JSON.parse(text);}catch(_){value={message:text||"Sin respuesta del servidor"};}
  if(!response.ok)throw Error(value.msg||value.error_description||value.message||"Error de autenticación ("+response.status+")");
  return value;
 }
 async function save(data) {
  const value={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+(Number(data.expires_in||3600)-60)*1000,user_id:data.user?.id||null,email:data.user?.email||null};
  if(!value.access_token||!value.refresh_token)throw Error("Sesión incompleta");
  await secure.setItemAsync(SESSION_KEY,JSON.stringify(value));return value;
 }
 async function read(){try{return JSON.parse(await secure.getItemAsync(SESSION_KEY)||"null");}catch(_){return null;}}
 async function clear(){await secure.deleteItemAsync(SESSION_KEY);}
 async function refresh(s) {
  if(!refreshing)refreshing=request("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:s.refresh_token}).then(save).finally(()=>{refreshing=null;});
  return refreshing;
 }
 async function session(){
  const cached=await read();if(!cached)return null;
  if(cached.expires_at>Date.now())return cached;
  try{return await refresh(cached);}catch(_){return cached;} // Offline: conservar borradores, nunca autorizar publicación con token caducado.
 }
 async function requireFresh(){
  const s=await session();
  if(!s)throw Error("Debes iniciar sesión");
  if(s.expires_at<=Date.now())throw Error("Sesión caducada o sin conexión; inicia sesión en internet");
  return s;
 }
 async function verifiedAccess(s){
  try{await request("/rest/v1/rpc/admin_redeem_invite","POST",{},s.access_token);}
  catch(e){if(!/could not find the function|schema cache|not found/i.test(e.message))throw e;}
  try{
   const a=await request("/rest/v1/rpc/admin_my_access","POST",{},s.access_token);
   if(!a||!a.authorized)throw Error("Cuenta bloqueada o sin permisos administrativos");
   return a;
  }catch(e){
   if(!/could not find the function|schema cache|not found/i.test(e.message))throw e;
   // Compatibilidad SOLO para el propietario histórico antes de desplegar roles.
   const response=await fetcher(BASE+"/rest/v1/jhd_admin_users?select=user_id&user_id=eq."+encodeURIComponent(s.user_id),{headers:{apikey:KEY,Authorization:"Bearer "+s.access_token}});
   if(!response.ok)throw Error("No fue posible verificar los permisos");
   const rows=await response.json();
   if(!rows.some(row=>row.user_id===s.user_id))throw Error("Esta cuenta no tiene permisos administrativos");
   return{authorized:true,owner:true,blocked:false,permissions:[]};
  }
 }
 async function signUp(email,password){
  return request("/auth/v1/signup","POST",{email:String(email||"").trim(),password});
 }
 async function signIn(email,password){
  const data=await request("/auth/v1/token?grant_type=password","POST",{email:String(email||"").trim(),password});
  const s=await save(data);
  try{await verifiedAccess(s);}catch(err){await clear();throw err;}
  return s;
 }
 async function signOut(){
  const s=await read();await clear();
  if(s&&s.expires_at>Date.now())try{await request("/auth/v1/logout","POST",undefined,s.access_token);}catch(_){}
 }
 return{session,read,requireFresh,verifiedAccess,signIn,signUp,signOut,clear};
}
module.exports={createAuth,SESSION_KEY};
