const assert=require("node:assert/strict");
const {buildCatalog}=require("../src/catalog");
const {favoriteSongs,filterSongs,filterArtists,searchHomeSongs,selectDetailRecords,selectActionSong}=require("../src/library-selectors");

const raw={
 songs:[
  {id:"s1",title:"Gloria a Dios",tone:"G",lyrics:"Señor, ten piedad",song_type:"catolico"},
  {id:"s2",title:"Ave María",tone:"D",lyrics:"Cantamos contigo",song_type:"catolico"},
  {id:"s3",title:"Aleluya",tone:"C",lyrics:"Resucitó el Señor",song_type:"cristiano"},
  {id:"s4",title:"Paz de Cristo",tone:"A",lyrics:"Adoración",song_type:"catolico"}],
 artists:[{id:"a1",name:"Coro Shalom",artist_type:"catolico",description:"Parroquia"},
  {id:"a2",name:"Ministerio Resurrección",artist_type:"cristiano",description:"Alabanzas"}],
 categories:[{id:"c1",name:"Misa",song_type:"catolico",parent_id:null},
  {id:"c2",name:"Comunión",song_type:"catolico",parent_id:"c1"},
  {id:"c3",name:"Alabanza",song_type:"cristiano",parent_id:null}],
 song_artists:[{song_id:"s1",artist_id:"a1"},{song_id:"s2",artist_id:"a1"},
  {song_id:"s3",artist_id:"a2"}],
 song_categories:[{song_id:"s1",category_id:"c1"},{song_id:"s2",category_id:"c2"},
  {song_id:"s3",category_id:"c3"}]
};
const model=buildCatalog(raw);
const liked=new Set(["s2","s3"]);
const titles=songs=>songs.map(s=>s.title);
assert.deepEqual(titles(filterSongs(model)),titles(model.songs));
assert.deepEqual(titles(filterSongs(model,{query:"MARIA"})),["Ave María"]);
assert.deepEqual(titles(filterSongs(model,{query:"senor"})),["Aleluya","Gloria a Dios"]);
assert.deepEqual(titles(filterSongs(model,{query:"coro shalom"})),["Ave María","Gloria a Dios"]);
assert.deepEqual(titles(filterSongs(model,{typeFilter:"cristiano"})),["Aleluya"]);
assert.deepEqual(titles(filterSongs(model,{onlyLiked:true,likedSet:liked})),["Aleluya","Ave María"]);
assert.deepEqual(titles(favoriteSongs(model,liked)),["Aleluya","Ave María"]);
assert.deepEqual(titles(filterSongs(model,{onlyLiked:true,likedSet:liked,typeFilter:"catolico"})),["Ave María"]);
assert.deepEqual(titles(filterSongs(model,{categoryId:"c1"})),["Ave María","Gloria a Dios"]);
assert.deepEqual(titles(filterSongs(model,{categoryId:"c2"})),["Ave María"]);
assert.deepEqual(titles(filterSongs(model,{categoryId:"inexistente"})),[]);
assert.deepEqual(titles(filterSongs(model,{categoryId:"c1",query:"GLORIA"})),["Gloria a Dios"]);
const calls=[];
const spy={...model,descendants:id=>{calls.push(id);return model.descendants(id)}};
filterSongs(spy,{categoryId:"c1",query:"a"});
assert.deepEqual(calls,["c1"],"Calcular la jerarquia solo una vez por consulta");
assert.deepEqual(filterArtists(model).map(a=>a.name),["Coro Shalom","Ministerio Resurrección"]);
assert.deepEqual(filterArtists(model,{type:"catolico"}).map(a=>a.name),["Coro Shalom"]);
assert.deepEqual(filterArtists(model,{query:"resurreccion"}).map(a=>a.name),["Ministerio Resurrección"]);
assert.deepEqual(filterArtists(model,{query:"PARROQUIA"}).map(a=>a.name),["Coro Shalom"]);
assert.deepEqual(filterArtists(model,{query:"sin coincidencias"}),[]);
assert.deepEqual(titles(searchHomeSongs(model,"maria")),["Ave María"]);
assert.deepEqual(titles(searchHomeSongs(model,"gloria")),["Gloria a Dios"]);
assert.deepEqual(titles(searchHomeSongs(model,"")),[]);
assert.deepEqual(titles(searchHomeSongs(model,"a",2)),["Aleluya","Ave María"]);
assert.deepEqual([...liked],["s2","s3"],"Los favoritos no deben modificarse");
console.log("SHALOM: filtros, favoritos, artistas y busqueda Inicio independientes.");

const detailed=buildCatalog({...raw,albums:[{id:"al1",title:"Álbum"}],medleys:[{id:"m1",title:"Popurrí",is_published:true,parts:[]}],repertoires:[{id:"r1",title:"Misa",is_published:true,items:[]}]});
const empty={active:null,focusedArtist:null,focusedAlbum:null,focusedMedley:null,focusedRepertoire:null};
assert.deepEqual(selectDetailRecords(detailed,null),empty);
for(const [type,id,key,record] of [
 ["song","s1","active",detailed.songs.find(s=>s.id==="s1")],
 ["artist","a1","focusedArtist",detailed.artistMap.get("a1")],
 ["album","al1","focusedAlbum",detailed.albumMap.get("al1")],
 ["medley","m1","focusedMedley",detailed.medleys[0]],
 ["repertoire","r1","focusedRepertoire",detailed.repertoires[0]]
]){
 assert.deepEqual(selectDetailRecords(detailed,{type,id}),{...empty,[key]:record});
 assert.deepEqual(selectDetailRecords(detailed,{type,id:"missing"}),{...empty,[key]:undefined});
}
assert.equal(selectActionSong(detailed,"s1").id,"s1");
assert.equal(selectActionSong(detailed,null),null);
assert.equal(selectActionSong(detailed,"missing"),undefined);
const numeric=buildCatalog({songs:[{id:12,title:"Ejemplo"}]});
assert.equal(selectActionSong(numeric,"12").id,12);
assert.equal(selectDetailRecords(numeric,{type:"song",id:"12"}).active,undefined);
const appSource=require("node:fs").readFileSync("App.js","utf8");
assert.ok(appSource.includes("selectDetailRecords(model,detail)"));
assert.ok(appSource.includes("selectActionSong(model,actionSongId)"));

let reads=0;
const previewModel={songs:Array.from({length:1000},(_,i)=>({id:String(i),get title(){reads++;return "Canto "+i},lyrics:"Gloria",_artists:[],_categories:[]}))};
assert.equal(searchHomeSongs(previewModel,"Gloria",6).length,6);assert.equal(reads,6,"Stop after filling the six preview matches");
assert.deepEqual(searchHomeSongs(previewModel,"Gloria",0),[]);assert.equal(reads,6);
assert.equal(searchHomeSongs(previewModel,"Gloria",-1).length,999,"Preserve slice semantics");
