// Resiliencia del catálogo en SQLite + respaldo privado, sin usar Android real.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {TABLES}=require("../src/config");
const source=fs.readFileSync(require("node:path").resolve(__dirname,"../src/database.js"),"utf8");
let records=new Map(),meta=new Map(),savedFile=null,failFile=false,failSql=false,failSqlRead=false;
const flags={fileWrites:0,sqlCommits:0};
const id=(table,key)=>table+":"+key;
const fakeDb={
 async execAsync(sql){assert.match(sql,/CREATE TABLE IF NOT EXISTS/);},
 async getFirstAsync(sql,key){
  if(failSqlRead)throw Error("SQLite no disponible");
  const lookup=key||"last_sync";
  return meta.has(lookup)?{meta_value:meta.get(lookup)}:null;
 },
 async getAllAsync(sql,table){
  if(failSqlRead)throw Error("SQLite no disponible");
  return [...records.entries()].filter(([key])=>key.startsWith(table+":"))
   .sort(([a],[b])=>a.localeCompare(b)).map(([,payload])=>({payload}));
 },
 async withExclusiveTransactionAsync(callback){
  const nextRecords=new Map(records),nextMeta=new Map(meta);
  const trx={async runAsync(sql,...values){
   if(sql.startsWith("DELETE FROM catalog_records")){
    nextRecords.clear();return;
   }
   if(sql.startsWith("INSERT INTO catalog_records")){
    const [table,key,payload]=values;
    nextRecords.set(id(table,key),payload);
    if(failSql)throw Error("Almacenamiento SQLite lleno");
    return;
   }
   if(sql.startsWith("INSERT INTO metadata")){
    nextMeta.set("last_sync",values[0]);return;
   }
   throw Error("SQL inesperado "+sql);
  }};
  await callback(trx);
  records=nextRecords;meta=nextMeta;flags.sqlCommits++;
 },
 async runAsync(sql,key,value){
  assert.match(sql,/INSERT INTO metadata/);
  meta.set(key,value);
 }
};
const backup={
 async readSnapshot(){
  return savedFile||{data:Object.fromEntries(TABLES.map(t=>[t,[]])),syncedAt:null,storage:"archivo-local"};
 },
 async saveSnapshot(data){
  flags.fileWrites++;
  if(failFile)throw Error("Archivo de respaldo no disponible");
  const syncedAt=new Date(Date.parse(savedFile?.syncedAt||"2026-11-20T00:00:00.000Z")+1000).toISOString();
  savedFile={data:structuredClone(data),syncedAt,storage:"archivo-local"};
  return syncedAt;
 },
 async getPreference(key,fallback){return fallback},
 async setPreference(){}
};
const mod={exports:{}};
vm.runInNewContext(source,{
 module:mod,exports:mod.exports,Date,
 require(name){
  if(name==="./config")return {TABLES};
  if(name==="./file-storage")return backup;
  if(name==="expo-sqlite")return {openDatabaseAsync:async filename=>{
   assert.equal(filename,"shalom-cancionero.db");return fakeDb;
  }};
  throw Error(name);
 }
},{filename:"mobile/src/database.js"});
const api=mod.exports;
function sample(songId){
 const data=Object.fromEntries(TABLES.map(t=>[t,[]]));
 data.songs=[{id:songId,title:"Canto "+songId}];
 data.categories=[{id:"categoria-1",name:"Misa"}];
 return data;
}
(async()=>{
 const empty=await api.getCatalog();
 assert.equal(empty.syncedAt,null);
 await api.setMetadata("preferencias-wifi","true");
 const first=sample("s1");
 const firstTime=await api.commitCatalog(first);
 assert.equal(flags.fileWrites,1);
 assert.equal(flags.sqlCommits,1);
 assert.equal((await api.getCatalog()).data.songs[0].id,"s1");
 assert.equal(await api.getMetadata("preferencias-wifi"),"true");
 assert.equal(meta.get("last_sync"),firstTime);

 // Si falla el archivo, SQLite guardará una transacción completa.
 failFile=true;
 const second=sample("s2");
 const secondTime=await api.commitCatalog(second);
 assert.equal((await api.getCatalog()).data.songs[0].id,"s2");
 assert.equal(meta.get("last_sync"),secondTime);
 assert.equal(flags.sqlCommits,2);
 assert.equal(await api.getMetadata("preferencias-wifi"),"true");
 failFile=false;

 // Si SQLite falla en mitad de INSERT, su transacción no borra lo anterior.
 failSql=true;
 const third=sample("s3");
 const thirdTime=await api.commitCatalog(third);
 assert.equal(savedFile.data.songs[0].id,"s3");
 assert.equal(meta.get("last_sync"),secondTime);
 assert.equal((await api.getCatalog()).data.songs[0].id,"s3");
 assert.equal(thirdTime,savedFile.syncedAt);
 assert.equal(flags.sqlCommits,2);
 failSql=false;

 // Si falla también el archivo, ninguna copia debe cambiar.
 const good=await api.getCatalog();
 failSql=true;failFile=true;
 await assert.rejects(api.commitCatalog(sample("s4")),"No se pudo guardar el cancionero");
 assert.equal((await api.getCatalog()).data.songs[0].id,good.data.songs[0].id);
 failSql=false;failFile=false;

 // Si el lector SQLite está corrupto/no disponible, abrir la copia externa.
 failSqlRead=true;
 assert.equal((await api.getCatalog()).data.songs[0].id,"s3");
 failSqlRead=false;

 // Los datos inválidos no modifican ni las filas ni las preferencias.
 const beforeSql=flags.sqlCommits,beforeFile=flags.fileWrites;
 const bad=sample("s5");bad.songs.push({id:"s5"});
 await assert.rejects(api.commitCatalog(bad),/duplicado/);
 assert.equal(flags.sqlCommits,beforeSql);
 assert.equal(flags.fileWrites,beforeFile);
 assert.equal(await api.getMetadata("preferencias-wifi"),"true");
 console.log("SHALOM: SQLite, copia local, fallo doble, transacción y preferencias verificados.");
})().catch(error=>{console.error(error);process.exitCode=1});
