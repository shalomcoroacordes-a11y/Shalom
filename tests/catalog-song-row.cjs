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
 assert.equal((html.match(/src="catalog-song-row\.js\?v=[23]"/g)||[]).length,1);
 assert.ok(html.indexOf('src="catalog-song-row.js')<html.indexOf('src="'+owner+'.js'));
 if(name!=="artistas") assert.match(js,/\.map\(window\.ShalomCatalogSongRow\.rowToSong\)/);
 if(["artistas","albumes","canciones"].includes(name))assert.match(js,/window\.ShalomCatalogSongRow\.createPager\(/);
 else assert.match(js,/window\.ShalomCatalogSongRow\.mergePage\(/);
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

async function testPager(){
 const calls=[],events=[],pending=[];
 const pager=window.ShalomCatalogSongRow.createPager({pageSize:2,fetchPage:args=>{calls.push(args);return new Promise((resolve,reject)=>pending.push({resolve,reject}));},onStart:append=>events.push(append?"append":"fresh"),onRender:()=>events.push("render"),onError:error=>events.push(error.message)});
 const first=pager.load();const newer=pager.load();
 assert.equal(calls[0].isCurrent(),false);pending[1].resolve([{id:"new",total_count:3}]);await newer;pending[0].reject(Error("stale"));await first;
 assert.equal(pager.state.rows[0].id,"new");assert.equal(pager.state.total,3);assert.equal(pager.state.loading,false);assert.equal(events.includes("stale"),false);
 const next=pager.load(true);await pager.load(true);assert.equal(calls.length,3);assert.equal(calls[2].offset,2);pending[2].resolve([{id:"next",total_count:3}]);await next;assert.equal(pager.state.rows.length,2);assert.equal(pager.state.page,1);
 const failed=pager.load();pending[3].reject(Error("network"));await failed;assert.equal(pager.state.rows.length,0);assert.equal(pager.state.loading,false);assert.equal(events.at(-1),"network");
 console.log("Shared catalog lifecycle: stale responses, pagination, duplicate load prevention and errors verified.");
}
testPager().catch(error=>{console.error(error);process.exitCode=1});
