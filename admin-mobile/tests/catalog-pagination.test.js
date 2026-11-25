"use strict";
const assert=require("node:assert/strict");
const {keyFields,readCatalogPages}=require("../src/catalog-pagination");
async function test(){
 const cases=[["songs",["id"]],["site_content",["content_key"]],["artist_featured_songs",["artist_id","song_id"]],["admin_role_permissions",["role_id","permission"]],["admin_user_roles",["user_id","role_id"]],["admin_permission_overrides",["user_id","permission"]],["admin_profiles",["user_id"]],["admin_access_blocks",["user_id"]]];
 for(const [table,fields] of cases){
  assert.deepEqual(keyFields(table),fields);
  const rows=Array.from({length:501},(_,i)=>Object.fromEntries(fields.map((field,j)=>[field,j===0&&fields.length>1?"same":"value-"+i])));
  const calls=[];
  const result=await readCatalogPages(table,async page=>{calls.push(page);return rows.slice(page.offset,page.offset+page.limit)});
  assert.deepEqual(result,rows);assert.deepEqual(calls.map(x=>x.offset),[0,250,500]);assert.ok(calls.every(x=>x.order===fields.map(x=>x+".asc").join(",")));
 }
 await assert.rejects(readCatalogPages("songs",async()=>[{id:"one"},{id:"one"}]),/cambió/);
 await assert.rejects(readCatalogPages("songs",async()=>[{}]),/Identificador/);
 await assert.rejects(readCatalogPages("songs",async()=>null),/leer/);
 await assert.rejects(readCatalogPages("songs",async()=>[{id:"one"},{id:"two"}],{limit:2,maxRows:1}),/límite/);
 const exact=await readCatalogPages("songs",async({offset})=>offset===0?[{id:"one"},{id:"two"}]:[],{limit:2,maxRows:2});assert.equal(exact.length,2);
 await assert.rejects(readCatalogPages("songs",async()=>[{id:"one"},{id:"two"}],{limit:2}),/cambió/);
 console.log("Admin pagination: deterministic ordering, composite identities, duplicates, malformed rows and limits verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
