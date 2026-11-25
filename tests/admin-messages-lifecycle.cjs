const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-messages.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver/);
const owner=html.search(/src="admin-pro\.js\?v=\d+"/),moduleIndex=html.search(/src="admin-messages\.js\?v=\d+"/);
assert.ok(moduleIndex>=0&&owner>moduleIndex);
let current=null,active=true;
const pending=[];
const view={set innerHTML(value){this.content=value;current={innerHTML:""}},get innerHTML(){return this.content},querySelector:()=>current};
const tab={classList:{contains:()=>active}};
const document={querySelector:q=>q==="#adminMessagesContent"?current:q==="#adminMessagesTab"?tab:q==="#adminView"?view:null,querySelectorAll:()=>[]};
const db={from(table){assert.equal(table,"contact_messages");return {select(){return this},order(){return this},limit(){return new Promise((resolve,reject)=>pending.push({resolve,reject}))}}}};
const window={supabaseClient:db};
vm.runInNewContext(source,{window,document});
const mount=window.ShalomAdminMessages.mount;
async function test(){
 const first=mount(view),old=current;
 assert.match(view.innerHTML,/Cargando mensajes/);
 const second=mount(view),target=current;
 pending[1].resolve({data:[{id:"a",song_title:"Canto de prueba",status:"pendiente"}]});await second;
 assert.match(target.innerHTML,/Canto de prueba/);assert.match(target.innerHTML,/1 pendientes/);
 pending[0].resolve({data:[{id:"b",song_title:"Respuesta antigua"}]});await first;
 assert.equal(old.innerHTML,"");assert.doesNotMatch(target.innerHTML,/Respuesta antigua/);
 const late=mount(view),leaving=current;active=false;pending[2].resolve({data:[]});await late;
 assert.equal(leaving.innerHTML,"");
 active=true;const fail=mount(view),failure=current;pending[3].reject(Error("Sin conexión"));await fail;
 assert.match(failure.innerHTML,/Sin conexión/);
 console.log("Messages: direct mount, active section, overlapping loads and errors verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
