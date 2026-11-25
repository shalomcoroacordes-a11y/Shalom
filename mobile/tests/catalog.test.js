const assert=require("node:assert/strict");
const {buildCatalog,safeWebUrl}=require("../src/catalog");
const catholic={id:"c1",name:"Adoración",song_type:"catolico",parent_id:null};
const christian={id:"c2",name:"Adoración",song_type:"cristiano",parent_id:null};
const missa={id:"c3",name:"Misa",song_type:"catolico",parent_id:null};
const aleluya={id:"c4",name:"Aleluya",song_type:"catolico",parent_id:"c3"};
const data={
 songs:[{id:"s1",title:"Hay una unción",tone:"D",song_type:"catolico"}],
 artists:[{id:"a1",name:"Coro Shalom",artist_type:"catolico"}],
 categories:[catholic,christian,missa,aleluya],
 albums:[{id:"al1",title:"Primer álbum",artist_id:"a1"}],
 song_artists:[{id:"sa1",song_id:"s1",artist_id:"a1"}],
 song_categories:[{id:"sc1",song_id:"s1",category_id:"c1"},{id:"sc2",song_id:"s1",category_id:"c4"}],
 album_songs:[{id:"as1",song_id:"s1",album_id:"al1"}],
 song_links:[{id:"l1",song_id:"s1",url:"https://youtu.be/test"}],
 song_capo_versions:[]
};
const catalog=buildCatalog(data);
assert.equal(catalog.songs.length,1);
assert.equal(catalog.songsForArtist("a1").length,1);
assert.equal(catalog.songsForAlbum("al1").length,1);
assert.equal(catalog.songsForCategory("c3").length,1);
assert.equal(catalog.songsForCategory("c2").length,0);
assert.equal(catalog.categoryPath(catholic),"Católico › Adoración");
assert.equal(catalog.categoryPath(christian),"Cristiano › Adoración");
const generalFolder={id:"g1",name:"misa de hoy",song_type:"",parent_id:null};
const generalChild={id:"g2",name:"Gloria",song_type:"",parent_id:"g1"};
const generalModel=buildCatalog({ ...data, categories:[...data.categories,generalFolder,generalChild] });
assert.deepEqual(generalModel.children(null,"general").map(x=>x.name),["misa de hoy"]);
assert.deepEqual(generalModel.children("g1").map(x=>x.name),["Gloria"]);
assert.equal(generalModel.categoryPath(generalChild),"General › misa de hoy › Gloria");

assert.deepEqual(catalog.children("c3").map(x=>x.name),["Aleluya"]);
assert.equal(catalog.songs[0]._links[0].url,"https://youtu.be/test");
assert.equal(safeWebUrl("javascript:alert(1)"),null);
assert.equal(safeWebUrl("https://youtu.be/test"),"https://youtu.be/test");
assert.equal(buildCatalog({}).songs.length,0);
console.log("SHALOM Android: navegación nativa y vínculos verificados.");
// Compare indexed queries to the previous scan semantics on a synthetic large catalog.
const many={artists:Array.from({length:30},(_,i)=>({id:"a"+i,name:"Artista "+i})),albums:Array.from({length:12},(_,i)=>({id:"al"+i,title:"Álbum "+i})),categories:Array.from({length:60},(_,i)=>({id:"c"+i,name:"Categoría "+i,parent_id:i===0?null:"c"+Math.floor((i-1)/3),song_type:i%2?"catolico":"cristiano",sort_order:i%5})),songs:Array.from({length:2400},(_,i)=>({id:"s"+i,title:"Canto "+i,artist_id:"a"+i%30,category_id:"c"+i%60})),song_categories:[],album_songs:[]};
for(let i=0;i<many.songs.length;i++){many.song_categories.push({song_id:"s"+i,category_id:"c"+i%60},{song_id:"s"+i,category_id:"c"+(i+1)%60});many.album_songs.push({song_id:"s"+i,album_id:"al"+i%12});}
const indexed=buildCatalog(many);
for(const a of many.artists)assert.deepEqual(indexed.songsForArtist(a.id),indexed.songs.filter(s=>s._artists.some(x=>x.id===a.id)));
for(const a of many.albums)assert.deepEqual(indexed.songsForAlbum(a.id),indexed.songs.filter(s=>s._albums.some(x=>x.id===a.id)));
for(const cat of many.categories){const ids=indexed.descendants(cat.id);assert.deepEqual(indexed.songsForCategory(cat.id),indexed.songs.filter(s=>s._categories.some(x=>ids.has(x.id))));}
const before=indexed.songsForArtist("a0").length;indexed.songsForArtist("a0").pop();assert.equal(indexed.songsForArtist("a0").length,before);
indexed.songs.filter=()=>{throw Error("Unexpected full library scan")};
assert.equal(indexed.songsForArtist("a0").length,80);assert.equal(indexed.songsForAlbum("al0").length,200);assert.equal(indexed.songsForCategory("c0").length,2400);
const cyclic=buildCatalog({categories:[{id:"a",parent_id:"b"},{id:"b",parent_id:"a"},{id:"c",parent_id:"b"}]});assert.deepEqual([...cyclic.descendants("a")].sort(),["a","b","c"]);
console.log("Catalog indexes: 102 relation comparisons, 2400 songs, cyclic hierarchy and no repeated full scan verified.");
