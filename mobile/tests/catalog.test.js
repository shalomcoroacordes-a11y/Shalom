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
assert.deepEqual(catalog.children("c3").map(x=>x.name),["Aleluya"]);
assert.equal(catalog.songs[0]._links[0].url,"https://youtu.be/test");
assert.equal(safeWebUrl("javascript:alert(1)"),null);
assert.equal(safeWebUrl("https://youtu.be/test"),"https://youtu.be/test");
assert.equal(buildCatalog({}).songs.length,0);
console.log("SHALOM Android: navegación nativa y vínculos verificados.");