const assert=require("node:assert/strict");
const fs=require("node:fs");
const ui=require("../mobile/src/repertoire-ui.js");
const app=fs.readFileSync("mobile/App.js","utf8");
const catalog=fs.readFileSync("mobile/src/catalog-screens-ui.js","utf8");
const components=fs.readFileSync("mobile/src/app-components.js","utf8");
const iconGenerator=fs.readFileSync("mobile/scripts/generate_icons.py","utf8");
const sections=[
 {id:"m",kind:"misa",title:"Misa en parroquia",items:[{},{},{}]},
 {id:"e",kind:"ensayo",title:"Ensayo coro",items:[{}]},
 {id:"x",kind:"otro",title:"Encuentro musical",items:[]}
];
assert.deepEqual(ui.filterRepertoires(sections,"misa").map(x=>x.id),["m"]);
assert.deepEqual(ui.filterRepertoires(sections,"ensayo").map(x=>x.id),["e"]);
assert.deepEqual(ui.filterRepertoires(sections,"otras").map(x=>x.id),["x"]);
assert.equal(ui.filterRepertoires(sections,"misa")[0].items.length,3);
assert.match(catalog,/filterRepertoires\(model\.repertoires,repertoireFilter,query\)/);
assert.match(catalog,/\["todos","Todos",null\]/);
assert.match(catalog,/\["misa","Misa","mass"\]/);
assert.match(catalog,/\["ensayo","Ensayo","artists"\]/);
assert.match(catalog,/\["otras","Otras","calendar"\]/);
assert.match(catalog,/const count=Array\.isArray\(rep\.items\)\?rep\.items\.length:0/);
assert.match(app,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.repTopLogo/);
assert.match(components,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.sectionHeaderLogo/);
assert.match(app,/setRepertoireSearchOpen\(v=>!v\)/);
assert.match(catalog,/accessibilityLabel:"Sugerir un repertorio al administrador"/);
assert.match(catalog,/requestForm\("other"\);setRequestTitle\("Sugerencia de repertorio"\)/);
assert.deepEqual(require("../mobile/src/navigation-core.js").tabs,
 [["Inicio","home"],["Cantos","song"],["Repertorios","calendar"],["Mis creaciones","repertoires"],["Perfil","profile"]],
 "La estructura incluye Mis creaciones sin alterar los repertorios oficiales");
assert.ok(app.includes('require("./src/navigation-core")'),"La app importa la navegación desde su módulo");
assert.match(app,/goTab\(routeForTab\(name\)\)/,"La pestaña Mis creaciones utiliza su ruta existente");
assert.match(iconGenerator,/home-.*\.png/);
const iconCatalog=JSON.parse(fs.readFileSync("mobile/assets/icons/catalog.json","utf8"));
assert.match(iconGenerator,/catalog\.json/);
assert.match(iconGenerator,/for name, svg in icons\.items\(\):/);
assert.match(iconGenerator,/render_ui\(svg, "home-" \+ name \+ "\.png"/);
for(const name of ["mass","calendar","search"]){
 assert.match(iconCatalog[name],/<svg\b/);
 assert.match(iconCatalog[name],/viewBox="0 0 24 24"/);
 assert.match(iconCatalog[name],/stroke-width="1\.8"/);
 assert.ok(app.includes('require("./assets/home-'+name+'.png")'),"The icon is consumed by the native app: "+name);
}
assert.notEqual(iconCatalog.mass,iconCatalog.calendar,"Distinct liturgy and calendar icons");
assert.notEqual(iconCatalog.song,iconCatalog.medleys,"Distinct song and medley icons");
for(const match of app.matchAll(/require\("\.\/assets\/home-([a-z-]+)\.png"\)/g)){
 if(["logo","waves","banner"].includes(match[1]))continue;
 assert.ok(iconCatalog[match[1]],"Missing vector source: "+match[1]);
}
assert.doesNotMatch(catalog.slice(catalog.indexOf("function RepertoiresScreen("),catalog.indexOf("function MedleysScreen(")),/INSERT INTO|fetch\(|supabaseClient/);
console.log("SHALOM repertory layout uses real counts, working filters and original dove branding.");
