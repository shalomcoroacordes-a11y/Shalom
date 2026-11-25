const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-catalog-check.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver|function setTabActive/);
const owner=html.search(/src="admin-pro\.js\?v=\d+"/),moduleIndex=html.search(/src="admin-catalog-check\.js\?v=\d+"/);
assert.ok(moduleIndex>=0&&owner>moduleIndex);
let current=null,active=true,songClicks=0,messageClicks=0;
const pending=[];
const controls=new Map();
function control(){const events={};return {addEventListener(name,fn){events[name]=fn},click(){return events.click?.()}}}
const view={set innerHTML(v){this.content=v;current={innerHTML:""}},get innerHTML(){return this.content},querySelector:()=>current};
const tab={classList:{contains:()=>active}};
const document={getElementById(id){if(id==="adminView")return view;if(id==="adminMaintenanceContent")return current;if(id==="adminMessagesTab")return {click(){messageClicks++}};if(!controls.has(id))controls.set(id,control());return controls.get(id)},querySelector(q){if(q==="[data-jhd-audit-tab]")return tab;if(q==='[data-admin-tab="songs"]')return {click(){songClicks++}};return null}};
const db={from(table){return {select(){if(table==="songs")return new Promise((resolve,reject)=>pending.push({resolve,reject}));if(table==="contact_messages")return {eq(key,value){assert.equal(key,"status");assert.equal(value,"pendiente");return Promise.resolve({data:[]})}};return Promise.resolve({data:[]})}}}};
const window={supabaseClient:db};
vm.runInNewContext(source,{window,document});
const mount=window.ShalomAdminMaintenance.mount;
async function test(){
 const first=mount(view),target=current;
 assert.match(view.innerHTML,/Revisando el catálogo/);
 pending[0].resolve({data:[{id:"s",title:"Canto de prueba",lyrics:"",tone:""}]});await first;
 assert.match(target.innerHTML,/Canciones sin letra/);assert.match(target.innerHTML,/Canto de prueba/);
 controls.get("maintenanceSongs").click();controls.get("maintenanceMessages").click();
 assert.equal(songClicks,1);assert.equal(messageClicks,1);
 const repeat=controls.get("jhdRunCatalogAudit").click(),old=current;
 const newer=mount(view),latest=current;
 pending[2].resolve({data:[]});await newer;
 assert.match(latest.innerHTML,/Todo se ve bien/);
 pending[1].resolve({data:[{id:"old",title:"Respuesta antigua"}]});await repeat;
 assert.equal(old.innerHTML,"");assert.doesNotMatch(latest.innerHTML,/Respuesta antigua/);
 const late=mount(view),leaving=current;active=false;pending[3].resolve({data:[]});await late;assert.equal(leaving.innerHTML,"");
 active=true;const fail=mount(view),failure=current;pending[4].reject(Error("Sin conexión"));await fail;
 assert.match(failure.innerHTML,/Sin conexión/);
 console.log("Maintenance: diagnostics, shortcuts, repeat, stale loads and errors verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
