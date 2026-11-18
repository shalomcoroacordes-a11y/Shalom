const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const section=(start,end)=>{
 const i=app.indexOf(" function "+start+"(){");
 const j=app.indexOf(" function "+end+"(){",i+1);
 assert.ok(i>=0&&j>i,"Missing section: "+start);
 return app.slice(i,j);
};
assert.match(app,/function SectionHero\(/,"Shared section hero");
assert.match(app,/function SectionFilterBar\(/,"Shared section filter chips");
assert.match(app,/function SectionListCard\(/,"Shared repertoire-style cards");
assert.match(app,/function SectionEmpty\(/,"Shared empty state with original SHALOM logo");
assert.match(app,/h\(View,\{style:S\.repCard\}/,"Shared cards must use repertoire visual proportions");
const songs=section("renderSongs","renderArtists");
const artists=section("renderArtists","renderCategories");
const categories=section("renderCategories","renderMore");
const more=section("renderMore","renderRepertoires");
const medleys=section("renderMedleys","renderMedleyDetail");
const albums=section("renderAlbums","renderArtistDetail");
for(const [name,part] of Object.entries({songs,artists,categories,more,medleys,albums})){
 assert.match(part,/h\(SectionHero,/,"Hero missing on "+name);
 assert.match(part,/h\(SectionListCard,/,"Library cards missing on "+name);
 assert.match(part,/style:S\.repPage/,"Repertoire spacing missing on "+name);
}
assert.match(songs,/h\(SectionFilterBar,/,"Song type and local likes filtering");
assert.match(songs,/setOnlyLiked/,"Keep device-only likes filtering");
assert.match(songs,/eligible\.slice\(0,countLimit\)/,"Keep song pagination");
assert.match(songs,/selectSong\(song\)/,"Songs must still open");
assert.match(artists,/model\.songsForArtist\(a\.id\)\.length/,"Artist song counts come from catalog");
assert.match(artists,/type\(a\.artist_type\)/,"Artist type filtering");
assert.match(categories,/model\.children\(/,"Keep folder hierarchy navigation");
assert.match(categories,/model\.songsForCategory\(current\.id\)/,"Keep category songs");
assert.match(categories,/setFolderId\(c\.id\)/,"Folders must still open");
assert.match(medleys,/model\.medleys\.filter/,"Keep published medleys list");
assert.match(medleys,/selectMedley\(m\)/,"Medleys must still open");
assert.match(albums,/openDetail\(\{type:"album",id:a\.id\}\)/,"Albums must still open");
assert.match(app,/\["Repertorios","Canciones","Artistas","Categorías","Popurrís","Álbumes","Más"\]\.includes\(tab\)/,
 "All library sections must share the same top header");
assert.match(app,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.repTopLogo/,"Official SHALOM dove remains");
assert.match(app,/setSectionSearchOpen\(v=>!v\)/,"Search icon must toggle section search");
assert.ok(!/supabaseClient|DELETE FROM|INSERT INTO|commitCatalog\(/.test(songs+artists+categories+more+medleys+albums),
 "Browsing and styling must not write or delete Supabase data");
console.log("SHALOM uniform repertoire-style library screens verified.");
