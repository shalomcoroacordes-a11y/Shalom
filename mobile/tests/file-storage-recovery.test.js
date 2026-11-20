// Validaciones de las dos copias del catálogo Android sin emulador ni disco real.
const assert=require("node:assert/strict");
const Module=require("node:module");
const {TABLES}=require("../src/config");
const data=()=>Object.fromEntries(TABLES.map(name=>[name,[]]));
const originalLoad=Module._load;
const memory=new Map();
let nextWrite=null;
class FakeFile {
 constructor(root,name){this.name=name}
 get exists(){return memory.has(this.name)}
 create({overwrite}={}){if(this.exists&&!overwrite)throw Error("File exists");memory.set(this.name,"")}
 delete(){memory.delete(this.name)}
 async text(){if(!this.exists)throw Error("File missing");return memory.get(this.name)}
 async write(value){
  if(nextWrite){const effect=nextWrite;nextWrite=null;return effect(this.name,value)}
  memory.set(this.name,String(value));
 }
}
Module._load=function(name,parent,isMain){
 if(name==="expo-file-system")return {File:FakeFile,Paths:{document:"private-documents"}};
 return originalLoad.apply(this,arguments);
};
let storage;
try{
 const path=require.resolve("../src/file-storage");
 delete require.cache[path];
 storage=require("../src/file-storage");
}finally{Module._load=originalLoad}
function row(id){return {id,title:"Canción "+id,lyrics:"G\nGloria"}}
const key=name=>"shalom-offline-"+name+".json";
(async()=>{
 const empty=await storage.readSnapshot();
 assert.equal(empty.syncedAt,null);
 assert.equal(empty.storage,"archivo-local");
 assert.deepEqual(Object.keys(empty.data),[...TABLES]);
 const first=data();first.songs=[row("old")];
 const time1=await storage.saveSnapshot(first);
 assert.ok(Number.isFinite(Date.parse(time1)));
 assert.equal(memory.has(key("A")),true);
 const second=data();second.songs=[row("new")];
 const time2=await storage.saveSnapshot(second);
 const futureSql=new Date(Date.parse(time2)+100000).toISOString();
 assert.equal(storage.validSnapshot(JSON.parse(memory.get(key("A")))),true);
 assert.ok(Date.parse(time2)>Date.parse(time1),
  "La marca de tiempo avanza aunque ambos guardados ocurran en el mismo milisegundo");
 assert.equal(memory.has(key("B")),true);
 assert.equal(JSON.parse(memory.get(key("B"))).revision,2);
 assert.equal((await storage.readSnapshot()).revision,2);
 assert.match(JSON.parse(memory.get(key("B"))).checksum,/^[0-9a-f]{8}$/);
 assert.equal((await storage.readSnapshot()).data.songs[0].id,"new");

 // Una copia en B con mismo número de filas pero contenido alterado NO es válida.
 nextWrite=(name,value)=>{
  const payload=JSON.parse(value);
  payload.data.songs[0].id="changed";
  memory.set(name,JSON.stringify(payload));
 };
 const third=data();third.songs=[row("third")];
 await assert.rejects(storage.saveSnapshot(third),/verificar/);
 assert.equal((await storage.readSnapshot()).data.songs[0].id,"new",
  "Al detectar corrupción, conservar la otra ranura intacta");

 // Si una ranura queda incompleta se debe utilizar la copia válida anterior.
 nextWrite=(name,value)=>memory.set(name,value.slice(0,20));
 await assert.rejects(storage.saveSnapshot(third),/verificar/);
 assert.equal((await storage.readSnapshot()).data.songs[0].id,"new");

 const foreign=JSON.parse(memory.get(key("B")));
 foreign.source="proyecto-externo";
 assert.equal(storage.validSnapshot(foreign),false,"No leer copias de otra base de datos");
 const wrongId=JSON.parse(memory.get(key("B")));
 wrongId.data.songs=[{id:"x"},{id:"x"}];
 assert.equal(storage.validSnapshot(wrongId),false,"Rechazar identificadores duplicados");
 const sameLengthChanged=JSON.parse(memory.get(key("B")));
 sameLengthChanged.data.songs[0].id="nex";
 assert.equal(storage.validSnapshot(sameLengthChanged),false,
  "El checksum detecta cambios incluso cuando el tamaño del archivo es igual");
 const noId=JSON.parse(memory.get(key("B")));
 noId.data.songs=[{title:"Canto sin ID"}];
 assert.equal(storage.validSnapshot(noId),false);
 // Una descarga de una versión antigua puede no tener popurrís y repertorios.
 const legacy=JSON.parse(memory.get(key("B")));
 delete legacy.source;delete legacy.checksum;delete legacy.revision;
 delete legacy.data.medleys;delete legacy.data.repertoires;
 assert.equal(storage.validSnapshot(legacy),true,
  "Mantener compatibilidad con las copias anteriores de SHALOM");
 memory.set(key("A"),JSON.stringify(legacy));
 assert.equal((await storage.readSnapshot()).data.songs[0].id,"new");
 assert.ok(Array.isArray((await storage.readSnapshot()).data.medleys));

 // Preferencias del usuario NO forman parte del borrado del catálogo.
 await storage.setPreference("wifiOnly","true");
 assert.equal(await storage.getPreference("wifiOnly"),"true");
 assert.equal(await storage.getPreference("no-existe","defecto"),"defecto");
 const invalid=data();invalid.songs=[{title:"sin ID"}];
 await assert.rejects(storage.saveSnapshot(invalid),/verificar/);
 assert.equal((await storage.readSnapshot()).data.songs[0].id,"new");
 console.log("SHALOM Android: doble respaldo, recuperación, integridad y compatibilidad comprobados.");
})().catch(err=>{console.error(err);process.exitCode=1});
