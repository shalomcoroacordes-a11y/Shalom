"use strict";
// Borradores y cola de publicación privados POR USUARIO. Se guardan en SQLite del APK Admin.
let promise=null;
async function database(){
 if(!promise)promise=(async()=>{
  const SQLite=require("expo-sqlite");
  const db=await SQLite.openDatabaseAsync("shalom-admin-v1.db");
  await db.execAsync("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS drafts (owner TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, expected_updated TEXT, error TEXT, touched TEXT NOT NULL, PRIMARY KEY(owner,id)); CREATE INDEX IF NOT EXISTS drafts_status ON drafts(owner,status); CREATE TABLE IF NOT EXISTS catalog (owner TEXT NOT NULL, type TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, fetched TEXT NOT NULL, PRIMARY KEY(owner,type,id));");
  return db;
 })().catch(err=>{promise=null;throw err;});
 return promise;
}
const now=()=>new Date().toISOString();
async function upsertDraft(owner,item){
 if(!owner||!item.id||!item.type)throw Error("Borrador sin propietario o identificador");
 const db=await database();
 await db.runAsync("INSERT INTO drafts(owner,id,type,body,status,expected_updated,error,touched) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET type=excluded.type,body=excluded.body,status=excluded.status,expected_updated=excluded.expected_updated,error=excluded.error,touched=excluded.touched",owner,item.id,item.type,JSON.stringify(item.body),item.status||"draft",item.expected_updated||null,item.error||null,now());
 return item;
}
async function listDrafts(owner){
 const db=await database();
 const rows=await db.getAllAsync("SELECT * FROM drafts WHERE owner=? ORDER BY touched DESC",owner);
 return rows.map(x=>({...x,body:JSON.parse(x.body)}));
}
async function dropDraft(owner,id){const db=await database();await db.runAsync("DELETE FROM drafts WHERE owner=? AND id=?",owner,id);}
async function status(owner,id,value,error){
 const db=await database();
 await db.runAsync("UPDATE drafts SET status=?,error=?,touched=? WHERE owner=? AND id=?",value,error||null,now(),owner,id);
}
async function cacheList(owner,type,items){
 const db=await database();
 await db.withExclusiveTransactionAsync(async tx=>{
  await tx.runAsync("DELETE FROM catalog WHERE owner=? AND type=?",owner,type);
  for(const x of items)await tx.runAsync("INSERT INTO catalog(owner,type,id,body,fetched) VALUES(?,?,?,?,?)",owner,type,String(x.id||x.content_key),JSON.stringify(x),now());
 });
}
async function cachedList(owner,type){
 const db=await database();
 const rows=await db.getAllAsync("SELECT body FROM catalog WHERE owner=? AND type=?",owner,type);
 return rows.map(x=>JSON.parse(x.body));
}
module.exports={upsertDraft,listDrafts,dropDraft,status,cacheList,cachedList};
