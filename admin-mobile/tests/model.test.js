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

const donation=baseRecord("donation_settings",{title:"Donativos",is_active:true,sort_order:2});
assert.equal(donation.is_active,true);
assert.equal(donation.sort_order,2);

assert.throws(()=>baseRecord("artists",{name:"Artista",featured_song_ids:["1","2","3","4"]}),/Máximo tres/);
assert.equal(mainPayload("artists",baseRecord("artists",{name:"Artista",featured_song_ids:["1"]})).featured_song_ids,undefined);

const {initial,fromServer,draftRecord}=require("../src/model");
for(const table of Object.keys(FIELDS)){
 const form=initial(table);assert.deepEqual(Object.keys(form),FIELDS[table].map(([key])=>key));
 for(const [key,,kind] of FIELDS[table])if(["categories","artists","links","capos","featured"].includes(kind)){assert.ok(Array.isArray(form[key]));assert.notEqual(form[key],initial(table)[key]);}
}
const raw={id:"s",title:"Gloria",lyrics:"G    D\nTexto",artist_id:null,updated_at:"r1"};
const all={song_categories:[{song_id:"s",category_id:"c2"},{song_id:"other",category_id:"c3"},{song_id:"s",category_id:"c1"}],song_artists:[{song_id:"s",artist_id:"a",role:"principal"},{song_id:"s",artist_id:"b",role:"colaborador"}],album_songs:[{song_id:"s",album_id:"al"}],song_links:[{song_id:"s",title:"Tutorial",url:"https://example.com"}],song_capo_versions:[{song_id:"s",capo_position:2,capo_key:"F"}]};
const form=fromServer("songs",raw,all);
assert.equal(form.artist_id,"a");assert.deepEqual(form.category_ids,["c2","c1"]);assert.deepEqual(form.collaborator_ids,["b"]);assert.equal(form.album_id,"al");assert.equal(form.links.length,1);assert.equal(form.capos.length,1);
const draft=draftRecord("songs",form,{id:"s",expected:"r1"},true);
assert.equal(draft.id,"s");assert.equal(draft.expected_updated,"r1");assert.equal(draft.status,"queued");assert.equal(draft.body.category_id,"c2");assert.equal(draft.body.id,"s");
assert.equal(draftRecord("songs", {...initial("songs"),title:"Nuevo",lyrics:"C"}, {id:"new-song",expected:null}).body.artist_id,null);
assert.equal(draftRecord("albums",{...initial("albums"),title:"Álbum"},{id:"al",expected:null}).body.artist_id,null);
assert.equal(draftRecord("categories",{...initial("categories"),name:"General"},{id:"c",expected:null}).body.parent_id,null);
assert.equal(draftRecord("repertoires",{...initial("repertoires"),title:"Misa"},{id:"r",expected:null}).body.event_date,null);
assert.deepEqual(draftRecord("site_content",{...initial("site_content"),content_key:"about",content:'{"a":1}'},{id:"new",expected:null}),{id:"about",type:"site_content",body:{content_key:"about",content:{a:1}},status:"draft",expected_updated:null});
assert.equal(draftRecord("site_content",{...initial("site_content"),content_key:"changed"},{id:"original",expected:"old"}).body.content_key,"original");
assert.deepEqual(JSON.parse(fromServer("medleys",{parts:[{song_id:"s"}]},{}).parts),[{song_id:"s"}]);
assert.deepEqual(fromServer("artists",{id:"a"},{artist_featured_songs:[{artist_id:"a",song_id:"two",sort_order:2},{artist_id:"a",song_id:"one",sort_order:1}]}).featured_song_ids,["one","two"]);
assert.throws(()=>draftRecord("songs",initial("songs"),{id:"s",expected:null}),/Falta el campo/);
console.log("Admin: hidratación de formularios, relaciones, borradores y revisiones verificados.");
