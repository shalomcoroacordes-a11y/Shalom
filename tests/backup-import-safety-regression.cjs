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
const writeIndex=body.indexOf("await restoreTable(table, rows, revisions)");
assert.ok(writeIndex>=0&&body.indexOf("restorationStarted = true")<writeIndex);
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
 const db={from(table){assert.equal(table,"songs");return {select(fields){assert.equal(fields,"*");return {order(key,opts){assert.equal(key,"id");assert.equal(opts.ascending,true);return this},async range(first,last){calls.push([first,last]);return {data:records.slice(first,last+1)}}}}}}};
 assert.equal(JSON.stringify(await core.selectAll(db,"songs")),JSON.stringify(records));
 assert.deepEqual(calls,[[0,499],[500,999],[1000,1499]]);
 const denied={message:"Sin permiso"};
 const failed={from(){return {select(){return {order(){return this},async range(){return {error:denied}}}}}}};
 await assert.rejects(core.selectAll(failed,"songs"),error=>error===denied);
 await assert.rejects(core.selectAll(failed,"songs",(error,table)=>new Error(table+": "+error.message)),/songs: Sin permiso/);
 console.log("Backup core: row sanitation, download format, pagination and legacy errors verified.");
}
sharedPagination().catch(error=>{console.error(error);process.exitCode=1});

