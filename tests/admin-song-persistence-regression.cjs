// Pruebas del guardado de canciones sin escribir en Supabase real.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("admin-song-persistence.js","utf8");
const admin=fs.readFileSync("admin-pro.js","utf8");
const html=fs.readFileSync("admin.html","utf8");
const context={window:{}};
vm.runInNewContext(source,context);
const service=context.window.ShalomAdminSongPersistence;
assert.ok(Object.isFrozen(service));
assert.deepEqual(Array.from(service.RELATIONS),
 ["song_artists","song_categories","album_songs","song_links","song_capo_versions"]);

function sample(){
 return {title:" Gloria a Dios ",song_type:"catolico",tone:" G ",lyrics:"G\nGloria",
  main_artist_id:"art-1",collaborators:["art-2","art-1","art-2"],
  category_id:"cat-1",category_ids:["cat-1","cat-2","cat-1"],
  album_id:"album-1",difficulty:"",capo_position:"2",capo_key:"F"};
}
const slug=x=>x.toLowerCase().replaceAll(" ","-");
const links=[{title:"Ensayo",url:"https://example.test",platform:"YouTube"}];
const capos=[{label:"Alternativa",capo_position:3,capo_key:"D"}];
assert.equal(service.prepare({...sample(),title:""},links,capos,slug).error,
 "Escribe el título de la canción.");
assert.equal(service.prepare({...sample(),tone:""},links,capos,slug).error,
 "Escribe el tono original.");
assert.equal(service.prepare({...sample(),main_artist_id:"",collaborators:[]},links,capos,slug).error,
 "Selecciona al menos un artista.");
assert.equal(service.prepare({...sample(),capo_key:""},links,capos,slug).error,
 "Si usas capo principal, escribe las figuras.");
const sourceDraft=sample(),before=JSON.stringify({sourceDraft,links,capos});
const plan=service.prepare(sourceDraft,links,capos,slug);
assert.deepEqual(JSON.parse(JSON.stringify(plan.payload)),{
 title:"Gloria a Dios",slug:"gloria-a-dios",song_type:"catolico",tone:"G",lyrics:"G\nGloria",
 difficulty:null,capo_position:2,capo_key:"F"});
const relations=Object.fromEntries(plan.relations("song-a").map(([table,rows])=>
 [table,JSON.parse(JSON.stringify(rows))]));
assert.deepEqual(relations.song_artists,[
 {song_id:"song-a",artist_id:"art-1",role:"principal",sort_order:0},
 {song_id:"song-a",artist_id:"art-2",role:"colaborador",sort_order:1}]);
assert.deepEqual(relations.song_categories,[
 {song_id:"song-a",category_id:"cat-1"},{song_id:"song-a",category_id:"cat-2"}]);
assert.deepEqual(relations.album_songs,[{song_id:"song-a",album_id:"album-1",sort_order:0}]);
assert.equal(relations.song_links[0].sort_order,0);
assert.equal(relations.song_capo_versions[0].capo_position,3);
assert.equal(JSON.stringify({sourceDraft,links,capos}),before);
assert.equal(service.missingOptionalColumn("column difficulty does not exist",{difficulty:"A"}),"difficulty");
assert.equal(service.missingOptionalColumn("permission denied for difficulty",{difficulty:"A"}),null);
assert.equal(service.missingOptionalColumn("Could not find the 'capo_key' column in schema cache",{capo_key:"F"}),"capo_key");

// Supabase simulado con la misma cadena from/insert/update/delete/select/single.
function fakeDb(){
 const state={calls:[],songs:new Map(),relations:new Map(),
  next:0,failSong:null,failDelete:null,failInsert:null,
  failNetwork:null,missingColumn:null};
 function resultSong(method,payload,id){
  const snapshot=JSON.parse(JSON.stringify(payload));
  state.calls.push({action:method,table:"songs",id,payload:snapshot});
  if(state.failSong)return {error:{message:state.failSong}};
  if(state.missingColumn && Object.hasOwn(payload,state.missingColumn)){
   return {error:{message:"Could not find the '"+state.missingColumn+
    "' column of 'songs' in the schema cache"}};
  }
  const songId=id||"song-"+(++state.next);
  state.songs.set(songId,snapshot);
  return {data:{id:songId},error:null};
 }
 const db={from(table){
  if(table==="songs")return {
   insert(rows){return {select(){return {single:async()=>
    resultSong("insert",rows[0],null)};}};},
   update(payload){return {eq(field,id){
    assert.equal(field,"id");
    return {select(){return {single:async()=>
     resultSong("update",payload,id)};}};
   }};}
  };
  return {
   delete(){return {eq:async(field,id)=>{
    assert.equal(field,"song_id");
    state.calls.push({action:"delete",table,id});
    if(state.failNetwork===table)throw new Error("Sin red");
    if(state.failDelete===table)return {error:{message:"No autorizado"}};
    state.relations.set(table,[]);
    return {error:null};
   }};},
   insert:async(rows)=>{
    state.calls.push({action:"insert",table,rows:JSON.parse(JSON.stringify(rows))});
    if(state.failNetwork===table)throw new Error("Sin red");
    if(state.failInsert===table)return {error:{message:"FK inválida"}};
    state.relations.set(table,JSON.parse(JSON.stringify(rows)));
    return {error:null};
   }
  };
 }};
 return {db,state};
}

