"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={};
vm.runInNewContext(fs.readFileSync("admin-editor-position.js","utf8"),{window});
const create=window.ShalomAdminEditorPosition.create,key="shalom-admin-editor-positions-v1";
const state=new Map([[key,JSON.stringify({old:{top:30,left:14,start:3,end:8}})]]);
const storage={getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v)};
const service=create(()=>storage);
function editor(id,value="0123456789"){
 return {dataset:{scrollSong:id},value,scrollTop:0,scrollLeft:0,selectionStart:0,selectionEnd:0,setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b}};
}
const old=editor("old");service.restore(old);
assert.deepEqual([old.scrollTop,old.scrollLeft,old.selectionStart,old.selectionEnd],[30,14,3,8]);
const a=editor("a");Object.assign(a,{scrollTop:200,scrollLeft:36,selectionStart:4,selectionEnd:9});service.remember(a);
const b=editor("b");Object.assign(b,{scrollTop:17,scrollLeft:3,selectionStart:1,selectionEnd:2});service.remember(b);
const short=editor("a","abcde");service.restore(short);
assert.deepEqual([short.scrollTop,short.scrollLeft,short.selectionStart,short.selectionEnd],[200,36,4,5]);
const reload=create(()=>storage),other=editor("b");reload.restore(other);
assert.deepEqual([other.scrollTop,other.scrollLeft,other.selectionStart,other.selectionEnd],[17,3,1,2]);
const fresh=editor("__new__");fresh.scrollTop=90;reload.remember(fresh);reload.clear("__new__");
const next=editor("__new__");reload.restore(next);assert.equal(next.scrollTop,0);
assert.equal(JSON.parse(state.get(key)).a.top,200);
reload.remember(null);reload.restore(null);reload.remember(editor(""));
const inherited=editor("constructor");reload.restore(inherited);assert.equal(inherited.selectionEnd,0);
const special=editor("__proto__");special.scrollTop=88;reload.remember(special);
const roundtrip=editor("__proto__");create(()=>storage).restore(roundtrip);assert.equal(roundtrip.scrollTop,88);
for(const raw of ["bad","null","[]","{\"a\":null}","{\"a\":5}"]){
 const invalid=create(()=>({getItem:()=>raw,setItem(){}}));invalid.restore(editor("a"));invalid.remember(editor("a"));
}
const denied=create(()=>{throw Error("Storage denied")});denied.remember(a);const memory=editor("a");denied.restore(memory);assert.equal(memory.scrollTop,200);
const html=fs.readFileSync("admin.html","utf8"),src=fs.readFileSync("admin-pro.js","utf8");
assert.equal((html.match(/src="admin-editor-position\.js\?v=1"/g)||[]).length,1);
assert.ok(html.indexOf('src="admin-editor-position.js')<html.indexOf('src="admin-pro.js'));
assert.match(src,/window\.ShalomAdminEditorPosition\.create\(\(\) => sessionStorage\)/);
assert.match(src,/apEditorPosition\.clear\("__new__"\)/);
assert.match(src,/apRememberEditorPosition\(\);/);
assert.match(src,/apRestoreEditorPosition\(\);/);
assert.doesNotMatch(src,/AP_EDITOR_POSITION_KEY|apPersistEditorPositions|const apEditorPositions =/);
console.log("Admin editor position: backward-compatible storage, per-song isolation, remount, clamping, new draft reset and storage failure verified.");
