"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const nodes=new Map(),inserted=[],calls=[];
function element(tag){
 const listeners=new Set();
 return {tag,children:[],listeners,append(n){this.children.push(n)},addEventListener(event,fn){assert.equal(event,"click");listeners.add(fn)},removeEventListener(event,fn){listeners.delete(fn)},click(){for(const fn of listeners)fn()}};
}
const grid={after(wrap){inserted.push(wrap);nodes.set(wrap.children[0].id,wrap.children[0]);}};
const window={},document={getElementById:id=>nodes.get(id)||null,createElement:element};
vm.runInNewContext(fs.readFileSync("catalog-list-view.js","utf8"),{window,document});
const view=window.ShalomCatalogListView;
assert.equal(view.countLabel(1),"1 canto");assert.equal(view.countLabel(0),"0 cantos");
const sample={kind:"artist",href:"artista.html?slug=a%20b",ariaLabel:'Ver perfil de A&B',iconClass:"catalog-avatar",icon:"AB",kicker:"Católico",title:"A&B",description:'<script>"x"</script>',count:1,action:"Ver perfil →"};
const html=view.card(sample);
assert.equal(html,'<a class="artist-card catalog-artist-card" href="artista.html?slug=a%20b" aria-label="Ver perfil de A&amp;B"><div class="catalog-card-heading"><span class="catalog-avatar" aria-hidden="true">AB</span><div><p class="catalog-card-kicker">Católico</p><h3>A&amp;B</h3></div><span class="catalog-card-arrow" aria-hidden="true">→</span></div><p class="catalog-card-description">&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p><div class="catalog-card-footer"><span class="catalog-card-count"><span aria-hidden="true">♫</span> 1 canto</span><strong>Ver perfil →</strong></div></a>');
const album=view.card({...sample,kind:"album",iconClass:"catalog-album-disc",icon:"◉",action:"Ver álbum →",count:2});
assert.match(album,/catalog-album-card/);assert.match(album,/catalog-album-disc/);assert.match(album,/2 cantos/);assert.match(album,/Ver álbum →/);
const more=view.createLoadMore({grid,id:"artistsLoadMore",label:"Cargar más artistas",onLoad:()=>calls.push("append")});
const button=more.ensure();assert.equal(more.ensure(),button);assert.equal(inserted.length,1);assert.equal(button.listeners.size,1);
assert.equal(button.type,"button");assert.equal(button.className,"song-btn secondary");assert.equal(button.hidden,true);
more.update({rows:[1],total:2,loading:false});assert.equal(button.hidden,false);assert.equal(button.disabled,false);button.click();assert.deepEqual(calls,["append"]);
more.update({rows:[1],total:2,loading:true});assert.equal(button.disabled,true);assert.equal(button.textContent,"Cargando…");
more.update({rows:[1,2],total:2,loading:false});assert.equal(button.hidden,true);
more.reset();assert.equal(button.hidden,true);assert.equal(button.disabled,true);assert.equal(button.textContent,"Cargar más artistas");
more.update({rows:[],total:2,loading:false});more.hide();assert.equal(button.hidden,true);
const absent=view.createLoadMore({grid:null,id:"none",label:"More",onLoad:()=>{}});assert.equal(absent.ensure(),null);absent.reset();absent.hide();absent.update({rows:[],total:0,loading:false});
for(const name of ["albumes","artistas"]){
 const page=fs.readFileSync(name+".html","utf8"),owner=fs.readFileSync(name+".js","utf8");
 assert.equal((page.match(/src="catalog-list-view\.js\?v=1" defer/g)||[]).length,1);
 assert.ok(page.indexOf('src="catalog-list-view.js')<page.indexOf('src="'+name+'.js'));
 assert.match(owner,/window\.ShalomCatalogListView/);assert.match(owner,/return catalogCard\(/);assert.match(owner,/loadMore\.update\(catalog\.state\)/);
 assert.doesNotMatch(owner,/catalog-card-heading|function ensure(?:List)?LoadMore/);
}
console.log("Artist and album list presentation: preserved card markup, escaping, pagination button lifecycle and shared script ownership.");
