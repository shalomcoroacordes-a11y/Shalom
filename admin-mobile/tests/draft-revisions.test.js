"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../src/store.js"),"utf8"),syncSource=fs.readFileSync(path.join(__dirname,"../src/sync.js"),"utf8");
async function test(){
 const rows=new Map(),keys=["owner","id","touched","type","status","body","expected_updated","error"];
 const lookup=args=>{const row=rows.get(args[0]+":"+args[1]);return row&&keys.every((key,i)=>row[key]===args[i])?row:null};
 const db={execAsync:async()=>{},async runAsync(sql,...args){
  if(sql.startsWith("INSERT INTO drafts")){const [owner,id,type,body,status,expected_updated,error,touched]=args;rows.set(owner+":"+id,{owner,id,type,body,status,expected_updated,error,touched});return{changes:1};}
  assert.ok(keys.every(key=>sql.includes(key+"=?")||sql.includes(key+" IS ?")),sql);
  if(sql.startsWith("DELETE")){if(!lookup(args))return{changes:0};rows.delete(args[0]+":"+args[1]);return{changes:1};}
  const [status,error,touched,...match]=args,row=lookup(match);if(!row)return{changes:0};Object.assign(row,{status,error,touched});return{changes:1};
 },async getAllAsync(sql,owner){return [...rows.values()].filter(x=>x.owner===owner).map(x=>({...x}));},async getFirstAsync(sql,...args){return lookup(args)?{found:1}:null;}};
 const mod={exports:{}};vm.runInNewContext(source,{module:mod,require:()=>({openDatabaseAsync:async()=>db})});const store=mod.exports;
 const item={id:"s",type:"songs",body:{id:"s",lyrics:"Anterior"},status:"queued",expected_updated:null};
 await store.upsertDraft("a",item);const old=(await store.listDrafts("a"))[0];await store.upsertDraft("a",{...item,body:{id:"s",lyrics:"Nueva"}});
 assert.equal(await store.isCurrentDraft("a",old),false);assert.equal(await store.completeDraft("a",old),false);assert.equal(await store.transitionDraft("a",old,"error","fallo"),false);
 const current=(await store.listDrafts("a"))[0];assert.notEqual(current.touched,old.touched);assert.equal(current.body.lyrics,"Nueva");
 await store.upsertDraft("b",item);assert.equal(await store.completeDraft("b",current),false);assert.equal((await store.listDrafts("b")).length,1);
 const sm={exports:{}};vm.runInNewContext(syncSource,{module:sm,require:name=>name==="./config"?{TABLES:[]}:store});
 let mode="success",published=0;
 const api={myAccess:async()=>({authorized:true}),async publish(type,body){published++;await store.upsertDraft("a",{...item,body:{id:"s",lyrics:"Edición mientras publica "+published},status:"draft"});if(mode==="error")throw Error("red");}};
 const sync=sm.exports.createSync(api,{requireFresh:async()=>({user_id:"a"})},async()=>true);
 let result=await sync.push("a");assert.equal(result.sent,1);assert.equal(result.preserved,1);assert.equal((await store.listDrafts("a"))[0].body.lyrics,"Edición mientras publica 1");
 await store.upsertDraft("a",item);mode="error";result=await sync.push("a");assert.equal(result.failed,1);assert.equal(result.preserved,1);assert.equal((await store.listDrafts("a"))[0].status,"draft");
 const fresh=(await store.listDrafts("a"))[0];assert.equal(await store.transitionDraft("a",fresh,"queued",null),true);assert.equal(await store.completeDraft("a",fresh),false);
 assert.equal(await store.completeDraft("a",(await store.listDrafts("a"))[0]),true);assert.equal((await store.listDrafts("a")).length,0);
 console.log("Draft revisions: stale success, stale failure, owner isolation and conditional local actions verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
