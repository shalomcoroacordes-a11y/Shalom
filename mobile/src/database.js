// SHALOM: SQLite en datos privados Android y respaldo en Archivos privados.
const {TABLES}=require("./config");
const backup=require("./file-storage");
let SQLite=null;
let nativeError=null;
try{SQLite=require("expo-sqlite")}
catch(err){nativeError=err}
let opening=null;
async function openDb(){
 if(!SQLite) throw nativeError || new Error("SQLite no está disponible en Android.");
 if(!opening){
  opening=SQLite.openDatabaseAsync("shalom-cancionero.db").then(async db=>{
   await db.execAsync("PRAGMA journal_mode = WAL;");
   await db.execAsync("CREATE TABLE IF NOT EXISTS catalog_records ("+
    "table_name TEXT NOT NULL, record_id TEXT NOT NULL, payload TEXT NOT NULL, "+
    "PRIMARY KEY(table_name,record_id));"+
    "CREATE TABLE IF NOT EXISTS metadata ("+
    "meta_key TEXT PRIMARY KEY NOT NULL, meta_value TEXT NOT NULL);");
   await db.execAsync("CREATE INDEX IF NOT EXISTS idx_shalom_catalog_table ON catalog_records(table_name);");
   return db;
  }).catch(err=>{opening=null;throw err});
 }
 return opening;
}
const empty=()=>Object.fromEntries(TABLES.map(table=>[table,[]]));
async function sqliteCatalog(){
 const db=await openDb();
 // A single SQL statement reads metadata and records from the same snapshot.
 const rows=await db.getAllAsync("SELECT 'last_sync' AS kind, meta_value AS payload, NULL AS table_name, NULL AS record_id FROM metadata WHERE meta_key='last_sync' UNION ALL SELECT 'record' AS kind,payload,table_name,record_id FROM catalog_records ORDER BY kind,table_name,record_id");
 const syncedAt=rows.find(row=>row.kind==="last_sync")?.payload||null;
 const data=empty();
 if(!syncedAt)return {data,syncedAt,storage:"sqlite"};
 if(!Number.isFinite(Date.parse(syncedAt)))throw Error("Fecha de sincronización incorrecta");
 for(const row of rows)if(row.kind==="record"&&Object.hasOwn(data,row.table_name)){
  const item=JSON.parse(row.payload);
  if(item?.id!==row.record_id)throw Error("Identificador local incorrecto");
  data[row.table_name].push(item);
 }
 validate(data);
 return {data,syncedAt,storage:"sqlite"};
}
async function getCatalog(){
 let native=null,file=null,oneError=null;
 try{native=await sqliteCatalog()}catch(err){oneError=err}
 try{file=await backup.readSnapshot()}catch(err){oneError=oneError||err}
 if(native?.syncedAt && (!file?.syncedAt||Date.parse(native.syncedAt)>=Date.parse(file.syncedAt)))return native;
 if(file?.syncedAt)return file;
 if(native)return native;
 if(file)return file;
 throw new Error("No se pudo abrir el almacenamiento interno: "+(oneError?.message||"error desconocido"));
}
function validate(data){
 if(!data||!TABLES.every(table=>Array.isArray(data[table])))throw new Error("Descarga incompleta");
 for(const table of TABLES){
  const ids=new Set();
  for(const row of data[table]){
   if(!row||typeof row.id!=="string"||!row.id||ids.has(row.id))throw new Error("Registro duplicado o incorrecto en "+table);
   ids.add(row.id);
  }
 }
}
async function saveSQLite(data,syncedAt){
 const db=await openDb();
 await db.withExclusiveTransactionAsync(async trx=>{
  await trx.runAsync("DELETE FROM catalog_records");
  for(const table of TABLES){
   for(const row of data[table]){
    await trx.runAsync("INSERT INTO catalog_records(table_name,record_id,payload) VALUES(?,?,?)",
     table,row.id,JSON.stringify(row));
   }
  }
  await trx.runAsync("INSERT INTO metadata(meta_key,meta_value) VALUES('last_sync',?) "+
   "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value",syncedAt);
 });
}
function newerTimestamp(...values){
 const newest=Math.max(0,...values.map(value=>Date.parse(value||""))
  .filter(value=>Number.isFinite(value)));
 return new Date(Math.max(Date.now(),newest+1)).toISOString();
}
// Serialize both backend writes. Otherwise concurrent commits can choose the
// same recovery slot and finish SQLite in a different order.
let catalogWrites=Promise.resolve();
function commitCatalog(data){
 const task=catalogWrites.then(()=>writeCatalog(data));
 catalogWrites=task.catch(()=>{});
 return task;
}
async function writeCatalog(data){
 validate(data);
 let fileSaved=null,sqlSaved=false,errors=[];
 // La copia nueva debe ser más reciente que SQLite anterior, aun si
 // una sincronización previa sólo consiguió escribir en SQLite.
 let previousSqlSync=null;
 try{
  const db=await openDb();
  const row=await db.getFirstAsync("SELECT meta_value FROM metadata WHERE meta_key='last_sync'");
  previousSqlSync=row?.meta_value||null;
 }catch(_){}
 // Guardamos primero una copia en Documentos; si SQLite falla la aplicación conserva el catálogo.
 try{fileSaved=await backup.saveSnapshot(data,previousSqlSync)}catch(err){errors.push("Archivos: "+err.message)}
 let syncedAt=fileSaved;
 if(!syncedAt){
  let previousFileSync=null;
  try{previousFileSync=(await backup.readSnapshot()).syncedAt}catch(_){}
  syncedAt=newerTimestamp(previousSqlSync,previousFileSync);
 }
 try{await saveSQLite(data,syncedAt);sqlSaved=true}catch(err){errors.push("SQLite: "+err.message)}
 if(!fileSaved&&!sqlSaved)throw new Error("No se pudo guardar el cancionero: "+errors.join(" / "));
 return syncedAt;
}
async function getMetadata(key,fallback=null){
 try{
  const db=await openDb(),row=await db.getFirstAsync("SELECT meta_value FROM metadata WHERE meta_key=?",key);
  if(row?.meta_value!=null)return row.meta_value;
 }catch(_){}
 return backup.getPreference(key,fallback);
}
// Preserve the order of writes from independent profile/likes/collection UI queues.
let metadataWrites=Promise.resolve();
function setMetadata(key,value){
 const task=metadataWrites.then(()=>writeMetadata(key,value));
 metadataWrites=task.catch(()=>{});
 return task;
}
async function writeMetadata(key,value){
 let okay=false,lastError=null;
 try{
  const db=await openDb();
  await db.runAsync("INSERT INTO metadata(meta_key,meta_value) VALUES(?,?) "+
   "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value",key,String(value));
  okay=true;
 }catch(err){lastError=err}
 try{await backup.setPreference(key,value);okay=true}catch(err){lastError=lastError||err}
 if(!okay)throw lastError||new Error("No se pudo guardar la preferencia");
}
module.exports={openDb,getCatalog,commitCatalog,getMetadata,setMetadata};