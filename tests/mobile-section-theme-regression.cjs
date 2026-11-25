const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const components=fs.readFileSync("mobile/src/app-components.js","utf8");
const section=(start,end)=>{
 const i=app.indexOf(" function "+start+"(){");
 const j=app.indexOf(" function "+end+"(",i+1);
 assert.ok(i>=0&&j>i,"Missing section: "+start);
 return app.slice(i,j);
};
assert.match(components,/function SectionHero\(/,"Shared section hero");
assert.match(components,/function SectionFilterBar\(/,"Shared section filter chips");
assert.match(components,/function SectionListCard\(/,"Shared repertoire-style cards");
assert.match(components,/function SectionEmpty\(/,"Shared empty state with original SHALOM logo");
assert.match(components,/h\(Pressable,\{style:S\.repCard/,"Shared cards must use repertoire visual proportions");
const songs=section("renderSongs","renderArtists");
const artists=section("renderArtists","renderCategories");
const categories=section("renderCategories","renderMore");
const exploration=fs.readFileSync("mobile/src/exploration-screens-ui.js","utf8");
const more=exploration.slice(exploration.indexOf("function MoreScreen("),exploration.indexOf("function ExploreScreen("));
const explore=exploration.slice(exploration.indexOf("function ExploreScreen("),exploration.indexOf("function AlbumsScreen("));
for(const name of ["MoreScreen","ExploreScreen","AlbumsScreen"])assert.ok(app.includes("h("+name+",{"),"App renders "+name);
const medleys=section("renderMedleys","renderMedleyDetail");
const albums=exploration.slice(exploration.indexOf("function AlbumsScreen("));
for(const [name,part] of Object.entries({categories,more,explore,medleys,albums})){
 assert.match(part,/h\(SectionHero,/,"Hero missing on "+name);
 assert.match(part,/h\(SectionListCard,/,"Library cards missing on "+name);
 assert.match(part,/style:S\.repPage/,"Repertoire spacing missing on "+name);
}
assert.match(songs,/label\(songLibraryOpen\?"Biblioteca de cantos":"Cantos",S.cantosPageTitle\)/,"Cantos has a clear minimal heading");
assert.match(songs,/style:S.cantosLibraryCard/,"Cantos opens with a tappable library card");
assert.match(artists,/h\(LibraryHero,/,"Artists use the same banner component");
assert.match(songs,/placeholder:"Buscar letras, acordes y títulos"/,"Cantos has an always visible native search");
assert.match(artists,/h\(LibrarySearch,/,"Search is always visible in Artists");
assert.match(songs,/style:S.cantosFilterRow/,"Cantos has screenshot-matched compact filters");
assert.match(songs,/setOnlyLiked\(value==="liked"\)/,"Favorites filter works");
assert.match(artists,/h\(LibraryChipRow,/,"Artist filters share the song chip style");
assert.doesNotMatch(songs,/h\(FavoriteSongCard,/,"Do not crowd the new Cantos home with a favorites gallery");
assert.match(songs,/\["liked","Mis me gusta"\]/,"Favorites remain accessible via the filter");
assert.match(songs,/h\(LibrarySongRow,/,"Song cards show colored initials and quick actions");
assert.match(artists,/h\(LibraryArtistCard,/,"Artists are in a polished two-column gallery");
assert.match(songs,/setOnlyLiked/,"Keep device-only likes filtering");
assert.match(songs,/eligible\.slice\(0,countLimit\)/,"Keep song pagination");
assert.match(songs,/selectSong\(song\)/,"Songs must still open");
assert.match(artists,/model\.songsForArtist\(a\.id\)\.length/,"Artist song counts come from catalog");
assert.match(artists,/style:S\.artistGrid/,"Artists are shown in a responsive two-column gallery");
assert.match(require("node:fs").readFileSync("mobile/src/library-ui.js","utf8"),/h\(InitialCover,/,"Artists have offline initials as image fallback");
assert.match(artists,/type\(a\.artist_type\)/,"Artist type filtering");
assert.match(categories,/model\.children\(/,"Keep folder hierarchy navigation");
assert.match(categories,/model\.songsForCategory\(current\.id\)/,"Keep category songs");
assert.match(categories,/setFolderId\(c\.id\)/,"Folders must still open");
assert.match(medleys,/model\.medleys\.filter/,"Keep published medleys list");
assert.match(medleys,/selectMedley\(m\)/,"Medleys must still open");
assert.match(albums,/openDetail\(\{type:"album",id:a\.id\}\)/,"Albums must still open");
assert.match(app,/\["Inicio","Canciones","Repertorios","Mis colecciones","Perfil"\]\.includes\(tab\)/,
 "All five main sections have the same SHALOM brand header");
assert.match(app,/\["Artistas","Categorías","Popurrís","Álbumes","Explorar","Más","Respaldo"\]\.includes\(tab\)/,
 "Secondary sections retain their back navigation");
assert.match(app,/PersonalCollectionsScreen/,"Local personal collections remain available as a native screen");
assert.match(app,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.repTopLogo/,"Official SHALOM dove remains");
assert.match(app,/setSectionSearchOpen\(v=>!v\)/,"Search icon must toggle section search");
assert.ok(!/supabaseClient|DELETE FROM|INSERT INTO|commitCatalog\(/.test(songs+artists+categories+more+medleys+albums),
 "Browsing and styling must not write or delete Supabase data");
console.log("SHALOM uniform repertoire-style library screens verified.");
