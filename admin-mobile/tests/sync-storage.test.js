"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"../src/store.js"),"utf8");
const syncSource=fs.readFileSync(require("node:path").join(__dirname,"../src/sync.js"),"utf8");
async function test(){
 let rows=[{owner:"other",type:"songs",id:"o",body:'{"id":"o"}'},{owner:"owner",type:"studio:s",id:"s",body:'{"id":"s"}'}],transactions=0,fail=false;
 const db={async execAsync(){},async withExclusiveTransactionAsync(fn){
  transactions++;const work=rows.map(x=>({...x}));
  await fn({async runAsync(sql,...args){
   if(sql.startsWith("DELETE")){for(let i=work.length-1;i>=0;i--)if(work[i].owner===args[0]&&work[i].type===args[1])work.splice(i,1);}
   else{if(fail&&args[1]==="artists")throw Error("disk error");work.push({owner:args[0],type:args[1],id:args[2],body:args[3]});}
  }});rows=work;
 },async getAllAsync(sql,owner,...types){return rows.filter(r=>r.owner===owner&&types.includes(r.type));}};
 const mod={exports:{}};vm.runInNewContext(source,{module:mod,require:name=>{assert.equal(name,"expo-sqlite");return{async openDatabaseAsync(){return db}}}});
 const store=mod.exports,types=["songs","artists","artist_featured_songs"];
 const data={songs:[{id:"s"}],artists:[{id:"a"}],artist_featured_songs:[{artist_id:"a",song_id:"s"},{artist_id:"b",song_id:"s"}]};
 await store.cacheCatalog("owner",data,types);assert.equal(transactions,1);
 assert.equal(rows.filter(r=>r.type==="artist_featured_songs").length,2);assert.notEqual(rows.filter(r=>r.type==="artist_featured_songs")[0].id,rows.filter(r=>r.type==="artist_featured_songs")[1].id);
 assert.ok(rows.some(r=>r.owner==="other"));assert.ok(rows.some(r=>r.type==="studio:s"));
 const before=JSON.stringify(rows);
 await assert.rejects(store.cacheCatalog("owner",{...data,songs:[{id:"s"},{id:"s"}]},types),/duplicado/);assert.equal(transactions,1);
 fail=true;await assert.rejects(store.cacheCatalog("owner",{...data,songs:[{id:"new"}]},types),/disk error/);assert.equal(JSON.stringify(rows),before);fail=false;
 const snapshot=await store.readCatalog("owner",types);assert.equal(snapshot.songs[0].id,"s");assert.equal(snapshot.artist_featured_songs.length,2);
 let calls=[],owner="owner",denied=false,badTable=null,release;
 const api={async myAccess(){return {authorized:!denied}},async list(type){calls.push(type);if(type===badTable)throw Error("network error");return data[type]},async publish(){calls.push("publish")}};
 const auth={async requireFresh(){return{user_id:owner}}};
 const injected={...store,async listDrafts(){return[{id:"draft",type:"songs",status:"queued",body:{id:"draft"}}]},async dropDraft(){calls.push("drop")},async status(){calls.push("status")}};
 const sMod={exports:{}};vm.runInNewContext(syncSource,{module:sMod,require:name=>name==="./config"?{TABLES:types}:injected});
 const sync=sMod.exports.createSync(api,auth,async()=>true);
 const first=sync.pull("owner"),second=sync.pull("owner");assert.equal(first,second);await assert.rejects(sync.pull("other"),/otra sesión/);await first;assert.equal(calls.length,3);
 badTable="artists";const old=JSON.stringify(rows);await assert.rejects(sync.pull("owner"),/network error/);assert.equal(JSON.stringify(rows),old);badTable=null;
 denied=true;await assert.rejects(sync.pull("owner"),/Sin permisos/);await assert.rejects(sync.push("owner"),/Sin permisos/);denied=false;
 owner="other";await assert.rejects(sync.pull("owner"),/Usuario distinto/);owner="owner";
 const gated=sMod.exports.createSync(api,auth,()=>new Promise(resolve=>{release=resolve}));
 const sending=gated.push("owner");assert.equal((await gated.push("owner")).busy,true);release(true);assert.equal((await sending).sent,1);assert.equal(calls.filter(x=>x==="publish").length,1);
 console.log("Admin sync: atomic rollback, composite IDs, private namespaces, duplicate prevention, permission gates and single-flight synchronization verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