// Exercise the actual deletion controller with isolated, mocked database calls.
const deleteStart=backup.indexOf("  async function deleteSavedItem("),deleteEnd=backup.indexOf("  async function downloadBackup()",deleteStart);
assert.ok(deleteStart>=0&&deleteEnd>deleteStart);
assert.doesNotMatch(backup,/function removeArchive\(/);
function trashFixture({archiveId="snapshot",archiveError=null,failTable=null,confirmDelete=true,refreshError=null,rpcResult={data:true},rpcError=null}={}){
 const calls=[],notes=[],refreshes=[];
 const ctx={busy:false,checkDelete:()=>true,itemName:()=>"Canto",confirm:()=>confirmDelete,say:(message,bad)=>notes.push({message,bad}),archive:async()=>{calls.push("archive");if(archiveError)throw archiveError;return archiveId},db:{async rpc(name,args){calls.push(name+":"+args.p_song_id);if(rpcError)throw rpcError;return rpcResult},from(table){return {delete(){return {async eq(key,id){calls.push(table+":"+key+":"+id);return {error:table===failTable?{message:"Sin permiso"}:null}}}}}}},window:{async apRefresh(message){refreshes.push(message);if(refreshError)throw refreshError}}};
 vm.createContext(ctx);vm.runInContext(backup.slice(deleteStart,deleteEnd),ctx);
 return {ctx,calls,notes,refreshes,run:(kind="song")=>ctx.deleteSavedItem(kind,"song-id")};
}
async function trashRecoverySafety(){
 const absent=trashFixture({archiveId:null});await absent.run("album");assert.deepEqual(absent.calls,["archive"]);assert.match(absent.notes.at(-1).message,/No se inició la eliminación/);assert.equal(absent.ctx.busy,false);
 const noBackup=trashFixture({archiveError:Error("Sin conexión")});await noBackup.run("artist");assert.deepEqual(noBackup.calls,["archive"]);assert.match(noBackup.notes.at(-1).message,/No se confirmó el respaldo/);
 const cancel=trashFixture({confirmDelete:false});await cancel.run();assert.deepEqual(cancel.calls,[]);
 for(const [kind,table] of [["album","album_songs"],["album","albums"],["artist","artists"],["category","categories"]]){
  const failed=trashFixture({failTable:table});await failed.run(kind);assert.equal(failed.calls[0],"archive");assert.ok(failed.calls.some(call=>call.startsWith(table+":")));assert.ok(failed.calls.every(call=>!call.startsWith("admin_trash:")));assert.match(failed.notes.at(-1).message,/respaldo se conserva/);assert.equal(failed.refreshes.length,0);assert.equal(failed.ctx.busy,false);
  if(table==="album_songs")assert.ok(!failed.calls.some(call=>call.startsWith("albums:")));
 }
 const rpcCall=["admin_delete_song_complete:song-id"];
 const ok=trashFixture();await ok.run();assert.deepEqual(ok.calls,rpcCall);assert.equal(ok.refreshes.length,1);assert.equal(ok.ctx.busy,false);
 for(const result of [{data:false},{error:{message:"RPC not found"}},{error:{message:"Sin permiso"}}]){
  const failed=trashFixture({rpcResult:result});await failed.run();assert.deepEqual(failed.calls,rpcCall);assert.equal(failed.refreshes.length,0);assert.match(failed.notes.at(-1).message,/No se confirmó la eliminación segura/);
 }
 const network=trashFixture({rpcError:Error("Sin conexión")});await network.run();assert.deepEqual(network.calls,rpcCall);assert.match(network.notes.at(-1).message,/No se intentó una eliminación alternativa/);
 const refresh=trashFixture({refreshError:Error("Sin conexión")});await refresh.run();assert.deepEqual(refresh.calls,rpcCall);assert.match(refresh.notes.at(-1).message,/El canto está en la papelera/);
 console.log("Trash safety: atomic song RPC, no fallback, confirmation, network uncertainty, refresh failure and legacy non-song archive verified.");
}
trashRecoverySafety().catch(error=>{console.error(error);process.exitCode=1});

// Legacy restore compares persisted values, including intentional duplicates.
const prior={id:"old-id",song_id:"s",artist_id:"a",role:"main",sort_order:0,extra:{b:2,a:1},created_at:"before"};
const matching={id:"new-id",song_id:"s",artist_id:"a",role:"main",sort_order:0,extra:{a:1,b:2},created_at:"after"};
const other={...prior,artist_id:"b"};
assert.equal(core.missingRelations([prior],[matching]).length,0);
assert.equal(core.missingRelations([prior,prior],[matching]).length,1);
assert.equal(core.missingRelations([prior],[{...matching,role:"featured"}]).length,1);
assert.equal(core.missingRelations([prior,other],[matching])[0].artist_id,"b");
assert.equal(core.missingRelations([prior],[])[0].id,undefined);
const relationsStart=backup.indexOf("  async function restoreRelations("),relationsEnd=backup.indexOf("  async function restoreTrash(",relationsStart);
assert.ok(relationsStart>=0&&relationsEnd>relationsStart);
assert.match(backup,/await restoreRelations\(row.item_type, snapshot.record.id, snapshot.relations \|\| \{\}\)/);
async function relationRecovery(){
 const reads=[],writes=[];
 const ctx={missingRelations:core.missingRelations,rows:async(table,key,id)=>{reads.push([table,key,id]);return table==="song_artists"?[matching]:[]},db:{from(table){return {async insert(values){writes.push({table,values});return {error:null}}}}}};
 vm.createContext(ctx);vm.runInContext(backup.slice(relationsStart,relationsEnd),ctx);
 await ctx.restoreRelations("song","s",{song_artists:[prior,other],song_categories:[{song_id:"s",category_id:"c"}]});
 assert.equal(reads.length,2);assert.equal(writes.length,2);assert.equal(writes[0].values.length,1);assert.equal(writes[0].values[0].artist_id,"b");assert.equal(writes[1].table,"song_categories");
 reads.length=0;writes.length=0;
 await assert.rejects(ctx.restoreRelations("song","s",{song_artists:[prior],song_categories:[{song_id:"different",category_id:"c"}]}),/relaciones no válidas/);assert.equal(writes.length,0);
 await ctx.restoreRelations("album","album",{album_songs:[{album_id:"album",song_id:"s"}]});assert.equal(reads.at(-1)[1],"album_id");
 console.log("Legacy restore: exact existing relations, multiplicity, scoped reads and invalid relation preflight verified.");
}
relationRecovery().catch(error=>{console.error(error);process.exitCode=1});

// Native snapshot restoration uses the exact same RPC as native Admin.
const nativeApi=fs.readFileSync("admin-mobile/src/api.js","utf8");
assert.match(nativeApi,/rpc\/admin_restore_song/);
const restoreStart=backup.indexOf("  async function restoreTrash("),restoreEnd=backup.indexOf("  async function purgeTrash(",restoreStart);
assert.ok(restoreStart>=0&&restoreEnd>restoreStart);
function restoreFixture(snapshot,{kind="song",original="s",rpcResult={data:true},accepted=true}={}){
 const calls=[],notes=[],refreshes=[];
 const ctx={trashRows:[{id:"trash",item_type:kind,original_id:original,item_name:"Canto",snapshot}],busy:false,idOf:value=>String(value||""),confirm:()=>accepted,say:(message,bad)=>notes.push({message,bad}),cleanRow:core.cleanRow,restoreRelations:async(...args)=>calls.push(["legacy-relations",...args]),TRASH_TABLE:"admin_trash",db:{async rpc(name,args){calls.push(["rpc",name,args]);return rpcResult},from(table){calls.push(["table",table]);return {select(){return this},eq(){return this},async maybeSingle(){return {data:{id:"s"}}},delete(){return this}}}},window:{async apRefresh(message){refreshes.push(message)}}};
 vm.createContext(ctx);vm.runInContext(backup.slice(restoreStart,restoreEnd),ctx);
 return {ctx,calls,notes,refreshes,run:()=>ctx.restoreTrash("trash")};
}
async function nativeRecovery(){
 const snapshot={song:{id:"s"},song_versions:[{parent_song_id:"s",version_song_id:"v"}]};
 const ok=restoreFixture(snapshot);await ok.run();assert.equal(JSON.stringify(ok.calls),JSON.stringify([["rpc","admin_restore_song",{p_trash_id:"trash"}]]));assert.equal(ok.refreshes.length,1);assert.equal(ok.ctx.busy,false);
 for(const response of [{error:{message:"Sin permiso"}},{error:{message:"CONFLICT"}},{error:{message:"Función no disponible",code:"PGRST202"}},{data:false}]){
  const failed=restoreFixture(snapshot,{rpcResult:response});await failed.run();assert.equal(failed.calls.length,1);assert.equal(failed.calls[0][0],"rpc");assert.equal(failed.refreshes.length,0);assert.match(failed.notes[0].message,/No se pudo restaurar/);assert.equal(failed.ctx.busy,false);
 }
 for(const malformed of [{song:{id:"other"}},{song:null},{song:{id:"s"},record:{id:"s"}}]){
  const bad=restoreFixture(malformed);await bad.run();assert.equal(bad.calls.length,0);assert.match(bad.notes[0].message,/no coincide/);
 }
 const cancel=restoreFixture(snapshot,{accepted:false});await cancel.run();assert.equal(cancel.calls.length,0);
 const old=restoreFixture({record:{id:"s"},relations:{}});await old.run();assert.equal(old.calls[0][0],"table");assert.ok(old.calls.some(c=>c[0]==="legacy-relations"));assert.equal(old.refreshes.length,1);
 console.log("Native trash compatibility: owner RPC, no fallback, invalid snapshots, cancellation and legacy route verified.");
}
nativeRecovery().catch(error=>{console.error(error);process.exitCode=1});

// SQL source contract only; database execution must be verified in an isolated environment.
const trashSql=fs.readFileSync("sql/SHALOM_ADMIN_SONG_TRASH_20261121.sql","utf8");
const delSql=trashSql.slice(0,trashSql.indexOf("create or replace function public.admin_restore_song"));
const restoreSql=trashSql.slice(trashSql.indexOf("create or replace function public.admin_restore_song"));
assert.match(delSql,/auth\.uid\(\) is null or not public\.admin_has_permission\('songs.delete'\)/);
assert.match(restoreSql,/auth\.uid\(\) is null or not public\.admin_is_owner\(\)/);
assert.ok(delSql.indexOf("perform 1 from public.song_studio_arrangements")<delSql.indexOf("select jsonb_build_object"));
assert.match(delSql,/'song_studio_arrangements',coalesce\(\(select jsonb_agg\(to_jsonb\(r\)\) from public\.song_studio_arrangements/);
assert.ok(delSql.indexOf("'song_studio_arrangements',coalesce")<delSql.indexOf("delete from public.songs"));
assert.match(restoreSql,/coalesce\(old.snapshot->'song_studio_arrangements','\[\]'::jsonb\)/);
assert.match(restoreSql,/r.song_id is distinct from old.original_id/);
assert.match(restoreSql,/select song_id,song_revision,arrangement,updated_at from jsonb_populate_recordset/);
assert.ok(restoreSql.indexOf("insert into public.song_studio_arrangements")<restoreSql.indexOf("delete from public.admin_trash"));
assert.match(trashSql,/revoke all on function public.admin_restore_song\(uuid\) from public,anon/);
console.log("Studio trash SQL contract: snapshot, identity, revision and permission checks; live transaction tests still required.");

// The import, export and safety backup share one schema and preserve old format.
assert.equal(core.FORMAT,"SHALOM backup");assert.equal(core.VERSION,2);
assert.ok(Object.isFrozen(core.TABLES));
assert.equal(core.TABLES.length,13);assert.equal(new Set(core.TABLES).size,13);
assert.ok(core.TABLES.indexOf("songs")<core.TABLES.indexOf("song_artists"));
assert.ok(core.TABLES.indexOf("artists")<core.TABLES.indexOf("artist_featured_songs"));
assert.equal(core.conflictKey("artist_featured_songs"),"artist_id,song_id");
assert.equal(core.conflictKey("songs"),"id");
assert.match(backup,/for \(const table of TABLES\)/);
assert.equal((source.match(/for \(const table of TABLES\)/g)||[]).length,2);
assert.doesNotMatch(source,/const TABLES = \[/);
const tableStart=source.indexOf("  async function restoreTable("),tableEnd=source.indexOf("  async function importBackup(",tableStart);
assert.ok(tableStart>=0&&tableEnd>tableStart);
async function backupConflictKeys(){
 const calls=[];
 const ctx={cleanRow:row=>core.cleanRow(row,true),categoryOrder:rows=>rows,chunks:rows=>[rows],LABELS:{},conflictKey:core.conflictKey,db:{from(table){return {async upsert(rows,opts){calls.push({table,rows,opts});return {error:null}}}}}};
 vm.createContext(ctx);vm.runInContext(source.slice(tableStart,tableEnd),ctx);
 assert.equal(await ctx.restoreTable("artist_featured_songs",[{artist_id:"a",song_id:"s",sort_order:1}]),1);
 assert.equal(calls[0].opts.onConflict,"artist_id,song_id");assert.equal(calls[0].rows[0].song_id,"s");
 assert.equal(await ctx.restoreTable("songs",[{id:"s",title:"Canto"}]),1);
 assert.equal(calls[1].opts.onConflict,"id");
 console.log("Backup schema: one table manifest and correct composite conflict key verified.");
}
backupConflictKeys().catch(error=>{console.error(error);process.exitCode=1});

// V2 backup: preserve Studio and alternate versions, never activate stale arrangements.
const revA="2026-11-20T12:00:00.123456+00:00",revB="2026-11-20T12:00:00.123457+00:00",revNew="2026-11-25T12:00:00.654321+00:00";
const arrangement={v:1,pattern:["D","U"],sections:[{id:"verse"}]};
const backupCatalog={songs:[{id:"s",updated_at:revA},{id:"old",updated_at:revB}],song_versions:[{id:"v",parent_song_id:"s",version_song_id:"old"}],song_studio_arrangements:[{song_id:"s",song_revision:revA,arrangement},{song_id:"old",song_revision:revA,arrangement}]};
const plan=core.planStudioRestore(backupCatalog);
assert.equal(plan.current.length,1);assert.equal(plan.stale,1);
assert.equal(plan.current[0].song_id,"s");
assert.equal(core.conflictKey("song_studio_arrangements"),"song_id");
assert.equal(core.TABLES.at(-1),"song_studio_arrangements");
assert.throws(()=>core.bindStudioRevisions(plan,new Map()),/No se confirmó/);
assert.equal(JSON.stringify(core.bindStudioRevisions(plan,new Map([["s",revNew]]))),JSON.stringify([{song_id:"s",arrangement,song_revision:revNew}]));
assert.equal(core.bindStudioRevisions({current:[],stale:0},null).length,0);
for(const row of [{song_id:"missing",song_revision:revA,arrangement},{song_id:"s",song_revision:"bad",arrangement},{song_id:"s",song_revision:revA,arrangement:{v:2}}]){
 assert.throws(()=>core.planStudioRestore({...backupCatalog,song_studio_arrangements:[row]}),/arreglo Studio inválido/);
}
assert.throws(()=>core.planStudioRestore({...backupCatalog,song_studio_arrangements:[backupCatalog.song_studio_arrangements[0],backupCatalog.song_studio_arrangements[0]]}),/arreglo Studio inválido/);
const validationStart=source.indexOf("  function getRows("),validationEnd=source.indexOf("  function renderSelection(",validationStart);
const validationCtx={FORMAT:core.FORMAT,VERSION:core.VERSION,TABLES:core.TABLES,planStudioRestore:core.planStudioRestore,isObject:value=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value)};
vm.createContext(validationCtx);vm.runInContext(source.slice(validationStart,validationEnd),validationCtx);
assert.equal(validationCtx.validateBackup({format:core.FORMAT,version:1,catalog:{songs:[{id:"legacy"}]}}).studioPlan.current.length,0);
assert.throws(()=>validationCtx.validateBackup({format:core.FORMAT,version:2,catalog:{songs:[{id:"s"}]}}),/Falta la sección/);
assert.equal(validationCtx.validateBackup({format:core.FORMAT,version:2,catalog:backupCatalog}).studioPlan.stale,1);
async function studioBackupWrite(){
 const calls=[],revisions=new Map();
 const ctx={cleanRow:row=>core.cleanRow(row,true),categoryOrder:rows=>rows,chunks:rows=>[rows],LABELS:{},conflictKey:core.conflictKey,db:{from(table){return {upsert(rows,opts){calls.push({table,rows,opts});return table==="songs"?{async select(columns){assert.equal(columns,"id,updated_at");return {data:rows.map(row=>({id:row.id,updated_at:revNew}))}}}:Promise.resolve({error:null})}}}}};
 vm.createContext(ctx);vm.runInContext(source.slice(tableStart,tableEnd),ctx);
 await ctx.restoreTable("songs",backupCatalog.songs,revisions);
 assert.equal(calls[0].rows[0].updated_at,undefined);
 await ctx.restoreTable("song_studio_arrangements",core.bindStudioRevisions(plan,revisions),revisions);
 assert.equal(calls[1].opts.onConflict,"song_id");assert.equal(calls[1].rows.length,1);assert.equal(calls[1].rows[0].song_revision,revNew);
 console.log("Backup v2: legacy format, exact revision precision, stale exclusion and returned-revision restoration verified.");
}
studioBackupWrite().catch(error=>{console.error(error);process.exitCode=1});

// Exercise the actual import controller: safety backup before writes, exact order,
// no Studio publication if an intermediate operation fails, and honest notices.
async function importControllerFlow(){
 const catalog=backupCatalog;
 for(const mode of ["success","cancel","backup-failure","write-failure","legacy"]){
  const calls=[],notices=[],controls=[];
  const payload=mode==="legacy"?{version:1,catalog:{songs:[{id:"legacy"}]}}:{version:2,catalog};
  const selected={file:{name:"synthetic.json"},payload,total:3,studioPlan:mode==="legacy"?{current:[],stale:0}:plan};
  const ctx={selectedBackup:selected,importBusy:false,db:{},TABLES:core.TABLES,LABELS:{},getRows:(c,t)=>c[t]||[],bindStudioRevisions:core.bindStudioRevisions,confirm:()=>mode!=="cancel",setStatus:(message,type)=>notices.push({message,type}),setControlsDisabled:x=>controls.push(x),createSafetyBackup:async()=>{calls.push("backup");if(mode==="backup-failure")throw Error("Disk failure");},restoreTable:async(table,rows,revisions)=>{calls.push(table);if(mode==="write-failure"&&table==="song_versions")throw Error("Write failure");if(table==="songs"&&revisions)for(const row of rows)revisions.set(row.id,revNew);if(table==="song_studio_arrangements"){assert.equal(rows.length,1);assert.equal(rows[0].song_revision,revNew);}return rows.length;},renderSelection(){},window:{async apRefresh(){calls.push("refresh")}}};
  vm.createContext(ctx);vm.runInContext(source.slice(tableEnd,source.indexOf("  function bindCard(",tableEnd)),ctx);
  await ctx.importBackup();assert.equal(ctx.importBusy,false);
  if(mode==="cancel"){assert.equal(calls.length,0);continue;}
  assert.deepEqual(controls,[true,false]);assert.equal(calls[0],"backup");
  if(mode==="backup-failure"){assert.deepEqual(calls,["backup"]);assert.match(notices.at(-1).message,/No se modificó ningún registro/);}
  else if(mode==="write-failure"){assert.deepEqual(calls,["backup","songs","song_versions"]);assert.match(notices.at(-1).message,/Algunos registros pueden haberse restaurado/);assert.equal(ctx.selectedBackup,selected);}
  else if(mode==="legacy"){assert.deepEqual(calls,["backup","songs","refresh"]);assert.equal(ctx.selectedBackup,null);}
  else{assert.deepEqual(calls,["backup","songs","song_versions","song_studio_arrangements","refresh"]);assert.match(notices.at(-1).message,/1 arreglos antiguos/);assert.equal(ctx.selectedBackup,null);}
 }
 console.log("Backup controller: full sequence, preflight failure, intermediate failure, cancellation and legacy compatibility verified.");
}
importControllerFlow().catch(error=>{console.error(error);process.exitCode=1});