(async()=>{
 const fresh=fakeDb();
 const args={db:fresh.db,draft:sourceDraft,links,capos,slug};
 const valid=await service.save(args);
 assert.equal(valid.ok,true);
 assert.equal(valid.phase,"complete");
 assert.equal(valid.songId,"song-1");
 assert.equal(fresh.state.songs.size,1);
 assert.equal(fresh.state.calls.filter(x=>x.action==="delete").length,5);
 assert.equal(fresh.state.calls.filter(x=>x.action==="insert"&&x.table!=="songs").length,5);
 assert.deepEqual(fresh.state.relations.get("song_artists"),relations.song_artists.map(r=>({...r,song_id:"song-1"})));
 const total=fresh.state.calls.length;
 const invalid=await service.save({...args,draft:{...sourceDraft,title:""}});
 assert.equal(invalid.phase,"validation");
 assert.equal(fresh.state.calls.length,total,"No escribir ningún registro inválido");

 const failedBase=fakeDb();
 failedBase.state.failSong="Permiso denegado";
 const noSong=await service.save({...args,db:failedBase.db});
 assert.equal(noSong.phase,"song");
 assert.equal(noSong.songId,undefined);
 assert.equal(failedBase.state.calls.length,1);
 assert.equal(failedBase.state.calls[0].action,"insert");

 const missing=fakeDb();
 missing.state.missingColumn="difficulty";
 const compatible=await service.save({...args,db:missing.db});
 assert.equal(compatible.ok,true,"El servidor con columnas opcionales antiguas funciona");
 assert.equal(missing.state.calls.filter(x=>x.table==="songs").length,2);
 assert.equal(Object.hasOwn(missing.state.songs.get("song-1"),"difficulty"),false);

 const arbitrary=fakeDb();
 arbitrary.state.failSong="Permission denied for difficulty";
 const denied=await service.save({...args,db:arbitrary.db});
 assert.equal(denied.ok,false);
 assert.equal(arbitrary.state.calls.length,1,"No omitir campos para ocultar permisos denegados");

 const partialClear=fakeDb();
 partialClear.state.failDelete="song_categories";
 const interrupted=await service.save({...args,db:partialClear.db});
 assert.equal(interrupted.phase,"clear");
 assert.equal(interrupted.songId,"song-1");
 assert.equal(interrupted.table,"song_categories");
 assert.match(interrupted.message,/Puedes reintentar/);
 assert.equal(partialClear.state.calls.filter(x=>x.action==="delete").length,2,
  "Detener inmediatamente las eliminaciones ante un error");
 assert.equal(partialClear.state.calls.filter(x=>x.action==="insert"&&x.table!=="songs").length,0);
 partialClear.state.failDelete=null;
 const retriedClear=await service.save({...args,db:partialClear.db,id:interrupted.songId});
 assert.equal(retriedClear.ok,true);
 assert.equal(partialClear.state.songs.size,1,"Reintentar no crea una canción duplicada");
 assert.equal(partialClear.state.calls.filter(x=>x.table==="songs").at(-1).action,"update");

 const partialWrite=fakeDb();
 partialWrite.state.failInsert="song_categories";
 const incomplete=await service.save({...args,db:partialWrite.db});
 assert.equal(incomplete.phase,"relations");
 assert.equal(incomplete.songId,"song-1");
 assert.equal(incomplete.table,"song_categories");
 assert.equal(partialWrite.state.calls.filter(x=>x.action==="insert"&&x.table!=="songs").length,2);
 partialWrite.state.failInsert=null;
 const retriedInsert=await service.save({...args,db:partialWrite.db,id:incomplete.songId});
 assert.equal(retriedInsert.ok,true);
 assert.equal(partialWrite.state.songs.size,1);
 assert.equal(partialWrite.state.relations.get("song_categories").length,2);

 const network=fakeDb();
 network.state.failNetwork="song_links";
 const disconnected=await service.save({...args,db:network.db});
 assert.equal(disconnected.phase,"network");
 assert.equal(disconnected.songId,"song-1");
 assert.match(disconnected.message,/Sin red/);

 // El controlador bloquea doble submit y guarda el ID aun con fallo parcial.
 const start=admin.indexOf("let apSongSaving = false;");
 const end=admin.indexOf("async function apHandleDeleteError(",start);
 assert.ok(start>=0&&end>start);
 let resolvers=[],saves=0,resets=0,refreshes=0,captures=0;
 const editing={draft:sample(),edits:{song:null},links,capos};
 const uiContext={
  AP:editing,AdminPro:{},apSlug:slug,
  window:{ShalomAdminSongPersistence:{save(){
   saves++;return new Promise(resolve=>resolvers.push(resolve));
  }}},
  apCaptureSongDraft(){captures++;},
  apResetDraft(){resets++;},
  async apRefresh(){refreshes++;},
  apNote(){},
 };
 vm.createContext(uiContext);
 vm.runInContext(admin.slice(start,end),uiContext);
 const e={preventDefault(){}};
 const first=uiContext.apSaveSong(e);
 const concurrent=uiContext.apSaveSong(e);
 assert.equal(saves,1,"Un doble clic no puede crear dos registros a la vez");
 resolvers.shift()({ok:false,songId:"created-song",message:"Relación incompleta"});
 await Promise.all([first,concurrent]);
 assert.equal(editing.edits.song,"created-song");
 assert.equal(resets,0,"El borrador no se borra cuando falla una relación");
 assert.equal(refreshes,0);
 const second=uiContext.apSaveSong(e);
 assert.equal(saves,2);
 resolvers.shift()({ok:true,songId:"created-song"});
 await second;
 assert.equal(resets,1);
 assert.equal(refreshes,1);
 assert.equal(captures,2);

 assert.ok(html.indexOf("admin-song-persistence.js")<html.indexOf("admin-pro.js"));
 console.log("SHALOM Admin: guardado recuperable, relaciones y reintentos sin duplicados.");
})().catch(err=>{console.error(err);process.exitCode=1});
