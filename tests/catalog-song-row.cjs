const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const window = {};
vm.runInNewContext(fs.readFileSync("catalog-song-row.js", "utf8"), {window});
const normalize = window.ShalomCatalogSongRow.rowToSong;
const cases = [undefined,null,false,true,0,1,""," ","null","{}","true","123","broken","[]","[null,0,false]","[{\"id\":1}]",[],[{id:2}],{}];
function legacy(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
}
for (const artists of cases) for (const categories of cases) for (const albums of cases) {
  const row = Object.freeze({id:"song",title:"Canto",total_count:42,artists,categories,albums});
  const actual = normalize(row);
  assert.equal(JSON.stringify(actual),JSON.stringify({...row,_artists:legacy(artists),_categories:legacy(categories),_albums:legacy(albums)}));
  assert.notEqual(actual,row);
  if(Array.isArray(artists)) assert.equal(actual._artists,artists);
  if(Array.isArray(categories)) assert.equal(actual._categories,categories);
  if(Array.isArray(albums)) assert.equal(actual._albums,albums);
}
for (const name of ["canciones","categorias","albumes"]) {
 const html=fs.readFileSync(name+".html","utf8"), js=fs.readFileSync(name+".js","utf8");
 assert.equal((html.match(/src="catalog-song-row\.js\?v=1"/g)||[]).length,1);
 assert.ok(html.indexOf('src="catalog-song-row.js')<html.indexOf('src="'+name+'.js'));
 assert.match(js,/\.map\(window\.ShalomCatalogSongRow\.rowToSong\)/);
 assert.doesNotMatch(js,/function jsonList\(/);
}
console.log("Catalog row normalization: "+cases.length**3+" legacy-equivalence cases and all three script owners verified.");
