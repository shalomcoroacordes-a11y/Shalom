"use strict";
const assert=require("node:assert/strict");
const {createUserManagement}=require("../src/user-management");
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{resolve,promise}};
async function test(){
 let owner="a",view=null,gate=null,start=null,fail=false;
 const calls=[];
 const api={roles:async()=>[{id:"r1"},{id:"r2"}],list:async table=>({admin_profiles:[{user_id:"u"}],admin_user_roles:[],admin_access_blocks:[],admin_permission_overrides:[],admin_trash:[]})[table],
 async assignUserRoles(id,roles){calls.push(["roles",id,roles]);if(gate){start.resolve();await gate.promise;}if(fail)throw Error("No guardado");},
 async setPermissionOverride(id,key,value){calls.push(["override",id,key,value]);}};
 const m=createUserManagement({api,auth:{requireFresh:async()=>({user_id:owner})},apply:data=>{view=data}});
 m.reset("a");await m.load("a");
 await Promise.all([m.toggleRole("a","u","r1"),m.toggleRole("a","u","r2")]);
 assert.deepEqual(view.assigned.u,["r1","r2"]);assert.deepEqual(calls[1],["roles","u",["r1","r2"]]);
 await Promise.all([m.toggleOverride("a","u","songs.edit"),m.toggleOverride("a","u","songs.edit"),m.toggleOverride("a","u","songs.edit")]);
 assert.deepEqual(calls.slice(2).map(x=>x[3]),[true,false,null]);assert.deepEqual(view.overrides.u,{});
 fail=true;await assert.rejects(m.toggleRole("a","u","r1"),/No guardado/);assert.deepEqual(view.assigned.u,["r1","r2"]);fail=false;
 gate=deferred();start=deferred();const pending=m.toggleRole("a","u","r1");await start.promise;
 const queued=m.toggleRole("a","u","r2");const before=calls.length;m.reset();owner="b";m.reset("b");gate.resolve();
 await assert.rejects(pending,/sesión cambió/);await assert.rejects(queued,/sesión cambió/);assert.equal(calls.length,before);assert.deepEqual(view.assigned,{});
 gate=null;await m.load("b");assert.deepEqual(view.assigned.u,[]);await assert.rejects(m.load("a"),/sesión cambió/);
 console.log("Admin user management: serialized role toggles, override cycle, rejected writes, account reset and stale operations verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
