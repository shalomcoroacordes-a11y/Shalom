const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {listTests}=require("../scripts/run-tests");
const {sources}=require("../scripts/check-syntax");

const files=listTests();
assert.ok(files.length>=23,"Debe encontrar las regresiones existentes y las nuevas");
for(const name of ["app-components.test.js","song-capo-core.test.js",
 "request-screen-ui.test.js","test-discovery.test.js"]){
 assert.ok(files.includes(name),"Falta incorporar automaticamente "+name);
}
assert.deepEqual(files,[...files].sort(),"Orden estable y reproducible");
assert.equal(new Set(files).size,files.length,"No repetir pruebas");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"shalom-tests-"));
try{
 fs.writeFileSync(path.join(tmp,"b.test.js"),"");
 fs.writeFileSync(path.join(tmp,"a.test.js"),"");
 fs.writeFileSync(path.join(tmp,"unlisted.spec.js"),"");
 fs.mkdirSync(path.join(tmp,"nested.test.js"));
 assert.deepEqual(listTests(tmp),["a.test.js","b.test.js"],
  "No ejecutar archivos ajenos, ni tratar carpetas como pruebas");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const js=sources().map(p=>path.relative(path.resolve(__dirname,".."),p));
assert.ok(js.includes("App.js"));
assert.ok(js.includes("src/request-screen-ui.js"));
assert.ok(js.includes("src/song-capo-core.js"));
assert.ok(js.includes("scripts/run-tests.js"));
assert.ok(js.includes("tests/test-discovery.test.js"));
assert.deepEqual(js,[...js].sort());
console.log("SHALOM: descubrimiento automático y aislamiento de pruebas verificados.");
