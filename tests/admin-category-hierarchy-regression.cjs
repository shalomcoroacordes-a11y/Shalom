// Regresión de rutas, filtros y protección contra ciclos en categorías Admin.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("admin-category-hierarchy.js","utf8");
const admin=fs.readFileSync("admin-pro.js","utf8");
const html=fs.readFileSync("admin.html","utf8");
const context={window:{}};
vm.runInNewContext(source,context);
const tree=context.window.ShalomAdminCategoryHierarchy;
assert.ok(Object.isFrozen(tree));
const categories=[
 {id:"a",name:"Misa",parent_id:null},
 {id:"b",name:"Comunión",parent_id:"a"},
 {id:"c",name:"Cantos de entrada",parent_id:"a"},
 {id:"d",name:"Acción de gracias",parent_id:"b"},
 {id:"e",name:"Alabanza",parent_id:null},
 {id:"f",name:"Aleluya",parent_id:"e"}
];
const snapshot=JSON.stringify(categories);
assert.equal(tree.path(categories,categories[3]),"Misa › Comunión › Acción de gracias");
assert.equal(tree.path(categories,categories[2]),"Misa › Cantos de entrada");
assert.equal(tree.path(categories,categories[4]),"Alabanza");
assert.equal(tree.path(categories,{id:"x",name:"Separado",parent_id:"b"}),
 "Misa › Comunión › Separado");
assert.equal(tree.path(categories,null),"");
assert.deepEqual(Array.from(tree.descendants(categories,"a")).sort(),["a","b","c","d"]);
assert.deepEqual(Array.from(tree.descendants(categories,"e")).sort(),["e","f"]);
assert.deepEqual(Array.from(tree.descendants(categories,"desconocida")),["desconocida"]);
assert.deepEqual(Array.from(tree.flat(categories),x=>x.id),
 [...categories].sort((a,b)=>tree.path(categories,a).localeCompare(tree.path(categories,b),"es")).map(x=>x.id));
const ordered=tree.flat(categories);
assert.notStrictEqual(ordered,categories,"No reordenar el catálogo original");
const circular=[{id:"x",name:"Uno",parent_id:"y"},{id:"y",name:"Dos",parent_id:"x"}];
assert.match(tree.path(circular,circular[0]),/Uno/);
assert.match(tree.path(circular,circular[0]),/Dos/);
assert.deepEqual(Array.from(tree.descendants(circular,"x")).sort(),["x","y"],
 "No entrar en bucle cuando los datos recibidos tienen ciclos");
assert.equal(JSON.stringify(categories),snapshot,"No modificar categorías descargadas");
assert.deepEqual(Array.from(tree.descendants([],"a")),["a"]);
assert.deepEqual(Array.from(tree.flat([])),[]);
assert.match(admin,/const apCategoryTree = window\.ShalomAdminCategoryHierarchy/);
assert.match(admin,/function apCategoryPath\(item\)/);
assert.match(admin,/function apCategoryDescendants\(id\)/);
assert.match(admin,/function apFlatCategories\(\)/);
assert.ok(html.indexOf("admin-category-hierarchy.js")<html.indexOf("admin-pro.js"),
 "La ruta de categorías debe existir antes del consumidor");
console.log("SHALOM Admin: rutas, subcategorías, ciclos y orden estables.");
