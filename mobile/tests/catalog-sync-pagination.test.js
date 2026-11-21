// Pruebas de paginación estable del catálogo público con páginas simuladas.
// Una falla jamás reemplaza el último catálogo guardado en el teléfono.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync(require("node:path").resolve(__dirname,"../src/sync.js"),"utf8");
const all=Array.from({length:552},(_,i)=>({id:"00000000-0000-0000-0000-"+String(i+1).padStart(12,"0")}));
function build(fetchImpl,{wifi=true,onCommit=()=>{}}={}){
 const db={commits:[]};
 const code={exports:{}};
 const mock={
  module:code,exports:code.exports,AbortController,setTimeout,clearTimeout,
  encodeURIComponent,fetch:fetchImpl,
  require(name){
   if(name==="@react-native-community/netinfo")return {default:{fetch:async()=>({
    isConnected:true,isInternetReachable:true,type:wifi?"wifi":"cellular"})}};
   if(name==="./config")return {SUPABASE_URL:"https://example.invalid",
    PUBLISHABLE_KEY:"public",TABLES:["songs"]};
   if(name==="./database")return {commitCatalog:async(data)=>{
    db.commits.push(data);
    return onCommit(data)||"2026-11-20T00:00:00.000Z";
   }};
   throw Error("Unexpected require "+name);
  }
 };
 vm.runInNewContext(source,mock,{filename:"mobile/src/sync.js"});
 return {syncAll:code.exports.syncAll,db};
}
function idGreater(row,cursor){return cursor===null||row.id>cursor}
function decodeCursor(url){
 const query=new URL(url).searchParams;
 assert.equal(query.get("select"),"*");
 assert.equal(query.get("order"),"id.asc");
 assert.equal(query.get("limit"),"250");
 assert.equal(query.get("offset"),null,"No usar desplazamientos ante cambios en el catálogo");
 const expr=query.get("id");
 return expr===null?null:(assert.ok(expr.startsWith("gt.")),expr.slice(3));
}
(async()=>{
 const requests=[],progress=[];
 let changed=false;
 const live=[...all];
 const client=build(async(url)=>{
  const after=decodeCursor(url);
  requests.push(after);
  const page=live.filter(item=>idGreater(item,after)).slice(0,250);
  // Simular que Admin elimina filas menores que el cursor mientras se lee.
  if(!changed){
   changed=true;
   live.splice(0,20);
  }
  return {ok:true,json:async()=>page};
 });
 const result=await client.syncAll({onProgress:p=>progress.push(p)});
 assert.equal(result.totalSongs,552);
 assert.equal(requests.length,3);
 assert.equal(requests[0],null);
 assert.equal(requests[1],all[249].id);
 assert.equal(requests[2],all[499].id);
 assert.deepEqual(Array.from(client.db.commits[0].songs,row=>row.id),
  all.map(row=>row.id),"Eliminar registros anteriores no provoca saltos");
 assert.equal(progress.at(-1).table,"Guardando SQLite");

 // Paginación completa de tamaño exacto: requiere respuesta vacía final.
 const exact=all.slice(0,500),queries=[];
 const exactClient=build(async(url)=>{
  const cursor=decodeCursor(url);queries.push(cursor);
  return {ok:true,json:async()=>exact.filter(x=>idGreater(x,cursor)).slice(0,250)};
 });
 const ended=await exactClient.syncAll();
 assert.equal(ended.totalSongs,500);
 assert.equal(queries.length,3);
 assert.equal(queries[2],exact[499].id);

 // Una página repetida no se guarda, aunque la red responda 200.
 let repeatCalls=0;
 const repeated=build(async()=>{
  repeatCalls++;
  return {ok:true,json:async()=>all.slice(0,250)};
 });
 await assert.rejects(repeated.syncAll(),/desordenada o duplicada/);
 assert.equal(repeatCalls,2);
 assert.equal(repeated.db.commits.length,0);

 // La página con IDs faltantes o en orden inverso tampoco se escribe.
 const missing=build(async()=>({ok:true,json:async()=>[{title:"sin identificador"}]}));
 await assert.rejects(missing.syncAll(),/desordenada o duplicada/);
 assert.equal(missing.db.commits.length,0);
 const unsorted=build(async()=>({ok:true,json:async()=>[
  {id:all[3].id},{id:all[1].id}]}));
 await assert.rejects(unsorted.syncAll(),/desordenada o duplicada/);
 assert.equal(unsorted.db.commits.length,0);

 const cellular=build(async()=>{throw Error("No descargar automáticamente en datos móviles");},
  {wifi:false});
 const skipped=await cellular.syncAll({wifiOnly:true,manual:false});
 assert.equal(skipped.skipped,true);
 assert.equal(cellular.db.commits.length,0);
 console.log("SHALOM: descarga estable de 552 registros, cambios durante páginas y errores protegidos.");
})().catch(e=>{console.error(e);process.exitCode=1});
