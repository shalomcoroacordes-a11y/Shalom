// Prueba de integración del RPC existente de SHALOM, sin tocar producción.
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const source=fs.readFileSync("admin-song-persistence.js","utf8");
const scope={window:{}};
vm.runInNewContext(source,scope);
const service=scope.window.ShalomAdminSongPersistence;
const slug=s=>s.trim().toLowerCase().replaceAll(" ","-");
const draft={title:" Gloria ",tone:"G",lyrics:"[Coro]\nG\nGloria",
 song_type:"catolico",main_artist_id:"artist-1",collaborators:["artist-2"],
 category_ids:["category-1"],album_id:"album-1",
 capo_position:2,capo_key:"F"};
const links=[{title:"Guía",url:"https://example.test/video",link_type:"Tutorial",platform:"YouTube"}];
const capos=[{label:"Alternativo",capo_position:3,capo_key:"D"}];
function prepare(next=draft){return service.prepare(next,links,capos,slug)}
const a=service.legacyRpcArguments(prepare(),null);
assert.ok(a);
assert.deepEqual(JSON.parse(JSON.stringify(a)),{
 p_song_id:null,
 p_song:{title:"Gloria",slug:"gloria",song_type:"catolico",tone:"G",
  lyrics:"[Coro]\nG\nGloria",difficulty:null,capo_position:2,capo_key:"F"},
 p_artists:[{artist_id:"artist-1"},{artist_id:"artist-2"}],
 p_category_id:"category-1",p_album_id:"album-1",
 p_links:[{title:"Guía",link_type:"Tutorial",platform:"YouTube",url:"https://example.test/video"}],
 p_capos:[{label:"Alternativo",capo_position:3,capo_key:"D"}]
});
assert.equal(service.legacyRpcArguments(prepare({...draft,category_ids:["c1","c2"]}),null),null,
 "No enviar varias categorías a un RPC que solo guarda una");
assert.equal(service.legacyRpcArguments(prepare({...draft,category_ids:[]}),null).p_category_id,null);
assert.equal(service.legacyRpcArguments(prepare(),"song-123").p_song_id,"song-123");
const untouched=JSON.stringify({draft,links,capos});
(async()=>{
 const events=[];
 const db={rpc:async(name,args)=>{
  events.push({name,args});return {data:"song-1",error:null};
 },from(){throw Error("No debe escribir tablas directamente si hay RPC")}};
 const success=await service.save({db,draft,links,capos,slug});
 assert.equal(success.ok,true);
 assert.equal(success.songId,"song-1");
 assert.equal(events.length,1);
 assert.equal(events[0].name,"jhd_save_song_bundle");
 assert.equal(events[0].args.p_song_id,null);
 const edit=await service.save({db,draft,links,capos,slug,id:"song-1"});
 assert.equal(edit.ok,true);
 assert.equal(events[1].args.p_song_id,"song-1");
 const denial={rpc:async()=>({error:{message:"Acceso denegado"}}),from(){
  throw Error("Nunca degradar permisos a INSERT directo");
 }};
 const failed=await service.save({db:denial,draft,links,capos,slug});
 assert.equal(failed.ok,false);assert.equal(failed.phase,"rpc");
 assert.match(failed.message,/Acceso denegado/);
 const disconnected={rpc:async()=>{throw new Error("Tiempo agotado");},from(){
  throw Error("No se puede repetir a ciegas");
 }};
 const unknown=await service.save({db:disconnected,draft,links,capos,slug});
 assert.equal(unknown.phase,"uncertain");
 assert.match(unknown.message,/Verifica el catálogo/);
 assert.equal(unknown.songId,undefined);
 const noId={rpc:async()=>({data:null,error:null}),from(){
  throw Error("No se debe suponer éxito");
 }};
 const uncertain=await service.save({db:noId,draft,links,capos,slug});
 assert.equal(uncertain.phase,"uncertain");

 const multiDb={
  rpc(){throw Error("El RPC antiguo NO admite dos categorías")},
  from(table){
   if(table==="songs")return {insert(rows){return {select(){return {
    single:async()=>({data:{id:"song-2"},error:null})};}};}};
   return {delete(){return {eq:async()=>({error:null})}},insert:async()=>({error:null})};
  }
 };
 const multi=await service.save({db:multiDb,draft:{...draft,category_ids:["cat-1","cat-2"]},links,capos,slug});
 assert.equal(multi.ok,true);
 assert.equal(multi.songId,"song-2");
 assert.equal(JSON.stringify({draft,links,capos}),untouched);
 console.log("SHALOM Admin: RPC atómico para una categoría; múltiples categorías protegidas.");
})().catch(e=>{console.error(e);process.exitCode=1});
