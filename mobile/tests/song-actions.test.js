const assert=require("node:assert/strict");
const fs=require("node:fs");
const {emptyStore,newCollection,newEntry,newPart,parseStore,exportCode,importCode}=require("../src/personal-collections");
const {addToPersonal,entriesOf}=require("../src/song-actions-core");
const {buildPrintableSong,readerShiftForPrint}=require("../src/song-print");
const store=emptyStore();
const first=addToPersonal(store,"song-1","repertorio",{title:"Domingo"});
assert.equal(store.collections.length,0,"No debe mutar el estado anterior");
assert.equal(first.store.collections.length,1);
assert.equal(first.entry.kind,"repertorio");
assert.equal(first.entry.parts[0].songId,"song-1");
assert.equal(entriesOf(first.store,"repertorio").length,1);
assert.equal(entriesOf(first.store,"misa").length,0);
const duplicate=addToPersonal(first.store,"song-1","repertorio",
 {folderId:first.folder.id,entryId:first.entry.id});
assert.equal(duplicate.already,true,"Agregar dos veces el mismo canto no debe duplicarlo");
assert.equal(duplicate.store,first.store,"Duplicar no guarda cambios");
const second=addToPersonal(first.store,"song-2","repertorio",
 {folderId:first.folder.id,entryId:first.entry.id});
assert.deepEqual(second.entry.parts.map(p=>p.songId),["song-1","song-2"]);
const third=addToPersonal(second.store,"song-3","misa",{title:"Misa de jóvenes"});
assert.equal(third.entry.kind,"misa");
const fourth=addToPersonal(third.store,"song-3","popurri",{title:"Alabanza"});
assert.equal(fourth.entry.kind,"popurri");
assert.equal(entriesOf(fourth.store,"repertorio").length,1);
assert.equal(entriesOf(fourth.store,"misa").length,1);
assert.equal(entriesOf(fourth.store,"popurri").length,1);
assert.throws(()=>addToPersonal(fourth.store,"song-3","misa",
 {folderId:fourth.folder.id,entryId:fourth.entry.id}),/otro tipo/);
assert.throws(()=>addToPersonal(fourth.store,"song-4","repertorio",
 {folderId:"missing",title:"A"}),/ya no existe/);
assert.throws(()=>addToPersonal(fourth.store,"","popurri",{title:"V"}),/identificador/);
const restored=parseStore(JSON.stringify(fourth.store));
assert.equal(restored.collections[0].entries.length,3,"Migración compatible con las misas y popurrís anteriores");
assert.equal(importCode(exportCode(second.entry)).kind,"repertorio","Código SHALOM compartible con la nueva versión");
const filled=newEntry("misa","Límite");
filled.parts=Array.from({length:30},(_,i)=>newPart("s-"+i));
assert.throws(()=>addToPersonal({version:1,collections:[{...newCollection("Prueba"),entries:[filled]}]},
 "another","misa",{folderId:"fake",entryId:filled.id}),/ya no existe/);
const target=newCollection("Prueba");
target.entries=[filled];
assert.throws(()=>addToPersonal({version:1,collections:[target]},"another","misa",
 {folderId:target.id,entryId:filled.id}),/hasta 30/);
const sample={id:"song-1",title:"Canto <&> seguro",tone:"G",_artists:[{name:'A "B"'}],
 lyrics:"[Coro]\nG   D\nJesús <vive> & salva\n\nEm\nAmén"};
const html=buildPrintableSong(sample,2);
assert.match(html,/&lt;&amp;&gt;/);
assert.match(html,/Jesús &lt;vive&gt; &amp; salva/);
assert.match(html,/Tono A/,"El tono impreso respeta la transposición");
assert.equal(readerShiftForPrint({...sample,capo_position:2,capo_key:"F"} ,0,"main"),-2);
assert.equal(readerShiftForPrint(sample,2,"none"),2);
assert.equal(readerShiftForPrint({...sample,capo_position:2,capo_key:"F"} ,2,"main"),0);
assert.match(html,/class="chords"/);
assert.doesNotMatch(html,/<script>|<vive>/);
const app=fs.readFileSync("App.js","utf8");
const sheet=fs.readFileSync("src/song-actions-ui.js","utf8");
const personal=fs.readFileSync("src/personal-ui.js","utf8");
const profile=fs.readFileSync("src/profile-ui.js","utf8");
assert.match(app,/h\(SongActionsSheet,/,"Existe panel nativo");
assert.match(app,/onPress:\(\)=>active\?setActionSongId/,"Tres puntos abren acciones del canto");
const gridUI=fs.readFileSync("src/aligned-score-ui.js","utf8");
assert.match(app,/h\(AlignedScore,/,"Lector muestra renglones completos compartidos entre pantallas");
assert.match(fs.readFileSync("src/web-score-html.js","utf8"),/overflow-x:auto/,"El lector conserva desplazamiento horizontal de la letra");
const readerActions=fs.readFileSync("src/song-reader-actions.js","utf8");
assert.match(readerActions,/Print\.printAsync\(\{html:buildPrintableSong\(song,readerShiftForPrint\(song,transpose,capo\)\)\}\)/,"Impresión nativa sin navegador y con capo");
assert.match(app,/createSongReaderActions\(\{/,"App conecta las acciones del lector con los servicios nativos");
assert.match(sheet,/onRequestClose:back/,"El botón nativo cierra panel o retrocede dentro de él");
for(const value of ["Quitar de Mis me gusta","Agregar a Mis me gusta","Agregar a repertorio","Agregar a misa",
 "Agregar a popurrí","Compartir canción","Imprimir letra y acordes","Descargar sin conexión"]){
 assert.ok(sheet.includes(value),"Falta acción "+value);
}
const navigation=fs.readFileSync("src/navigation-core.js","utf8");
assert.match(navigation,/if\(nestedBackRef\.current\?\.\(\)\)return true/,"Android respeta pantallas internas");
assert.match(navigation,/tabHistoryRef\.current\.pop\(\)/,"Android regresa a pestaña anterior");
assert.match(navigation,/detailHistoryRef\.current\.pop\(\)/,"Android regresa a detalle anterior");
assert.match(navigation,/if\(immersiveActive\)/,"Android sale primero de pantalla completa");
assert.match(navigation,/if\(settingsOpen\)/,"Android cierra ajustes");
assert.match(navigation,/tab==="Categorías"&&folderId/,"Android retrocede en subcategorías");
assert.match(personal,/if\(view==="reading"\)\{setView\("editing"\)/,"Retroceso desde lectura personal");
assert.match(personal,/if\(showFolderForm\)\{setShowFolderForm\(false\);return true;\}/,"Retroceso al crear carpetas opcionales");
assert.match(personal,/initialNav\?\.folderId/,"Volver desde canción conserva la colección anterior");
assert.match(profile,/if\(editing\)\{setEditing\(false\);return true;\}/,"Volver cancela edición no guardada del perfil");
console.log("SHALOM: acciones del canto, impresión y navegación Android verificadas.");
