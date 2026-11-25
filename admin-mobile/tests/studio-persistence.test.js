"use strict";
const assert=require("node:assert/strict");
const {createStudioPersistence}=require("../src/studio-persistence");
async function test(){
 const song={id:"s",revision:"r1"},arrangement={v:1,n:2},updated={v:1,n:3};
 const cache=new Map(),calls=[];let online=true,allowed=true,revision="r1",published=null,wrong=false,failCache=false,gate=null,start;
 const key=(owner,type)=>owner+":"+type;
 const store={cachedList:async(owner,type)=>cache.get(key(owner,type))||[],async cacheList(owner,type,rows){cache.set(key(owner,type),rows)},async cacheCatalog(owner,data,types){if(failCache)throw Error("disk");for(const type of types)cache.set(key(owner,type),data[type]);}};
 const api={myAccess:async owner=>{assert.equal(owner,"a");return {authorized:true,owner:allowed}},find:async(table,id,owner)=>{assert.equal(owner,"a");return{updated_at:revision}},async raw(path,method,body,preference,owner){
  assert.equal(owner,"a");calls.push(method);
  if(method==="POST"){assert.ok(cache.get("a:studio:s").length,"Draft durable before POST");if(gate){start();await gate;}published=body.arrangement;return[{song_id:"s",song_revision:"r1"}];}
  return published?[{song_revision:"r1",arrangement:wrong?updated:published}]:[];
 }};
 const studio=createStudioPersistence({api,store,network:async()=>online});
 online=false;await assert.rejects(studio.publish("a",song,arrangement),/Sin conexión/);assert.deepEqual(cache.get("a:studio:s")[0].arrangement,arrangement);
 online=true;allowed=false;await assert.rejects(studio.publish("a",song,arrangement),/permiso/);assert.equal(calls.length,0);
 allowed=true;revision="r2";await assert.rejects(studio.publish("a",song,arrangement),/cambió/);assert.equal(calls.length,0);
 revision="r1";wrong=true;await assert.rejects(studio.publish("a",song,arrangement),/difiere/);assert.equal(cache.get("a:studio:s").length,1);
 wrong=false;failCache=true;await assert.rejects(studio.publish("a",song,arrangement),/disk/);assert.equal(cache.get("a:studio:s").length,1);
 failCache=false;await studio.publish("a",song,arrangement);assert.equal(cache.get("a:studio:s").length,0);assert.deepEqual((await studio.read("a",song,true)).arrangement,arrangement);
 let release;gate=new Promise(r=>{release=r});const began=new Promise(r=>{start=r});
 const pending=studio.publish("a",song,arrangement);await began;const next=studio.saveDraft("a",song,updated);release();await pending;await next;
 assert.deepEqual((await studio.read("a",song,true)).draft,updated);assert.equal((await studio.read("b",song,true)).draft,null);
 assert.equal((await studio.read("a",{id:"s",revision:"r2"},true)).draft,null);
 console.log("Studio persistence: offline and denied writes, stale revisions, remote verification, atomic local confirmation and newer drafts preserved.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
