const assert=require("node:assert/strict");
const {buildCatalog}=require("../src/catalog");
const {favoriteSongs,filterSongs,filterArtists,searchHomeSongs}=require("../src/library-selectors");

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
