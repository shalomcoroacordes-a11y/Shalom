// Resiliencia del catálogo en SQLite + respaldo privado, sin usar Android real.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {TABLES}=require("../src/config");
const source=fs.readFileSync(require("node:path").resolve(__dirname,"../src/database.js"),"utf8");
let records=new Map(),meta=new Map(),savedFile=null,failFile=false,failSql=false,failSqlRead=false,failPrefSql=false,failPrefFile=false,filePrefs={data:{},revisions:{}};
const flags={fileWrites:0,sqlCommits:0};
const id=(table,key)=>table+":"+key;
const fakeDb={
 async execAsync(sql){assert.match(sql,/PRAGMA journal_mode|CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS/);},
 async getFirstAsync(sql,key){
  if(failSqlRead)throw Error("SQLite no disponible");
  const lookup=key||"last_sync";
  return meta.has(lookup)?{meta_value:meta.get(lookup)}:null;
 },
 async getAllAsync(sql,table){
  if(failSqlRead)throw Error("SQLite no disponible");
  if(sql.startsWith("SELECT meta_key,meta_value"))return [...meta].filter(([k])=>k!=="last_sync").map(([meta_key,meta_value])=>({meta_key,meta_value}));
  assert.match(sql,/UNION ALL/);
  return [...(meta.has("last_sync")?[{kind:"last_sync",payload:meta.get("last_sync")}]:[]),
   ...[...records.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,payload])=>{
    const separator=key.indexOf(":");
    return {kind:"record",table_name:key.slice(0,separator),record_id:key.slice(separator+1),payload};
   })];
 },
 async withExclusiveTransactionAsync(callback){
  const nextRecords=new Map(records),nextMeta=new Map(meta);let catalog=false;
  const trx={async runAsync(sql,...values){
   if(sql.startsWith("DELETE FROM catalog_records")){
    catalog=true;nextRecords.clear();return;
   }
   if(sql.startsWith("INSERT INTO catalog_records")){
    const [table,key,payload]=values;
    nextRecords.set(id(table,key),payload);
    if(failSql)throw Error("Almacenamiento SQLite lleno");
    return;
   }
   if(sql.startsWith("INSERT INTO metadata")){
    if(catalog)nextMeta.set("last_sync",values[0]);
    else{if(failPrefSql&&values[0]==="favorites")throw Error("Preference disk failure");nextMeta.set(values[0],values[1]);}
    return;
   }
   throw Error("SQL inesperado "+sql);
  }};
  await callback(trx);
  records=nextRecords;meta=nextMeta;if(catalog)flags.sqlCommits++;
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
 async saveSnapshot(data,lastSqlSync){
  flags.fileWrites++;
  if(failFile)throw Error("Archivo de respaldo no disponible");
  const lastTime=Date.parse(savedFile?.syncedAt||"");
  const sqlTime=Date.parse(lastSqlSync||"");
  const next=Math.max(Date.now(),Number.isFinite(lastTime)?lastTime+1:0,
   Number.isFinite(sqlTime)?sqlTime+1:0);
  const syncedAt=new Date(next).toISOString();
  savedFile={data:structuredClone(data),syncedAt,storage:"archivo-local"};
  return syncedAt;
 },
 async readPreferences(){return structuredClone(filePrefs)},
 async savePreferences(next){if(failPrefFile)throw Error("Preference file failure");filePrefs=structuredClone(next)}
};
const mod={exports:{}};
vm.runInNewContext(source,{
 module:mod,exports:mod.exports,Date,
 require(name){
  if(name==="./config")return {TABLES};
  if(name==="./file-storage")return backup;
  if(name==="./preference-core")return require("../src/preference-core");
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
 assert.ok(Date.parse(secondTime)>Date.parse(firstTime),
  "SQLite supera la fecha del último respaldo aunque la escritura de archivos falle");
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

 // Ajuste del reloj: el nuevo guardado supera una fecha SQLite futura.
 const future=new Date(Date.now()+60000).toISOString();
 meta.set("last_sync",future);
 const next=await api.commitCatalog(sample("s5"));
 assert.ok(Date.parse(next)>Date.parse(future));
 assert.equal((await api.getCatalog()).data.songs[0].id,"s5");

 // Cuando también falla Archivos, el timestamp SQLite debe ser superior al
 // respaldo previo para evitar mostrar una copia antigua por error.
 failFile=true;
 const saved=await api.commitCatalog(sample("s6"));
 assert.ok(Date.parse(saved)>Date.parse(next));
 assert.equal((await api.getCatalog()).data.songs[0].id,"s6");
 failFile=false;
 // Concurrent commits must finish in call order across both backends.
 const [a,b]=await Promise.all([api.commitCatalog(sample("s7")),api.commitCatalog(sample("s8"))]);
 assert.ok(Date.parse(b)>Date.parse(a));assert.equal((await api.getCatalog()).data.songs[0].id,"s8");
 assert.equal(savedFile.data.songs[0].id,"s8");assert.equal(meta.get("last_sync"),b);
 const original=records.get(id("songs","s8"));records.set(id("songs","s8"),JSON.stringify({id:"wrong"}));
 assert.equal((await api.getCatalog()).storage,"archivo-local");
 records.set(id("songs","s8"),original);
 await Promise.all([api.setMetadata("profile","one"),api.setMetadata("favorites","two")]);
 assert.equal(await api.getMetadata("profile"),"one");assert.equal(await api.getMetadata("favorites"),"two");
 // Simulate a batch that succeeds only on files, then a later SQLite-only write.
 failPrefSql=true;await api.setMetadataBatch({profile:"file-new",favorites:"file-new",collections:"file-new"});
 assert.equal(await api.getMetadata("profile"),"file-new");assert.equal(meta.get("profile"),"one");
 failPrefSql=false;failPrefFile=true;await api.setMetadata("profile","sql-new");
 assert.equal(await api.getMetadata("profile"),"sql-new");assert.equal(await api.getMetadata("favorites"),"file-new");
 failPrefSql=true;const before=JSON.stringify(await api.getMetadataBatch({profile:"",favorites:"",collections:""}));
 await assert.rejects(api.setMetadataBatch({profile:"bad",favorites:"bad",collections:"bad"}));
 assert.equal(JSON.stringify(await api.getMetadataBatch({profile:"",favorites:"",collections:""})),before);
 failPrefSql=false;failPrefFile=false;
 await api.setMetadataBatch({profile:"restored",favorites:"restored",collections:"restored",last_read:""});
 assert.equal(await api.getMetadata("profile"),"restored");assert.equal(filePrefs.data.favorites,"restored");
 assert.equal(filePrefs.revisions.profile,filePrefs.revisions.collections);
 console.log("SHALOM: catalog and preference transactions, dual-backend reconciliation and partial failure recovery verified.");
})().catch(error=>{console.error(error);process.exitCode=1});
