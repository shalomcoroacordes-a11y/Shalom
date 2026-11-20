const fs=require("node:fs"),assert=require("node:assert/strict");
const shell=fs.readFileSync("site-shell.js","utf8");
const app=fs.readFileSync("mobile/App.js","utf8");
const actions=fs.readFileSync("mobile/src/song-actions-ui.js","utf8");
for(const href of ["popurris.html","repertorios.html","solicitar-canto.html","acerca.html","contacto.html","donaciones.html"])
 assert.ok(shell.includes(href),href+" must remain linked");
assert.match(shell,/footer p:last-child/);
assert.match(shell,/href="acerca\.html"/);
assert.match(shell,/href="contacto\.html"/);
for(const name of ["YouTube","Spotify","Instagram","Facebook"])
 assert.ok(app.includes(name),"Artist link "+name+" must remain");
assert.match(app,/songPermalink\(actionSong\)/);
assert.match(app,/openSongVideo\(actionSong\)/);
assert.match(app,/onPress:\(\)=>openWeb\(x.url\)/);
assert.match(actions,/Ver enlaces y tutoriales/);
assert.match(actions,/rawLinks\.filter/);
console.log("SHALOM: all music, artist and public site links preserved.");
