const assert=require("node:assert/strict");
const fs=require("node:fs");
const {localDay,personalCounts,officialHighlights}=require("../src/home-spotlight");
assert.equal(localDay(new Date(2026,10,19,12,0)), "2026-11-19");
const today=new Date(2026,10,19,12,0);
assert.deepEqual(personalCounts({collections:[]},[]),{likes:0,medleys:0,masses:0,creations:0});
const privateStore={collections:[
 {entries:[{kind:"misa"},{kind:"popurri"},{kind:"repertorio"}]},
 {entries:[{kind:"misa"},{kind:"popurri"}]}
]};
assert.deepEqual(personalCounts(privateStore,["s1","s2","s1"]),
 {likes:2,medleys:2,masses:2,creations:5},"Counters are real local data, not fake totals");
const repertoire=(id,title,kind,date,published=true)=>({id,title,kind,event_date:date,is_published:published,
 items:[{song_id:"s1"},{song_id:"s2"}],updated_at:"2026-11-18T10:00:00Z"});
const medley=(id,title,updated,published=true)=>({id,title,is_published:published,
 parts:[{song_id:"s1"}],updated_at:updated});
let featured=officialHighlights({
 repertoires:[
  repertoire("old","Misa pasada","misa","2026-11-12"),
  repertoire("private","Misa privada","misa","2026-11-19",false),
  repertoire("next","Próximo ensayo","ensayo","2026-11-22"),
  repertoire("today","Misa de hoy","misa","2026-11-19")],
 medleys:[
  medley("m1","Popurrí publicado","2026-11-18T12:00:00Z"),
  medley("m2","Popurrí más reciente","2026-11-19T08:00:00Z"),
  medley("secret","Borrador","2026-11-19T14:00:00Z",false)]
},today);
assert.equal(featured.length,2,"Only one upcoming repertoire and one published medley");
assert.equal(featured[0].label,"Misa de hoy");
assert.equal(featured[0].id,"today");
assert.equal(featured[0].count,2);
assert.equal(featured[1].id,"m2");
assert.equal(featured[1].label,"Popurrí de SHALOM");
assert.equal(featured[1].type,"medley");
featured=officialHighlights({repertoires:[
 repertoire("future","Misa del domingo","misa","2026-11-22"),
 repertoire("later","Ensayo navideño","ensayo","2026-12-01"),
 repertoire("undated","Repertorio preparado","ensayo",null)]},today);
assert.equal(featured.length,1);
assert.equal(featured[0].label,"Próxima misa");
assert.equal(featured[0].id,"future","Nearest upcoming repertoire takes precedence");
assert.equal(featured[0].subtitle,"22/11/2026");
featured=officialHighlights({repertoires:[
 repertoire("past","Misa pasada","misa","2026-01-01"),
 repertoire("undated","Para ensayo","ensayo",null)]},today);
assert.equal(featured[0].label,"Ensayo de SHALOM");
assert.equal(featured[0].id,"undated");
assert.deepEqual(officialHighlights({repertoires:[repertoire("past","Pasada","misa","2025-10-01")]},today),[],
 "Never label a past mass as today's or upcoming");
assert.deepEqual(officialHighlights({repertoires:[repertoire("draft","Privada","misa",null,false)],
 medleys:[medley("unpublished","Borrador","2026-11-19",false)]},today),[],
 "Drafts from admin must not appear on public Home");
assert.deepEqual(officialHighlights({medleys:[{id:"empty",title:"Sin partes",is_published:true,parts:[]}]},today),[],
 "Incomplete medleys cannot be featured");
const app=fs.readFileSync("App.js","utf8");
const styles=fs.readFileSync("src/app-styles.js","utf8");
assert.match(app,/personalCounts\(personal,likedIds\)/,"Counters follow persisted local state");
assert.match(app,/officialHighlights\(model,new Date\(\)\)/,"Feature only real admin published content");
assert.match(styles,/spotifyShortcuts:\{flexDirection:"row",flexWrap:"wrap"/,"Four shortcuts form 2x2 grid");
assert.match(styles,/spotifyShortcutCountText/,"Every tile has a numeric count");
assert.doesNotMatch(styles,/spotifyShortcutShade:,"Remove poster backgrounds and double-overlay icon");
assert.match(app,/Hoy en SHALOM/);
assert.match(app,/selectRepertoire\(rep\)/,"Tap opens official repertoire or mass");
assert.match(app,/selectMedley\(m\)/,"Tap opens official medley");
assert.match(app,/accessibilityLabel:"Actualizar publicaciones del coro"/,"User can refresh admin content");
assert.match(app,/Cuando publiquen una misa, repertorio o popurrí desde el administrador/,
 "Empty state explains source and avoids invented content");
console.log("SHALOM: minimalistic counters, official publication selection and Home navigation verified.");
