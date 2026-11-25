const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-donations-plus.js","utf8");
const html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver|donationAdminForm/);
assert.ok(html.includes("admin-donations-plus.js?v=3"));
const ownerScript=html.search(/src="admin-pro\.js\?v=\d+"/);
assert.ok(ownerScript>=0 && html.indexOf("admin-donations-plus.js?v=3")<ownerScript);
let current=null,resolve,reject,reads=0;
const section=()=>({innerHTML:""});
const view={set innerHTML(value){this.content=value;current=section()},get innerHTML(){return this.content},querySelector:()=>current};
const document={querySelector:q=>q==="#donationPlusAdmin"?current:null,querySelectorAll:()=>[]};
const db={from(table){assert.equal(table,"donation_settings");reads++;return {select(){return this},order(key){return key==="sort_order"?this:new Promise((yes,no)=>{resolve=yes;reject=no})}}}};
const window={supabaseClient:db};
vm.runInNewContext(source,{window,document});
const mount=window.ShalomAdminDonations.mount;
async function test(){
 const first=mount(view),target=current;
 assert.match(view.innerHTML,/Cargando opciones de donación/);
 resolve({data:[{id:"a",label:"Apoyo de prueba",is_active:false}]});await first;
 assert.match(target.innerHTML,/Apoyo de prueba/);assert.match(target.innerHTML,/Oculta/);assert.match(target.innerHTML,/donationPlusForm/);
 const late=mount(view),old=current;current=null;resolve({data:[]});await late;
 assert.equal(old.innerHTML,"","Late response must not render into a different tab");
 const failed=mount(view),failure=current;reject(Error("Sin conexión"));await failed;
 assert.match(failure.innerHTML,/Sin conexión/);
 assert.equal(reads,3);
 console.log("Donation lifecycle: loading, successful render, navigation, error and direct ownership verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
