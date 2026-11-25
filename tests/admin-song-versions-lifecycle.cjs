const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("admin-song-versions.js","utf8"),html=fs.readFileSync("admin.html","utf8");
assert.doesNotMatch(source,/MutationObserver|setTimeout|document\.addEventListener\("click"/);
assert.doesNotMatch(fs.readFileSync("admin-main-artist-search.js","utf8"),/admin-song-versions\.js/);
assert.ok(html.search(/src="admin-song-versions\.js\?v=\d+"/)>=0);
assert.ok(html.search(/src="admin-song-versions\.js\?v=\d+"/)<html.search(/src="admin-pro\.js\?v=\d+"/));
let activeForm=null,editing=false,panel=null;
const pending=[],queries=[];
function makeForm(id){activeForm={querySelector(selector){assert.equal(selector,".admin-resource-grid");return {insertAdjacentElement(place,node){assert.equal(place,"afterend");panel=node}}}};editing=Boolean(id);panel=null;return activeForm}
const document={querySelector(selector){if(selector==="#songAdminForm")return activeForm;if(selector==="[data-cancel-song]")return editing?{}:null;if(selector==="#songVersionsAdmin")return panel;return null},querySelectorAll(){return []},createElement(){return {set innerHTML(value){this.firstElementChild={html:value,dataset:{editingSong:value.match(/data-editing-song="([^"]*)"/)?.[1],mode:value.match(/data-mode="([^"]*)"/)?.[1]},remove(){panel=null}}}}}};
const db={from(table){let key="",id="";return {select(){return this},eq(k,v){key=k;id=v;return this},order(){queries.push({table,key,id});return new Promise(resolve=>pending.push(resolve))}}}};
const window={supabaseClient:db};
vm.runInNewContext(source,{window,document});
const api=window.ShalomAdminSongVersions;
const settle=(start,title,id)=>{pending[start]({data:[{id,title}]});pending[start+1]({data:[]});pending[start+2]({data:[]})};
async function test(){
 api.mount(makeForm(""),null);assert.match(panel.html,/Primero guarda la canción/);assert.equal(pending.length,0);
 const first=api.mount(makeForm("a"),"a");
 assert.equal(queries[1].id,"a");assert.equal(queries[2].id,"a");
 const second=api.mount(makeForm("b"),"b");
 assert.equal(queries[4].id,"b");assert.equal(queries[5].id,"b");
 settle(3,"Canto B","b");await second;
 assert.match(panel.html,/Canto B/);
 settle(0,"Canto A","a");await first;
 assert.match(panel.html,/Canto B/);assert.doesNotMatch(panel.html,/Canto A/);
 api.mount(makeForm("b"),"b");assert.match(panel.html,/Canto B/);assert.equal(pending.length,6);
 const leaving=api.mount(makeForm("c"),"c");api.unmount();activeForm=null;editing=false;panel=null;
 settle(6,"Canto C","c");await leaving;assert.equal(panel,null);
 const again=api.mount(makeForm("c"),"c");settle(9,"Canto C","c");await again;assert.match(panel.html,/Canto C/);
 console.log("Song versions: explicit ownership, new song, same-song remount, stale queries, navigation and reload verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
