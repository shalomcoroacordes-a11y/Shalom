// Contrato independiente de cursor, scroll y memoria de edicion de canciones.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("admin-editor-position.js","utf8");
const admin=fs.readFileSync("admin-pro.js","utf8");
const page=fs.readFileSync("admin.html","utf8");

function makeStorage(initial={}){
 const data=new Map(Object.entries(initial));
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  snapshot:()=>Object.fromEntries(data)
 };
}
function boot(storage,editorGetter){
 const window={};
 const document={querySelector(selector){
  assert.equal(selector,"#songLyricsField");
  return editorGetter();
 }};
 vm.runInNewContext(source,{window,document,sessionStorage:storage});
 return window.ShalomAdminEditorPosition;
}
function createEditor(id,value){
 return {dataset:{scrollSong:id},value,scrollTop:0,scrollLeft:0,
  selectionStart:0,selectionEnd:0,
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
}
const key="shalom-admin-editor-positions-v1";
const storage=makeStorage();
let editor=createEditor("song-1","[Coro]\nG\nTu voz en mi camino");
const service=boot(storage,()=>editor);
assert.ok(Object.isFrozen(service),"El servicio expone un contrato estable");
editor.scrollTop=152;editor.scrollLeft=19;editor.selectionStart=11;editor.selectionEnd=17;
service.remember();
assert.deepEqual(JSON.parse(storage.getItem(key))["song-1"],
 {top:152,left:19,start:11,end:17});
editor=createEditor("song-2","Otro canto");
editor.scrollTop=45;editor.selectionStart=2;editor.selectionEnd=4;
service.remember();
editor=createEditor("song-1","[Coro]\nG\nTu voz en mi camino");
service.restore();
assert.equal(editor.scrollTop,152);
assert.equal(editor.scrollLeft,19);
assert.deepEqual([editor.selectionStart,editor.selectionEnd],[11,17]);
editor=createEditor("song-2","Otro canto");
service.restore();
assert.equal(editor.scrollTop,45);
assert.deepEqual([editor.selectionStart,editor.selectionEnd],[2,4]);

const reload=boot(storage,()=>editor);
editor.scrollTop=0;editor.selectionStart=0;editor.selectionEnd=0;
reload.restore();
assert.equal(editor.scrollTop,45,"Recuperar la posición después de recargar Admin");
assert.equal(editor.selectionStart,2);
editor=createEditor("song-1","G");
reload.restore();
assert.deepEqual([editor.selectionStart,editor.selectionEnd],[1,1],
 "No seleccionar fuera de la longitud de un borrador cambiado");
assert.equal(editor.scrollTop,152);
editor=createEditor("sin-historial","Sin edición");
reload.restore();
assert.equal(editor.scrollTop,0,"No modificar cantos sin historial");
editor=createEditor("__new__","Nuevo canto");
editor.scrollTop=399;
reload.remember();
assert.ok(JSON.parse(storage.getItem(key)).__new__);
reload.forget("__new__");
assert.equal(JSON.parse(storage.getItem(key)).__new__,undefined,
 "Al crear un canto nuevo, no recuperar el scroll de otro borrador");
assert.ok(JSON.parse(storage.getItem(key))["song-1"],"Conservar otras canciones");

let noStorage=createEditor("song-1","Canto");
const invalid=boot(makeStorage({[key]:"{broken"}),()=>noStorage);
invalid.restore();
assert.equal(noStorage.selectionStart,0,"Una sesión corrupta no bloquea Admin");
const inaccessible=boot({
 getItem(){throw new Error("disabled");},
 setItem(){throw new Error("disabled");}
},()=>noStorage);
noStorage.scrollTop=23;noStorage.selectionStart=3;noStorage.selectionEnd=3;
inaccessible.remember();
noStorage.scrollTop=0;
inaccessible.restore();
assert.equal(noStorage.scrollTop,23,"Sin sessionStorage, funciona dentro de la sesión");
assert.match(admin,/remember: apRememberEditorPosition/);
assert.match(admin,/restore: apRestoreEditorPosition/);
assert.match(admin,/if \(!song\) apForgetEditorPosition\("__new__"\)/);
assert.ok(page.indexOf("admin-editor-position.js")<page.indexOf("admin-pro.js"));
console.log("SHALOM Admin: cursor, scroll, recarga y borradores aislados.");
