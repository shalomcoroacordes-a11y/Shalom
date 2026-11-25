const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-request-page.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver/);
const owner=html.search(/src="admin-pro\.js\?v=\d+"/),moduleIndex=html.search(/src="admin-request-page\.js\?v=\d+"/);
assert.ok(moduleIndex>=0&&owner>moduleIndex);
let current=null,active=true;
const pending=[];
function node(){const events={};return {textContent:"",style:{},addEventListener(name,fn){(events[name]??=[]).push(fn)},emit(name,event={}){for(const fn of events[name]||[])fn(event)}}}
function section(){return {set innerHTML(v){this.content=v;this.form=node();this.status=node();this.restore=node()},get innerHTML(){return this.content}}}
const view={set innerHTML(v){current=section()},querySelector:()=>current};
const tab={classList:{contains:()=>active}};
const document={querySelector:q=>q==="#adminRequestPageContent"?current:q==="#adminRequestPageTab"?tab:q==="#requestPageForm"?current?.form:q==="#requestPageStatus"?current?.status:q==="#restoreRequestDefaults"?current?.restore:null};
const db={from(table){assert.equal(table,"site_content");return {select(){return this},eq(key,value){assert.equal(key,"content_key");assert.equal(value,"request_song");return this},maybeSingle(){return new Promise((resolve,reject)=>pending.push({resolve,reject}))}}}};
const window={supabaseClient:db};
vm.runInNewContext(source,{window,document,setTimeout:()=>0});
const mount=window.ShalomAdminRequestPage.mount;
async function test(){
 const first=mount(view),target=current;
 assert.match(target.innerHTML,/Solicita un canto/);
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
 console.log("Request page lifecycle: saved content, user edits, reset, navigation and errors verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
