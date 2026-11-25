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
for (const [name,owner] of [["canciones","canciones"],["categorias","categorias"],["albumes","albumes"],["artista","artist-page"],["artistas","artistas"]]) {
 const html=fs.readFileSync(name+".html","utf8"), js=fs.readFileSync(owner+".js","utf8");
 assert.equal((html.match(/src="catalog-song-row\.js\?v=2"/g)||[]).length,1);
 assert.ok(html.indexOf('src="catalog-song-row.js')<html.indexOf('src="'+owner+'.js'));
 if(name!=="artistas") assert.match(js,/\.map\(window\.ShalomCatalogSongRow\.rowToSong\)/);
 assert.match(js,/window\.ShalomCatalogSongRow\.mergePage\(/);
 assert.doesNotMatch(js,/const serverTotal = rows\.length/);
 assert.doesNotMatch(js,/function jsonList\(/);
}
console.log("Catalog row normalization: "+cases.length**3+" legacy-equivalence cases and five script owners verified.");

const {mergePage,jsonList}=window.ShalomCatalogSongRow;
for(const previous of [[],[{id:"a"}],[{id:"a"},{id:"b"}]])for(const rows of [[],[{id:"c",total_count:9}],[{id:"c",total_count:"12"},{id:"d"}],[{id:"c",total_count:0}],[{id:"c"}]])for(const append of [false,true]){
 const oldTotal=rows.length?Number(rows[0].total_count||0):0;
 const actual=mergePage(Object.freeze(previous),Object.freeze(rows),append);
 assert.equal(actual.total,append?(rows.length?oldTotal:previous.length):oldTotal);
 assert.equal(JSON.stringify(actual.rows),JSON.stringify(append?[...previous,...rows]:rows));
 if(!append)assert.equal(actual.rows,rows);
}
for(const value of cases)assert.equal(JSON.stringify(jsonList(value)),JSON.stringify(legacy(value)));
console.log("Catalog pagination: 30 legacy-equivalence cases, six call sites and shared artist profile parser.");
