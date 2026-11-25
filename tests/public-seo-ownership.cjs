const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("seo.js","utf8");
const nodes=[],events={};
function element(tag){
 return {tag,attributes:{},setAttribute(k,v){this.attributes[k]=v},get content(){return this.attributes.content},remove(){const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1)}};
}
function find(selector){
 const match=selector.match(/^(meta|link)\[([^=]+)="([^"]+)"\]$/);
 return match?nodes.find(n=>n.tag===match[1]&&n.attributes[match[2]]===match[3])||null:null;
}
const location={href:"https://example.test/shalom/cancion.html?id=a",origin:"https://example.test",pathname:"/shalom/cancion.html"};
const document={title:"Canción | SHALOM",head:{querySelector:find,append:n=>nodes.push(n)},querySelector:find,createElement:element,getElementById:id=>nodes.find(n=>n.id===id)||null,addEventListener:(k,v)=>events[k]=v};
const window={};
vm.runInNewContext(source,{window,document,location,URL,CSS:{escape:x=>x}});
const seo=window.JHDSEO;
const meta=(key,attr="property")=>find('meta['+attr+'="'+key+'"]')?.content;
const item=()=>JSON.parse(document.getElementById("jhdItemSchema").textContent);
seo.setSong({title:"Dios es amor",artist:"Coro Shalom",tone:"D",type:"Católico",categories:["Adoración","Comunión"]});
assert.equal(meta("og:type"),"music.song");
assert.equal(item()["@type"],"MusicRecording");
assert.equal(item().musicalKey,"D");
assert.equal(item().byArtist.name,"Coro Shalom");
assert.match(meta("og:description"),/Adoración, Comunión/);
assert.equal(meta("og:url"),location.href);
events.DOMContentLoaded();
assert.equal(meta("og:type"),"music.song","Static initialization must not overwrite an item");
assert.equal(nodes.filter(n=>n.id==="jhdItemSchema").length,1);
seo.setSong({title:"Canto sin artista"});
assert.equal(item().byArtist,undefined);
seo.setAlbum({title:"Misa",artist:"Coro Shalom",description:"Colección"});
assert.equal(meta("og:type"),"music.album");assert.equal(item()["@type"],"MusicAlbum");assert.equal(item().byArtist.name,"Coro Shalom");
seo.setArtist({name:"Coro Shalom",description:"Biografía"});
assert.equal(meta("og:type"),"profile");assert.equal(item()["@type"],"MusicGroup");assert.equal(meta("og:description"),"Biografía");
assert.equal(nodes.filter(n=>n.id==="jhdItemSchema").length,1);
assert.equal(find('link[rel="canonical"]').attributes.href,location.href);
for(const [page,owner,method] of [["cancion.html","cancion.js","setSong"],["albumes.html","albumes.js","setAlbum"],["artista.html","artist-page.js","setArtist"]]){
 const html=fs.readFileSync(page,"utf8");
 assert.ok(html.indexOf('src="seo.js?v=3"')>=0&&html.indexOf('src="seo.js?v=3"')<html.indexOf('src="'+owner));
 assert.match(fs.readFileSync(owner,"utf8"),new RegExp("window\\.JHDSEO\\?\\."+method+"\\("));
 assert.doesNotMatch(html,/song-seo\.js|album-seo\.js|artist-profile-seo\.js|site-seo-static\.js/);
}
for(const file of ["song-seo.js","album-seo.js","artist-profile-seo.js","site-seo-static.js"])assert.equal(fs.existsSync(file),false);
console.log("SEO: explicit item owners, real tone/category fields, song/album/artist JSON-LD, canonical URL and initialization order verified.");
