"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={};vm.runInNewContext(fs.readFileSync("admin-category-hierarchy.js","utf8"),{window});
const tree=window.ShalomAdminCategoryHierarchy;
const rows=Object.freeze([
 {id:"b",parent_id:"a",name:"Z",sort_order:10},{id:"c",parent_id:"b",name:"C"},
 {id:"a",parent_id:null,name:"A"},{id:"d",parent_id:"a",name:"Árbol",sort_order:10},
 {id:"e",parent_id:"missing",name:"E"},{id:"x",parent_id:"y"},{id:"y",parent_id:"x"},
 {id:7,parent_id:"a",name:"Numeric",sort_order:0}
].map(Object.freeze));
const ids=list=>Array.from(list,row=>row.id);
assert.deepEqual(ids(tree.path(rows,tree.byId(rows,"c"))),["a","b","c"]);
assert.deepEqual(ids(tree.path(rows,tree.byId(rows,"e"))),["e"]);
assert.deepEqual(ids(tree.path(rows,tree.byId(rows,"x"))),["y","x"]);
assert.deepEqual(ids(tree.path(rows,null)),[]);
assert.deepEqual(Array.from(tree.descendants(rows,"a")).sort(),["7","a","b","c","d"]);
assert.deepEqual(Array.from(tree.descendants(rows,"x")).sort(),["x","y"]);
assert.deepEqual(Array.from(tree.descendants(rows,"missing")).sort(),["e","missing"]);
assert.deepEqual(ids(tree.children(rows,"a")),[7,"d","b"]);
assert.deepEqual(ids(tree.children(rows,null)),["a"]);
assert.equal(tree.byId(rows,"7").id,7);
assert.deepEqual(ids(rows),["b","c","a","d","e","x","y",7]);
const html=fs.readFileSync("admin.html","utf8");
assert.equal((html.match(/src="admin-category-hierarchy\.js\?v=1"/g)||[]).length,1);
for(const name of ["admin-pro.js","admin-category-browser-v2.js","admin-song-category-picker.js"]){
 assert.ok(html.indexOf('src="admin-category-hierarchy.js')<html.indexOf('src="'+name));
 assert.match(fs.readFileSync(name,"utf8"),/window\.ShalomAdminCategoryHierarchy/);
}
console.log("Admin category tree: ancestors, descendants, missing parents, cycle termination, order and script ownership verified.");
