const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-public-pages.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver/);
const owner=html.search(/src="admin-pro\.js\?v=\d+"/),moduleIndex=html.search(/src="admin-public-pages\.js\?v=\d+"/);
assert.ok(moduleIndex>=0&&owner>moduleIndex);
let current=null,active=true;
const pending=[];
function node(){const events={};return {textContent:"",style:{},addEventListener(name,fn){(events[name]??=[]).push(fn)},emit(name,event={}){for(const fn of events[name]||[])fn(event)}}}
function section(){return {set innerHTML(v){this.content=v;this.form=node();this.status=node();this.restore=node()},get innerHTML(){return this.content}}}
const view={set innerHTML(v){current=section()},querySelector:()=>current};
const tab={classList:{contains:()=>active}};
const document={querySelector:q=>q==="#adminPublicPagesContent"?current:q==="#adminPublicPagesTab"?tab:q==="#publicPageForm"?current?.form:q==="#publicPageStatus"?current?.status:q==="#restoreAboutDefaults"?current?.restore:null};
const db={from(table){assert.equal(table,"site_content");return {select(){return this},eq(key,value){assert.equal(key,"content_key");assert.equal(value,"about");return this},maybeSingle(){return new Promise((resolve,reject)=>pending.push({resolve,reject}))}}}};
const window={supabaseClient:db};
const defaultsSource=fs.readFileSync("about-defaults.js","utf8");
vm.runInNewContext(defaultsSource,{window});
const defaults=window.ShalomAboutDefaults;
assert.equal(Object.keys(defaults).length,16);
assert.ok(Object.isFrozen(defaults));
for(const [page,script] of [["admin.html","admin-public-pages.js"],["acerca.html","about-content.js"]]){
 const markup=fs.readFileSync(page,"utf8");
 assert.equal((markup.match(/src="about-defaults\.js\?v=1"/g)||[]).length,1);
 assert.ok(markup.indexOf('src="about-defaults.js')<markup.indexOf('src="'+script));
 assert.doesNotMatch(fs.readFileSync(script,"utf8"),/eyebrow:\s*"Conoce el proyecto"/);
}
const publicNodes=Object.keys(defaults).map(key=>({dataset:{about:key},textContent:"HTML inicial"}));
const publicWindow={};
let publicLoad;
const publicDocument={readyState:"loading",querySelectorAll:()=>publicNodes,addEventListener(name,fn){assert.equal(name,"DOMContentLoaded");publicLoad=fn}};
vm.runInNewContext(defaultsSource,{window:publicWindow});
vm.runInNewContext(fs.readFileSync("about-content.js","utf8"),{window:publicWindow,document:publicDocument});
vm.runInNewContext(source,{window,document,setTimeout:()=>0});
const mount=window.ShalomAdminPublicPages.mount;
async function test(){
 await publicLoad();
 for(const element of publicNodes)assert.equal(element.textContent,defaults[element.dataset.about]);
 publicWindow.supabaseClient={from(table){assert.equal(table,"site_content");return {select(){return this},eq(key,value){assert.equal(key,"content_key");assert.equal(value,"about");return this},async maybeSingle(){return {data:{content:{title:"Título público guardado",intro:""}}}}}}};
 await publicLoad();
 assert.equal(publicNodes.find(n=>n.dataset.about==="title").textContent,"Título público guardado");
 assert.equal(publicNodes.find(n=>n.dataset.about==="intro").textContent,defaults.intro);
 assert.equal(defaults.title,"Un cancionero para");
 const first=mount(view),target=current;
 assert.match(target.innerHTML,/Un cancionero para/);
 pending[0].resolve({data:{content:{title:"Título guardado"}}});await first;
 assert.match(target.innerHTML,/Título guardado/);assert.equal(target.status.textContent,"Contenido guardado cargado.");
 const dirty=mount(view),edited=current;edited.form.emit("input");
 pending[1].resolve({data:{content:{title:"Respuesta no solicitada"}}});await dirty;
 assert.doesNotMatch(edited.innerHTML,/Respuesta no solicitada/);
 const restored=mount(view),reset=current;reset.restore.emit("click");
 pending[2].resolve({data:{content:{title:"Contenido anterior"}}});await restored;
 assert.doesNotMatch(reset.innerHTML,/Contenido anterior/);
 assert.match(reset.status.textContent,/Texto inicial restaurado/);
 const late=mount(view),leaving=current;active=false;
 pending[3].resolve({data:{content:{title:"Carga antigua"}}});await late;
 assert.doesNotMatch(leaving.innerHTML,/Carga antigua/);
 active=true;const failed=mount(view),failure=current;
 pending[4].reject(Error("Sin conexión"));await failed;
 assert.equal(failure.status.textContent,"Sin conexión");
 console.log("Public page lifecycle: saved content, user edits, reset, navigation and errors verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
