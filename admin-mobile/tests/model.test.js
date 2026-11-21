"use strict";
const assert=require("node:assert/strict");
const {baseRecord,mainPayload,relations,slug,FIELDS,TITLES}=require("../src/model");
for(const [type,schema] of Object.entries(FIELDS)){assert.ok(TITLES[type]);assert.ok(schema.length);}
const song=baseRecord("songs",{
 title:"María, mi guía",song_type:"catolico",tone:"G",lyrics:"G    D\nMi canción",
 capo_position:"2",capo_key:"F",difficulty:"",
 artist_id:"11111111-1111-4111-8111-111111111111",
 category_ids:["22222222-2222-4222-8222-222222222222"],
 collaborator_ids:[],album_id:"",
 links:[{title:"Tutorial",url:"https://youtube.com/watch?v=1",platform:"YouTube"}],
 capos:[{capo_position:4,capo_key:"D",label:"Alternativo"}]
});
song.id="33333333-3333-4333-8333-333333333333";
assert.equal(song.slug,"maria-mi-guia");
assert.equal(mainPayload("songs",song).links,undefined);
assert.equal(relations(song).song_links[0].title,"Tutorial");
assert.equal(relations(song).song_capo_versions[0].capo_position,4);
assert.equal(relations(song).song_categories.length,1);
assert.throws(()=>baseRecord("songs",{...song,capo_position:13}),/Capo/);
assert.throws(()=>baseRecord("songs",{...song,links:[{title:"X",url:"http://unsecure"}]}),/Enlace/);
assert.throws(()=>baseRecord("categories",{name:"X",song_type:"mixto"}),/mixta/);
assert.equal(slug("Álbum de la Fe"),"album-de-la-fe");
console.log("Modelo, capos, enlaces y relaciones correctos.");
