const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-home-section.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver|function setTabActive/);
const owner=html.search(/src="admin-pro\.js\?v=\d+"/),moduleIndex=html.search(/src="admin-home-section\.js\?v=\d+"/);
assert.ok(moduleIndex>=0&&owner>moduleIndex);
let current=null,active=true;
const pending=[];
const view={set innerHTML(v){this.content=v;current={innerHTML:""}},get innerHTML(){return this.content},querySelector:()=>current};
const document={getElementById(id){return id==="adminView"?view:id==="adminHomeSectionContent"?current:null},querySelector(q){return q==="[data-jhd-home-section-tab]"?{classList:{contains:()=>active}}:null},querySelectorAll(){return []}};
const db={from(table){return {select(){if(table==="song_artists")return Promise.resolve({data:[]});return {order(){if(table==="home_recommendations")return new Promise((resolve,reject)=>pending.push({resolve,reject}));return Promise.resolve({data:table==="categories"?[{id:"c",name:"Carpeta de prueba",song_type:"catolico"}]:[]})}}}}}};
const window={supabaseClient:db,ShalomHomeRecommendations:require("../home-recommendation-core.js")};
vm.runInNewContext(source,{window,document});
const mount=window.ShalomAdminHome.mount;
async function test(){
 const first=mount(view),target=current;
 assert.match(view.innerHTML,/Cargando recomendaciones/);
 pending[0].resolve({data:[{id:"r",target_type:"category",target_id:"c",section_type:"cristiano",sort_order:0,is_visible:true}]});await first;
 assert.match(target.innerHTML,/Carpeta de prueba/);assert.match(target.innerHTML,/Va en Católica automáticamente/);
 const old=mount(view),oldTarget=current;
 const next=mount(view),newTarget=current;
 pending[2].resolve({data:[]});await next;
 pending[1].resolve({data:[{id:"old",target_type:"category",target_id:"c"}]});await old;
 assert.equal(oldTarget.innerHTML,"");assert.doesNotMatch(newTarget.innerHTML,/data-rec-id="old"/);
 const leaving=mount(view),left=current;active=false;pending[3].resolve({data:[]});await leaving;assert.equal(left.innerHTML,"");
 active=true;const setup=mount(view),setupTarget=current;pending[4].resolve({error:{message:"Missing table"}});await setup;assert.match(setupTarget.innerHTML,/Configuración requerida/);
 const fail=mount(view),failure=current;pending[5].reject(Error("Sin conexión"));await fail;assert.match(failure.innerHTML,/Sin conexión/);
 console.log("Home: placement, native mount, overlapping loads, navigation, setup and errors verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
