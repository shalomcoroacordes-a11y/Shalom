"use strict";
const assert=require("node:assert/strict");
const {createStudioHistory}=require("../src/studio-history");
const current={id:"song",title:"Actual",lyrics:"G\\nActual",updated_at:"r2"};
const row={id:"history",song_id:"song",song_revision:"r1",arrangement:{v:1},song_context:{title:"Anterior",lyrics:"C\\nAnterior",updated_at:"r1"}};
function fixture({entry=row,access={permissions:["songs.publish"]},network=true,afterAccess=access}={}){
 const calls=[];let accesses=0;
 const api={myAccess:async owner=>{assert.equal(owner,"owner");return accesses++?afterAccess:access;},
 raw:async(path,method,body,preference,owner)=>{assert.equal(owner,"owner");assert.equal(method,"GET");calls.push(path);return [entry];},
 find:async(table,id,owner)=>{assert.equal(owner,"owner");assert.equal(id,"song");return current;}};
 return {history:createStudioHistory({api,network:async()=>network}),calls};
}
(async()=>{
 const {history,calls}=fixture();assert.equal((await history.list("owner","song")).length,1);assert.ok(calls[0].includes("limit=30"));
 assert.equal((await history.select("owner","song","history",false)).song.lyrics,row.song_context.lyrics);
 await assert.rejects(history.select("owner","song","history",true),/letra cambió/);
 const compatible=fixture({entry:{...row,song_revision:"r2"}}).history;
 assert.equal((await compatible.select("owner","song","history",true)).song.lyrics,current.lyrics);
 await assert.rejects(fixture({entry:{...row,song_context:null}}).history.select("owner","song","history",false),/letra exacta/);
 await assert.rejects(fixture({entry:{...row,song_id:"other"}}).history.select("owner","song","history",false),/confirmó/);
 await assert.rejects(fixture({access:{permissions:[]}}).history.list("owner","song"),/permiso/);
 await assert.rejects(fixture({afterAccess:{blocked:true}}).history.select("owner","song","history",false),/permiso/);
 await assert.rejects(fixture({network:false}).history.list("owner","song"),/conexión/);
 console.log("Studio history: exact revisions, read-only requests, permission checks and offline refusal.");
})().catch(e=>{console.error(e);process.exitCode=1});
