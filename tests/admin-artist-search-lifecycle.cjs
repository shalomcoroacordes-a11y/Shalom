const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-main-artist-search.js","utf8");
assert.doesNotMatch(source,/MutationObserver/);
function node(tag){
 const events={};
 return {tag,dataset:{},children:[],value:"",hidden:false,textContent:"",
 addEventListener(name,fn){(events[name]??=[]).push(fn)},
 dispatchEvent(event){for(const fn of events[event.type]||[])fn(event)},
 click(){this.dispatchEvent({type:"click"})},
 append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]},
 querySelector(tag){return this.children.find(n=>n.tag===tag)||null}};
}
const scripts=[],boxes=[];
let select;
function form(){
 const s=node("select");
 s.options=[{value:"",textContent:"Selecciona"},{value:"a",textContent:"Ángeles"},{value:"b",textContent:"Bethel"}];
 s.value="a";Object.defineProperty(s,"selectedIndex",{get(){return s.options.findIndex(x=>x.value===s.value)}});
 s.parentNode={insertBefore(box,target){assert.equal(target,s);boxes.push(box)}};
 return s;
}
const document={readyState:"complete",getElementById:id=>id==="songMainArtist"?select:null,createElement:node,head:{append:n=>scripts.push(n)}};
const window={};
vm.runInNewContext(source,{document,window,Event:class {constructor(type,options){this.type=type;this.bubbles=options.bubbles}}});
assert.equal(scripts.length,0,"Artist search must not load unrelated scripts");
const mount=window.ShalomAdminMainArtistSearch.mount;
select=form();mount();mount();
assert.equal(boxes.length,1,"Same form must not mount twice");
const [input,list]=boxes[0].children;
assert.equal(input.value,"Ángeles");
input.value="angeles";input.dispatchEvent({type:"input"});
assert.equal(list.children.length,1);assert.equal(list.children[0].textContent,"Ángeles");
let changes=0;select.addEventListener("change",event=>{assert.equal(event.bubbles,true);changes++});
input.value="bet";input.dispatchEvent({type:"input"});
let prevented=false;input.dispatchEvent({type:"keydown",key:"Enter",preventDefault(){prevented=true}});
assert.equal(prevented,true);assert.equal(select.value,"b");assert.equal(input.value,"Bethel");assert.equal(list.hidden,true);assert.equal(changes,1);
select.value="a";select.dispatchEvent({type:"change",bubbles:true});assert.equal(input.value,"Ángeles");
input.value="unmatched";input.dispatchEvent({type:"input"});assert.equal(list.children[0].textContent,"No se encontraron artistas.");
select=form();mount();assert.equal(boxes.length,2,"Replacement form remounts");
assert.equal(scripts.length,0,"No dynamic scripts on remount");
console.log("Artist search lifecycle, accent filtering, keyboard, change event and remount verified.");
