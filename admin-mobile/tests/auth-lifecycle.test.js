"use strict";
const assert=require("node:assert/strict");
const {createAuth}=require("../src/auth");
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
const response=body=>({ok:true,status:200,text:async()=>JSON.stringify(body)});
const data=id=>({access_token:"jwt-"+id,refresh_token:"refresh-"+id,expires_in:3600,user:{id,email:id+"@example.test"}});
const expired=id=>({access_token:"old-"+id,refresh_token:"refresh-"+id,expires_at:1,user_id:id});
async function test(){
 let persisted=JSON.stringify(expired("a")),refreshGate=deferred(),refreshStart=deferred(),accessGate=null,accessStart=null,refreshCalls=0;
 const secure={getItemAsync:async()=>persisted,setItemAsync:async(k,v)=>{persisted=v},deleteItemAsync:async()=>{persisted=null}};
 const client=createAuth(async(url,options)=>{
  if(url.includes("grant_type=refresh_token")){refreshCalls++;refreshStart.resolve();return refreshGate.promise;}
  if(url.includes("grant_type=password"))return response(data(JSON.parse(options.body).email.split("@")[0]));
  if(url.includes("admin_my_access")){if(accessGate){accessStart.resolve();return accessGate.promise;}return response({authorized:true});}
  return response(true);
 },secure);
 const old=client.session();await refreshStart.promise;
 await client.signOut();refreshGate.resolve(response(data("a")));assert.equal(await old,null);assert.equal(persisted,null,"Late refresh must not resurrect logout");
 persisted=JSON.stringify(expired("a"));refreshGate=deferred();refreshStart=deferred();const stale=client.session();await refreshStart.promise;
 const newer=await client.signIn("b@example.test","password");assert.equal(newer.user_id,"b");refreshGate.resolve(response(data("a")));assert.equal(await stale,null);assert.equal(JSON.parse(persisted).user_id,"b");
 accessGate=deferred();accessStart=deferred();const denied=client.signIn("c@example.test","password");await accessStart.promise;
 assert.equal(await client.session(),null,"Token remains private until permissions verified");
 accessGate.resolve(response({authorized:false}));await assert.rejects(denied,/bloqueada/);assert.equal(persisted,null);
 accessGate=deferred();accessStart=deferred();const pending=client.signIn("d@example.test","password");await accessStart.promise;await client.clear();accessGate.resolve(response({authorized:true}));await assert.rejects(pending,/sesión cambió/);assert.equal(persisted,null);
 accessGate=null;persisted=JSON.stringify(expired("a"));refreshGate=deferred();refreshStart=deferred();const p1=client.session(),p2=client.session();await refreshStart.promise;await new Promise(resolve=>setImmediate(resolve));const count=refreshCalls;refreshGate.resolve(response(data("a")));assert.equal((await p1).user_id,"a");assert.equal((await p2).user_id,"a");assert.equal(refreshCalls,count);
 persisted=JSON.stringify(expired("a"));refreshGate=deferred();refreshStart=deferred();const mismatch=client.session();await refreshStart.promise;refreshGate.resolve(response(data("b")));assert.equal((await mismatch).user_id,"a");assert.equal(JSON.parse(persisted).user_id,"a");
 console.log("Admin auth: logout and refresh races, account replacement, authorization before persistence, cancellation and deduplication verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
