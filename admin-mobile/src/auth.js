"use strict";
const {BASE,KEY}=require("./config");
const SESSION_KEY="shalom.admin.session.v1";
function createAuth(fetcher,secure) {
 let refreshing=null,generation=0,storageTail=Promise.resolve();
 // Serialize SecureStore operations and invalidate asynchronous work on account changes.
 function storage(work){const task=storageTail.then(work);storageTail=task.catch(()=>{});return task;}
 function assertCurrent(epoch){if(epoch!==generation)throw Error("La sesión cambió durante la operación");}
 async function request(path,method,body,token){
  const response=await fetcher(BASE+path,{method,headers:{"apikey":KEY,"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let value;try{value=JSON.parse(text);}catch(_){value={message:text||"Sin respuesta del servidor"};}
  if(!response.ok)throw Error(value.msg||value.error_description||value.message||"Error de autenticación ("+response.status+")");
  return value;
 }
 function sessionValue(data){
  const value={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+(Number(data.expires_in||3600)-60)*1000,user_id:data.user?.id||null,email:data.user?.email||null};
  if(!value.access_token||!value.refresh_token||!value.user_id||!Number.isFinite(value.expires_at))throw Error("Sesión incompleta");
  return value;
 }
 async function save(value,epoch){
  return storage(async()=>{assertCurrent(epoch);await secure.setItemAsync(SESSION_KEY,JSON.stringify(value));assertCurrent(epoch);return value;});
 }
 async function readStored(){try{return JSON.parse(await secure.getItemAsync(SESSION_KEY)||"null");}catch(_){return null;}}
 async function read(){const epoch=generation;const value=await storage(readStored);return epoch===generation?value:null;}
 function clear(){generation++;return storage(()=>secure.deleteItemAsync(SESSION_KEY));}
 function refresh(s,epoch){
  assertCurrent(epoch);
  if(refreshing?.epoch===epoch&&refreshing.token===s.refresh_token)return refreshing.promise;
  const entry={epoch,token:s.refresh_token};
  entry.promise=request("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:s.refresh_token}).then(data=>{
   assertCurrent(epoch);
   const next=sessionValue(data);
   if(next.user_id!==s.user_id)throw Error("La sesión renovada pertenece a otro usuario");
   return save(next,epoch);
  }).finally(()=>{if(refreshing===entry)refreshing=null;});
  refreshing=entry;return entry.promise;
 }
 async function session(){
  const epoch=generation,cached=await read();
  if(epoch!==generation||!cached)return null;
  if(cached.expires_at>Date.now())return cached;
  try{return await refresh(cached,epoch);}catch(_){
   // Offline fallback is valid only for the same, still active account.
   return epoch===generation?cached:null;
  }
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
  const epoch=++generation;
  await storage(()=>secure.deleteItemAsync(SESSION_KEY));
  assertCurrent(epoch);
  const data=await request("/auth/v1/token?grant_type=password","POST",{email:String(email||"").trim(),password});
  assertCurrent(epoch);
  const s=sessionValue(data);
  // Never expose a token to API consumers before authorization succeeds.
  await verifiedAccess(s);
  assertCurrent(epoch);
  return save(s,epoch);
 }
 async function requestRecovery(email){return request("/auth/v1/recover","POST",{email:String(email||"").trim()});}
 async function signOut(){
  generation++;
  const s=await storage(async()=>{const value=await readStored();await secure.deleteItemAsync(SESSION_KEY);return value;});
  if(s&&s.expires_at>Date.now())try{await request("/auth/v1/logout","POST",undefined,s.access_token);}catch(_){}
 }
 return{session,read,requireFresh,verifiedAccess,signIn,signUp,requestRecovery,signOut,clear};
}
module.exports={createAuth,SESSION_KEY};
