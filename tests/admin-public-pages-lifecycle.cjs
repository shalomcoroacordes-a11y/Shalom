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
const adminContext={window,document,setTimeout:()=>0};
vm.createContext(adminContext);
vm.runInContext(fs.readFileSync("admin-content-editor.js","utf8"),adminContext);
vm.runInContext(source,adminContext);
assert.ok(html.indexOf('src="admin-content-editor.js')<moduleIndex);
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

// Verify save and reset protection against detached forms using the shared controller.
async function sharedSaveLifecycle(){
 const writes=[],notes=[],forms=[];
 let section,active=true;
 const node=()=>{const listeners={};return {style:{},textContent:"",addEventListener(event,fn){(listeners[event]??=[]).push(fn)},async fire(event,arg){for(const fn of listeners[event]||[])await fn(arg)}}};
 const document={querySelector:id=>({"#section":section,"#tab":{classList:{contains:()=>active}},"#form":section?.form,"#status":section?.status,"#reset":section?.reset}[id])};
 const view={set innerHTML(value){section={set innerHTML(v){this.markup=v;this.form=node();this.status=node();this.reset=node();forms.push(this.form)}}},querySelector:()=>section};
 const db={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{content:{title:"Stored"}}}},upsert(body,opts){writes.push({body,opts});return Promise.resolve({error:null})}}}};
 const window={};const ctx={window,document,setTimeout:()=>0,FormData:class{entries(){return [["title","  Edited  "]]}}};
 vm.runInNewContext(fs.readFileSync("admin-content-editor.js","utf8"),ctx);
 const editor=window.ShalomAdminContentEditor.create({db,defaults:{title:"Default"},key:"about",sectionId:"section",tabId:"tab",formId:"form",statusId:"status",resetId:"reset",render:current=>current.title,messages:{saved:"Saved",loadTimeout:"timeout",saveTimeout:"timeout"}});
 await editor.mount(view);assert.equal(section.markup,"Stored");
 await section.form.fire("submit",{preventDefault(){}});assert.equal(writes.length,1);assert.equal(writes[0].body.content.title,"Edited");assert.equal(writes[0].opts.onConflict,"content_key");assert.equal(section.status.textContent,"Saved");
 await forms[0].fire("submit",{preventDefault(){}});assert.equal(writes.length,1);
 active=false;await section.form.fire("submit",{preventDefault(){}});assert.equal(writes.length,1);
 console.log("Shared content editor: correct save payload, status, detached-form and navigation protection verified.");
}
sharedSaveLifecycle().catch(error=>{console.error(error);process.exitCode=1});
