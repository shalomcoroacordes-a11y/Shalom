const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("cancion.js","utf8"),html=fs.readFileSync("cancion.html","utf8");
assert.doesNotMatch(html,/song-(?:overview|feedback-link)\.js/);
for(const name of ["song-overview.js","song-feedback-link.js"])assert.equal(fs.existsSync(name),false);
const a=source.indexOf("function renderReaderOverview("),b=source.indexOf("function renderSongFeedback(",a),c=source.indexOf("function renderLinks("),d=source.indexOf("async function renderRelatedSongs(",c);
assert.ok(a>=0&&b>a&&c>=0&&d>c);
const nodes=new Map(),insertions=[];
function element(tag){
 return {tag,children:[],textContent:"",innerHTML:"",append(...items){this.children.push(...items)},before(node){nodes.set(node.id,node);insertions.push([this.id,node.id])},remove(){nodes.delete(this.id)},querySelector(selector){if(selector===".hero-kicker")return this.children[0]?.children[0];if(selector===".song-reader-overview-copy > p:last-child")return this.children[0]?.children[2];return null}};
}
for(const id of ["songReaderToolbar","songLyrics","songLinks"]){const node=element("div");node.id=id;nodes.set(id,node)}
const document={createElement:element,getElementById:id=>nodes.get(id)||null};
const context={document,$:q=>nodes.get(q.slice(1))||null,escapeHTML:v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;")};
vm.createContext(context);vm.runInContext(source.slice(a,b)+source.slice(c,d),context);
context.renderReaderOverview("Católico","Dios es amor","Por Coro Shalom");
const overview=nodes.get("songReaderOverview"),heading=nodes.get("songLyricsHeading");
assert.equal(overview.className,"song-reader-overview");
assert.equal(overview.children[0].children[0].textContent,"Católico");
assert.equal(overview.children[0].children[2].textContent,"Por Coro Shalom");
assert.match(overview.children[1].innerHTML,/#songLyrics/);assert.match(overview.children[1].innerHTML,/#relatedSongsSection/);
assert.match(heading.innerHTML,/Letra y acordes/);
context.renderReaderOverview("Cristiano","Otro canto","");
assert.equal(nodes.get("songReaderOverview"),overview);
assert.equal(overview.children[0].children[2].textContent,"Consulta Otro canto y prepara tu interpretación.");
assert.deepEqual(insertions,[["songReaderToolbar","songReaderOverview"],["songLyrics","songLyricsHeading"]]);
context.renderLinks({links:[]});assert.equal(nodes.has("songResourcesHeading"),false);assert.equal(nodes.get("songLinks").hidden,true);
context.renderLinks({links:[{title:"Video",url:"https://example.test"}]});
assert.equal(nodes.get("songResourcesHeading").textContent,"Recursos");
assert.equal(nodes.get("songLinks").hidden,false);assert.match(nodes.get("songLinks").innerHTML,/Video/);
context.renderLinks({links:[{title:"Otro video"}]});assert.equal(insertions.filter(x=>x[1]==="songResourcesHeading").length,1);
context.renderLinks({links:[]});assert.equal(nodes.has("songResourcesHeading"),false);
assert.match(source,/renderControls\(relations\);\s*renderReaderOverview\(type, title,/);
console.log("Reader overview: direct render, original headings, placement, remount and resource visibility verified.");
