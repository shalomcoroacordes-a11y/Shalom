const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const readers=fs.readFileSync("mobile/src/music-readers-ui.js","utf8");
const catalogScreens=fs.readFileSync("mobile/src/catalog-screens-ui.js","utf8");
const database=fs.readFileSync("mobile/src/database.js","utf8");
const favorites=fs.readFileSync("mobile/src/favorites.js","utf8");

const reader=readers.slice(readers.indexOf("function SongReader("));
assert.match(app,/h\(SongReader,\{/);
assert.ok(reader.includes("const parsed=parseSong(song.lyrics"),"The native reader must render the downloaded lyrics");
const grid=fs.readFileSync("mobile/src/aligned-score-ui.js","utf8");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/row\.kind==="section"/,"Shared web score renders verse and chorus labels");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/row\.chordLine\|\|/,"Original chord lines are preserved");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/row\.lyricLine\|\|/,"Original lyric lines are preserved");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/Courier New/, "The same browser font is used as public web/admin");
assert.ok(reader.includes("toggleLike(song.id)"),"The song reader must allow local likes");
assert.ok(!/Editar|Reportar letra|Corregir acordes|requestForm\(/.test(reader),"No editor or correction requests inside the reader");
assert.match(app,/write:setMetadata/,"Likes must be written to local metadata");
assert.match(fs.readFileSync("mobile/src/personal-edit-controller.js","utf8"),/key:FAVORITES_KEY/);
assert.match(app,/getMetadataBatch\(\{[^\n]*\[FAVORITES_KEY\]:"\[\]"/,"Likes must be restored locally on startup");
assert.match(app,/likedRaw=prefs\[FAVORITES_KEY\]/);
assert.match(catalogScreens,/setOnlyLiked\(value==="liked"\)/,"Users need to filter their liked songs");
assert.match(catalogScreens,/\["liked","Mis me gusta"\]/,"The favorites chip must remain visible in Cantos");
assert.match(app,/!immersiveActive&&!settingsOpen&&!isReader\?h\(View/,"Native bottom navigation is hidden for all readers");
const songActions=fs.readFileSync("mobile/src/song-actions-ui.js","utf8");
assert.match(app,/onPress:\(\)=>active\?setActionSongId\(String\(active\.id\)\)/,
 "The reader menu opens actions for the active song");
assert.match(app,/onShare:\(\)=>shareSong\(actionSong\)/,
 "The actions panel preserves sharing without editing");
assert.match(app,/onPrint:\(\)=>printSong\(actionSong\)/,
 "The actions panel preserves native printing");
assert.match(songActions,/Compartir canción/,"Sharing remains visible in the actions panel");
assert.match(songActions,/Imprimir letra y acordes/,"Printing remains visible in the actions panel");
assert.match(songActions,/Ver enlaces y tutoriales/,"All song references accessible");
assert.match(songActions,/Ver canto en la página SHALOM/,"Original permalink remains accessible");
assert.match(songActions,/youtubeAvailable\?button/,"YouTube shortcut visible when available");
assert.match(app,/onOpenLink:url=>openWeb\(url\)/,"External links open with validation");
assert.match(app,/onOpenSongPage:\(\)=>openWeb\(songPermalink\(actionSong\)\)/,
 "Song page permalink remains visible");
assert.match(app,/onVideo:\(\)=>openSongVideo\(actionSong\)/,
 "YouTube is connected to the actions sheet");
assert.doesNotMatch(app,/style:S.songActionBar/,
 "Do not duplicate tone and font controls in a second reader footer");
assert.ok(!favorites.includes("supabase"),"Personal likes module must have no Supabase calls");
assert.match(database,/DELETE FROM catalog_records/,"Catalog syncing must only replace catalog records");
assert.doesNotMatch(database,/DELETE FROM metadata/,"Catalog syncing must not erase local favorites");
assert.match(reader,/renderAlignedScoreRows\(parsed,readerFont/,"Font size is applied to every aligned column");
assert.doesNotMatch(grid,/anchoredTokens\(|token\.column\*cell/,"Do not approximate character positions in native Text");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/escapeHTML\(row\.chordLine\|\|" "\)/,"One complete chord line with no word fragmentation");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/escapeHTML\(row\.lyricLine\|\|" "\)/,"One complete continuous lyric line");
assert.match(grid,/scoreHtml\(rows,safeFont,scoreAssets\)/,"Both rows share the same CSS font size");
assert.match(fs.readFileSync("mobile/src/web-score-html.js","utf8"),/overflow-x:auto/,"Long lines scroll without wrapping");
console.log("SHALOM Android reader: local-only likes, accessible controls and no editing verified.");
