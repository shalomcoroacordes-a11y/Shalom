const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync("admin-pro.js", "utf8");
const begin = source.indexOf("function apCaptureSongDraft() {");
const end = source.indexOf("function apDraftValue(", begin);
assert.ok(begin >= 0 && end > begin, "Debe existir el capturador de canciones");

const form = { id: "songAdminForm" };
const values = { title: "Canto de prueba", main_artist_id: "a1", category_id: "c1", tone: "G", lyrics: "[Verso]\\nG\\nHola" };
let collaborators = [{ value: "a2" }, { value: "a3" }];
const state = { draft: { category_ids: ["c1", "c2"], category_id: "c1" } };
class FakeFormData {
  constructor(target) { assert.equal(target, form); }
  entries() { return Object.entries(values)[Symbol.iterator](); }
}
const scope = {
  AP: state,
  FormData: FakeFormData,
  ap$: selector => selector === "#songAdminForm" ? form : null,
  ap$$: selector => {
    assert.equal(selector, "input[name='collaborator']:checked");
    return collaborators;
  }
};
vm.createContext(scope);
vm.runInContext(source.slice(begin, end) + "\napCaptureSongDraft();", scope);
assert.deepEqual(Array.from(state.draft.collaborators), ["a2", "a3"]);
assert.deepEqual(Array.from(state.draft.category_ids), ["c1", "c2"]);
assert.equal(state.draft.title, values.title);

collaborators = [];
values.title = "Canción sin colaboradores";
vm.runInContext("apCaptureSongDraft();", scope);
assert.deepEqual(Array.from(state.draft.collaborators), []);
assert.equal(state.draft.title, values.title);
assert.deepEqual(Array.from(state.draft.category_ids), ["c1", "c2"]);
console.log("SHALOM: guardado de canciones — formulario y selección múltiple correctos.");

const saveStart=source.indexOf("function apSongPublication("),saveEnd=source.indexOf("async function apHandleDeleteError(",saveStart);
assert.ok(saveStart>=0&&saveEnd>saveStart);
function publicationFixture({edit=true, response, networkError, pending}={}){
 const state={user:{id:"owner"},draft:{title:"Canto",tone:"G",lyrics:"G\\nLetra",main_artist_id:"a1",collaborators:["a1","a2"],category_ids:["c1","c2","c1"],album_id:"al",capo_position:"2",capo_key:"F"},links:[{url:"https://example.test"}],capos:[{capo_position:3,capo_key:"E"}],edits:{song:edit?"s":null},songEdit:{id:edit?"s":null,expected:edit?"original":null},songSaving:false};
 const calls=[],notes=[],refreshes=[];
 const context={AP:state,apId:x=>String(x||""),apSlug:x=>String(x).toLowerCase(),apCaptureSongDraft(){},apNote:(...args)=>notes.push(args),crypto:{randomUUID:()=>"new-id"},apResetDraft(){state.draft=null;state.songEdit=null;},apRefresh:async x=>refreshes.push(x),AdminPro:{async rpc(name,args){calls.push({name,args});if(pending)await pending;if(networkError)throw networkError;return response||{data:{id:args.p_song.id,updated_at:"confirmed"}};}}};
 vm.createContext(context);vm.runInContext(source.slice(saveStart,saveEnd),context);
 return {state,calls,notes,refreshes,run:()=>context.apSaveSong({preventDefault(){}})};
}
(async()=>{
 const ok=publicationFixture();await ok.run();
 assert.equal(ok.calls.length,1);assert.equal(ok.calls[0].name,"admin_publish_song");
 const args=ok.calls[0].args;
 assert.equal(args.p_expected,"original");assert.equal(args.p_song.artist_id,"a1");assert.equal(args.p_song.category_id,"c1");
 assert.deepEqual(Array.from(args.p_artists,x=>x.artist_id),["a1","a2"]);
 assert.deepEqual(Array.from(args.p_categories,x=>x.category_id),["c1","c2"]);
 assert.equal(args.p_links.length,1);assert.equal(args.p_capos.length,1);assert.equal(args.p_albums.length,1);
 assert.equal(ok.state.draft,null);
 const missing=publicationFixture();missing.state.songEdit.expected=null;await missing.run();assert.equal(missing.calls.length,0);assert.ok(missing.state.draft);
 const conflict=publicationFixture({response:{error:{message:"CONFLICT"}}});await conflict.run();assert.ok(conflict.state.draft);assert.equal(conflict.refreshes.length,0);
 const network=publicationFixture({edit:false,networkError:Error("offline")});await network.run();await network.run();
 assert.equal(network.calls.length,2);assert.equal(network.calls[0].args.p_song.id,network.calls[1].args.p_song.id);assert.ok(network.state.draft);
 const ambiguous=publicationFixture({response:{data:{id:"other",updated_at:"confirmed"}}});await ambiguous.run();assert.ok(ambiguous.state.draft);
 let release;const gate=new Promise(r=>{release=r;});const newer=publicationFixture({pending:gate});
 const writing=newer.run();await newer.run();assert.equal(newer.calls.length,1);
 newer.state.draft={...newer.state.draft,lyrics:"Nuevos cambios"};release();await writing;
 assert.equal(newer.state.draft.lyrics,"Nuevos cambios");assert.equal(newer.state.songEdit.expected,"confirmed");assert.equal(newer.state.songSaving,false);
 let release2;const gate2=new Promise(r=>{release2=r;});const switched=publicationFixture({pending:gate2});
 const old=switched.run();switched.state.songEdit={id:"other",expected:"another"};switched.state.draft={title:"Otro canto"};release2();await old;
 assert.equal(switched.state.draft.title,"Otro canto");assert.equal(switched.refreshes.length,0);
 console.log("Atomic web song publication: one RPC, original revision, deduplication, ambiguous retry, conflict and later edits preserved.");
})().catch(error=>{console.error(error);process.exitCode=1});
