"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("web-menu.js","utf8");
const pages=[["canciones.js","canciones.html"],["cancion.js","cancion.html"],["artistas.js","artistas.html"],["albumes.js","albumes.html"],["donaciones.js","donaciones.html"],["public-core.js","index.html"],["public-core.js","categorias.html"],["artist-page.js","artista.html"]];
for(const [js,html] of pages){
 const page=fs.readFileSync(html,"utf8"),owner=fs.readFileSync(js,"utf8");
 assert.equal((page.match(/src="web-menu\.js\?v=1"/g)||[]).length,1);
 assert.ok(page.indexOf('src="web-menu.js')<page.indexOf('src="'+js));
 assert.match(owner,/window\.ShalomWebMenu\.mount\(\)/);
 assert.doesNotMatch(owner,/classList\.toggle\("open"\)/);
}
function element(){
 const attrs={},listeners=new Map(),classes=new Set();
 return {attrs,listeners,classes,setAttribute(k,v){attrs[k]=v},addEventListener(k,fn){listeners.set(k,[...(listeners.get(k)||[]),fn])},click(){for(const fn of listeners.get("click")||[])fn()},classList:{toggle(k){if(classes.has(k)){classes.delete(k);return false}classes.add(k);return true},remove:k=>classes.delete(k)}};
}
function fixture(button,menu,links){
 const window={},document={querySelector:q=>q==="#menuToggle"?button:q==="#navMenu"?menu:null,querySelectorAll:()=>links};
 vm.runInNewContext(source,{window,document});
 return window.ShalomWebMenu;
}
const button=element(),menu=element(),link=element(),links=[link],nav=fixture(button,menu,links);
nav.mount();nav.mount();
assert.equal(button.attrs["aria-expanded"],"false");assert.equal(button.listeners.get("click").length,1);
button.click();assert.equal(menu.classes.has("open"),true);assert.equal(button.attrs["aria-expanded"],"true");
nav.mount();assert.equal(button.attrs["aria-expanded"],"true");
button.click();assert.equal(menu.classes.has("open"),false);assert.equal(button.attrs["aria-expanded"],"false");
button.click();link.click();assert.equal(menu.classes.has("open"),false);assert.equal(button.attrs["aria-expanded"],"false");
assert.equal(link.listeners.get("click").length,1);
const added=element();links.push(added);nav.mount();button.click();added.click();assert.equal(menu.classes.has("open"),false);
fixture(null,null,[]).mount();
const lone=element();fixture(lone,null,[]).mount();lone.click();assert.equal(lone.attrs["aria-expanded"],"false");
const onlyMenu=element(),onlyLink=element();fixture(null,onlyMenu,[onlyLink]).mount();onlyMenu.classes.add("open");onlyLink.click();assert.equal(onlyMenu.classes.has("open"),false);
console.log("Shared web menu: eight page references, ARIA state, opening/closing, duplicate listeners and missing elements verified.");
