// Recorrido integrado de contrato: Admin -> Web -> Android sin red real.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const {TABLES,SUPABASE_URL}=require("../mobile/src/config");
const {buildCatalog}=require("../mobile/src/catalog");
const admin=read("admin.html"),persistence=read("admin-song-persistence.js");
for(const [page,script,node] of [
 ["canciones.html","canciones.js",'id="songsGrid"'],
 ["repertorios.html","repertoires.js",'id="repReader"'],
 ["popurris.html","popurris.js",'id="medleyReader"']
]){
 const html=read(page);
 assert.ok(html.includes("Supabase.js")&&html.includes(script),page);
 assert.ok(html.indexOf("Supabase.js")<html.indexOf(script),page);
 assert.ok(html.includes(node)&&html.includes("site-shell.js"),page);
}
assert.ok(admin.indexOf("admin-song-persistence.js")<admin.indexOf("admin-pro.js"));
assert.match(persistence,/ShalomAdminSongPersistence = Object\.freeze/);
assert.match(persistence,/legacyRpcArguments\(plan, id\)/);
assert.match(persistence,/multiCategoryRpcArguments\(plan, id\)/);
const sync=read("mobile/src/sync.js"),db=read("mobile/src/database.js");
assert.match(sync,/data\[table\] = await allRows\(table\)/);
assert.match(sync,/commitCatalog\(data\)/);
assert.match(db,/withExclusiveTransactionAsync/);
assert.match(db,/CREATE TABLE IF NOT EXISTS metadata/);
assert.doesNotMatch(db,/DELETE FROM metadata/);
assert.ok(SUPABASE_URL.includes("ehpvsasyzlrlypjjpzuk"));
assert.deepEqual(Array.from(TABLES),[
 "songs","artists","categories","albums","song_artists","song_categories",
 "album_songs","song_links","song_capo_versions","medleys","repertoires"
]);
const data={
 songs:[{id:"s1",title:"Gloria de prueba",tone:"G",lyrics:"G\nGloria",song_type:"catolico"}],
 artists:[{id:"a1",name:"Coro Shalom"}],
 categories:[{id:"c1",name:"Misa",song_type:"catolico"},
 {id:"c2",name:"Gloria",song_type:"catolico",parent_id:"c1"}],
 song_artists:[{id:"sa1",song_id:"s1",artist_id:"a1"}],
 song_categories:[{id:"sc1",song_id:"s1",category_id:"c1"},
  {id:"sc2",song_id:"s1",category_id:"c2"}],
 medleys:[{id:"m1",title:"Popurrí público",is_published:true,parts:[{song_id:"s1",lyrics:"G\nGloria"}]},
  {id:"m2",title:"Borrador",is_published:false,parts:[{song_id:"s1"}]}],
 repertoires:[{id:"r1",title:"Misa pública",kind:"misa",is_published:true,items:[{song_id:"s1"}]},
  {id:"r2",title:"Ensayo privado",kind:"ensayo",is_published:false,items:[{song_id:"s1"}]}]
};
const original=JSON.stringify(data),model=buildCatalog(data);
assert.equal(model.songs.length,1);
assert.equal(model.songs[0]._categories.length,2);
assert.equal(model.songs[0]._artists[0].name,"Coro Shalom");
assert.deepEqual(model.songsForCategory("c1").map(s=>s.id),["s1"]);
assert.deepEqual(model.songsForCategory("c2").map(s=>s.id),["s1"]);
assert.deepEqual(model.medleys.map(x=>x.id),["m1"]);
assert.deepEqual(model.repertoires.map(x=>x.id),["r1"]);
assert.equal(model.repertoires[0].items[0].song_id,model.songs[0].id);
assert.equal(JSON.stringify(data),original);
console.log("SHALOM: contrato Admin, web, catálogo Android y offline comprobado.");
