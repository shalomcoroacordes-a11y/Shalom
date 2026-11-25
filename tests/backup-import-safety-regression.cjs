const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("admin-backup-import.js","utf8");
assert.match(source,/shalom-respaldo-antes-de-restaurar-\$\{filenameDate\(\)\}\.json/);
assert.doesNotMatch(source,/juntos-hacia-dios-respaldo-antes-de-restaurar/);
const start=source.indexOf("async function importBackup()");
const end=source.indexOf("function bindCard()",start);
assert.ok(start>=0&&end>start);
const body=source.slice(start,end);
assert.match(body,/let restorationStarted = false/);
assert.ok(body.indexOf("await createSafetyBackup()")<body.indexOf("restorationStarted = true"));
assert.ok(body.indexOf("restorationStarted = true")<body.indexOf("await restoreTable(table, rows)"));
assert.match(body,/No se inició la restauración:/);
assert.match(body,/No se modificó ningún registro durante este intento/);
assert.match(body,/Algunos registros pueden haberse restaurado/);
console.log("ADM backup: SHALOM filename and distinct preflight/partial restore notices verified.");

const vm=require("node:vm");
const backup=fs.readFileSync("admin-backup.js","utf8");
assert.doesNotMatch(backup,/window\.apRenderView\s*=|MutationObserver|ensureBackupTab/,"Backup must not override the renderer or observe the entire DOM");
assert.doesNotMatch(source,/MutationObserver/,"Importer mounts through the owning backup view");
assert.match(backup,/const app = \(\) => AP;/,"Read the original admin state");
assert.match(backup,/installDeleteInterception\(\);/,"Preserve existing delete protection");
assert.match(source,/window\.ShalomAdminBackupImport = \{ mount: mountImporter \}/);
const mountStart=backup.indexOf("  function renderBackupView(view)");
const mountEnd=backup.indexOf("  // The main admin renderer",mountStart);
assert.ok(mountStart>=0&&mountEnd>mountStart);
const actions=[];
const context={backupViewHTML:()=>"<p>Backup</p>",downloadBackup(){},loadTrash(){actions.push("trash")},window:{ShalomAdminBackupImport:{mount(){actions.push("import")}}},document:{getElementById(id){return {addEventListener(event,handler){actions.push(id+":"+event)}}}}};
vm.createContext(context);
vm.runInContext(backup.slice(mountStart,mountEnd),context);
const view={innerHTML:""};
context.renderBackupView(view);
assert.equal(view.innerHTML,"<p>Backup</p>");
assert.deepEqual(actions,["jhdDownloadBackup:click","jhdRefreshTrash:click","import","trash"]);
console.log("Backup view: explicit importer mount, controls and trash loading verified without database writes.");

const coreWindow={};
const downloads=[];
const anchor={click(){downloads.push("click")},remove(){downloads.push("remove")}};
vm.runInNewContext(fs.readFileSync("admin-backup-core.js","utf8"),{window:coreWindow,Blob:class {constructor(parts,options){downloads.push({parts,options})}},URL:{createObjectURL(){return "blob:test"},revokeObjectURL(url){downloads.push(url)}},document:{createElement(){return anchor},body:{append(a){assert.equal(a,anchor)}}}});
const core=coreWindow.ShalomAdminBackupCore;
const html=fs.readFileSync("admin.html","utf8");
for(const name of ["admin-backup.js","admin-backup-import.js"])assert.ok(html.indexOf('src="admin-backup-core.js')<html.indexOf('src="'+name));
const row=Object.freeze({id:42,created_at:"old",updated_at:"old",artists:[],artist:{},album:{},albums:[],category:{},categories:[],_private:true,title:"Canto",lyrics:"Letra",sort_order:0,optional:null});
const expected={id:42,title:"Canto",lyrics:"Letra",sort_order:0,optional:null};
assert.equal(JSON.stringify(core.cleanRow(row)),JSON.stringify(expected));
const {id,...relation}=expected;
assert.equal(JSON.stringify(core.cleanRow(row,false)),JSON.stringify(relation));
assert.equal(JSON.stringify(core.cleanRow(null)),"{}");
assert.match(source,/const cleanRow = \(row\) => sanitizeRow\(row, true\)/);
assert.match(source,/rows\.map\(cleanRow\)/);
core.downloadJson({format:"SHALOM backup",version:1},"backup.json");
assert.equal(anchor.download,"backup.json");assert.equal(anchor.href,"blob:test");assert.equal(downloads[0].parts[0],JSON.stringify({format:"SHALOM backup",version:1},null,2));assert.equal(downloads[0].options.type,"application/json;charset=utf-8");assert.equal(downloads.slice(1).join(","),"click,remove,blob:test");
async function sharedPagination(){
 const calls=[],records=Array.from({length:1000},(_,id)=>({id}));
 const db={from(table){assert.equal(table,"songs");return {select(fields){assert.equal(fields,"*");return {async range(first,last){calls.push([first,last]);return {data:records.slice(first,last+1)}}}}}}};
 assert.equal(JSON.stringify(await core.selectAll(db,"songs")),JSON.stringify(records));
 assert.deepEqual(calls,[[0,499],[500,999],[1000,1499]]);
 const denied={message:"Sin permiso"};
 const failed={from(){return {select(){return {async range(){return {error:denied}}}}}}};
 await assert.rejects(core.selectAll(failed,"songs"),error=>error===denied);
 await assert.rejects(core.selectAll(failed,"songs",(error,table)=>new Error(table+": "+error.message)),/songs: Sin permiso/);
 console.log("Backup core: row sanitation, download format, pagination and legacy errors verified.");
}
sharedPagination().catch(error=>{console.error(error);process.exitCode=1});

