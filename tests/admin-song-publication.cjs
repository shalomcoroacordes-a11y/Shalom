"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={};vm.runInNewContext(fs.readFileSync("admin-song-publication.js","utf8"),{window});
const api=window.ShalomAdminSongPublication;
const draft={title:"  Canción de Amor  ",tone:" G ",lyrics:"[Coro]\nC  G\nLetra  ",song_type:"cristiano",difficulty:" Fácil ",main_artist_id:"a1",collaborators:["a1","a2","",7],category_ids:["c1","c2","c1",""],album_id:"al",capo_position:"2",capo_key:" F "};
const links=[{url:"https://example.test",sort_order:9}],capos=[{capo_position:"3",capo_key:"E",sort_order:4}];
const before=JSON.stringify([draft,links,capos]);
assert.equal(api.validate(draft),"");
for(const [patch,message] of [
 [{title:" "},"Escribe el título de la canción."],
 [{tone:" "},"Escribe el tono original."],
 [{main_artist_id:""},"Selecciona al menos un artista."],
 [{capo_position:"2.5"},"Capo principal inválido."],
 [{capo_position:13},"Capo principal inválido."],
 [{capo_position:-1},"Capo principal inválido."],
 [{capo_position:"abc"},"Capo principal inválido."],
 [{capo_key:" "},"Si usas capo principal, escribe las figuras."]
])assert.equal(api.validate({...draft,...patch}),message);
const payload=JSON.parse(JSON.stringify(api.prepare(draft,"song-id","original-revision",links,capos)));
assert.deepEqual(payload,{
 p_song:{id:"song-id",title:"Canción de Amor",slug:"cancion-de-amor",song_type:"cristiano",tone:"G",lyrics:draft.lyrics,difficulty:"Fácil",capo_position:2,capo_key:"F",artist_id:"a1",category_id:"c1"},
 p_artists:[{artist_id:"a1",role:"principal",sort_order:0},{artist_id:"a2",role:"colaborador",sort_order:1},{artist_id:"7",role:"colaborador",sort_order:2}],
 p_categories:[{category_id:"c1"},{category_id:"c2"}],
 p_albums:[{album_id:"al",sort_order:0}],
 p_links:[{title:"Enlace",link_type:"Tutorial",platform:"",url:"https://example.test",sort_order:0}],
 p_capos:[{label:"",capo_position:3,capo_key:"E",sort_order:0}],
 p_expected:"original-revision"
});
assert.equal(JSON.stringify([draft,links,capos]),before);
const legacy=api.prepare({...draft,category_ids:null,category_id:"old",capo_position:0,album_id:"",difficulty:""},"new",null,[],[]);
assert.equal(legacy.p_song.category_id,"old");assert.equal(legacy.p_song.capo_key,"");assert.equal(legacy.p_song.difficulty,null);assert.equal(legacy.p_albums.length,0);assert.equal(legacy.p_expected,null);
assert.equal(api.validate({...draft,capo_position:0,capo_key:""}),"");
const source=fs.readFileSync("admin-pro.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.match(source,/window\.ShalomAdminSongPublication\.prepare\(draft, id, expected, AP.links, AP.capos\)/);
assert.match(source,/window\.ShalomAdminSongPublication\.validate\(draft\)/);
assert.ok(html.indexOf('src="admin-song-publication.js?v=1"')>=0&&html.indexOf('src="admin-song-publication.js?v=1"')<html.indexOf('src="admin-pro.js'));
console.log("Publication preparation: field validation, exact RPC contract, relationships, revision and source integrity verified.");
