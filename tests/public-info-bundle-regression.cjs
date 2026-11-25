const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = name => fs.readFileSync(name,"utf8");
const join = names => names.map((name,i)=>(i?"\n\n/* ===== "+name+" (original order) ===== */\n":"")+read(name)).join("");
const common = read("public-content-base-bundle.css");
assert.equal(common,join(["site-shell.css","public-cards.css","public-accessibility.css"]));
assert.ok(common.startsWith('@import url("mobile-experience.css?v=1");'));
assert.equal((common.match(/@import/g)||[]).length,1);
assert.doesNotMatch(read("public-info-pages.css"),/@import/);
for(const page of ["acerca.html","contacto.html","solicitar-canto.html"]){
 const styles=[...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(styles,["style.css?v=5","public-content-base-bundle.css?v=1","public-info-pages.css?v=1"],page);
}
assert.equal(fs.existsSync("public-info-bundle.css"),false);
assert.doesNotMatch(read("offline-sw.js"),/public-info-bundle\.css/);
console.log("Informational pages: shared canonical base, original CSS cascade.");