// Exercise the actual deletion controller with isolated, mocked database calls.
const deleteStart=backup.indexOf("  async function deleteSavedItem("),deleteEnd=backup.indexOf("  async function downloadBackup()",deleteStart);
assert.ok(deleteStart>=0&&deleteEnd>deleteStart);
assert.doesNotMatch(backup,/function removeArchive\(/);
function trashFixture({archiveId="snapshot",archiveError=null,failTable=null,confirmDelete=true,refreshError=null}={}){
 const calls=[],notes=[],refreshes=[];
 const ctx={busy:false,checkDelete:()=>true,itemName:()=>"Canto",confirm:()=>confirmDelete,say:(message,bad)=>notes.push({message,bad}),archive:async()=>{calls.push("archive");if(archiveError)throw archiveError;return archiveId},db:{from(table){return {delete(){return {async eq(key,id){calls.push(table+":"+key+":"+id);return {error:table===failTable?{message:"Sin permiso"}:null}}}}}}},window:{async apRefresh(message){refreshes.push(message);if(refreshError)throw refreshError}}};
 vm.createContext(ctx);vm.runInContext(backup.slice(deleteStart,deleteEnd),ctx);
 return {ctx,calls,notes,refreshes,run:(kind="song")=>ctx.deleteSavedItem(kind,"song-id")};
}
async function trashRecoverySafety(){
 const absent=trashFixture({archiveId:null});await absent.run();assert.deepEqual(absent.calls,["archive"]);assert.match(absent.notes.at(-1).message,/No se inició la eliminación/);assert.equal(absent.ctx.busy,false);
 const noBackup=trashFixture({archiveError:Error("Sin conexión")});await noBackup.run();assert.deepEqual(noBackup.calls,["archive"]);assert.match(noBackup.notes.at(-1).message,/No se confirmó el respaldo/);
 const cancel=trashFixture({confirmDelete:false});await cancel.run();assert.deepEqual(cancel.calls,[]);
 for(const [kind,table] of [["song","song_categories"],["song","songs"],["album","album_songs"],["album","albums"],["artist","artists"],["category","categories"]]){
  const failed=trashFixture({failTable:table});await failed.run(kind);assert.equal(failed.calls[0],"archive");assert.ok(failed.calls.some(call=>call.startsWith(table+":")));assert.ok(failed.calls.every(call=>!call.startsWith("admin_trash:")));assert.match(failed.notes.at(-1).message,/respaldo se conserva/);assert.equal(failed.refreshes.length,0);assert.equal(failed.ctx.busy,false);
  if(table==="song_categories")assert.ok(!failed.calls.some(call=>call.startsWith("songs:")));
  if(table==="album_songs")assert.ok(!failed.calls.some(call=>call.startsWith("albums:")));
 }
 const ok=trashFixture();await ok.run();assert.equal(ok.calls[0],"archive");assert.equal(ok.calls.at(-1),"songs:id:song-id");assert.equal(ok.refreshes.length,1);assert.equal(ok.ctx.busy,false);
 const refresh=trashFixture({refreshError:Error("Sin conexión")});await refresh.run();assert.match(refresh.notes.at(-1).message,/respaldo se conserva/);
 console.log("Trash safety: confirmed backup gate, cancellation, six failure scenarios, successful removal and refresh failure verified.");
}
trashRecoverySafety().catch(error=>{console.error(error);process.exitCode=1});
