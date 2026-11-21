const assert=require("node:assert/strict");
const fs=require("node:fs");
const ui=require("../mobile/src/repertoire-ui.js");
const app=fs.readFileSync("mobile/App.js","utf8");
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
assert.match(app,/filterRepertoires\(model\.repertoires,repertoireFilter,query\)/);
assert.match(app,/\["todos","Todos",null\]/);
assert.match(app,/\["misa","Misa","mass"\]/);
assert.match(app,/\["ensayo","Ensayo","artists"\]/);
assert.match(app,/\["otras","Otras","calendar"\]/);
assert.match(app,/const count=Array\.isArray\(rep\.items\)\?rep\.items\.length:0/);
assert.match(app,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.repTopLogo/);
assert.match(components,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.sectionHeaderLogo/);
assert.match(app,/setRepertoireSearchOpen\(v=>!v\)/);
assert.match(app,/accessibilityLabel:"Sugerir un repertorio al administrador"/);
assert.match(app,/requestForm\("other"\);setRequestTitle\("Sugerencia de repertorio"\)/);
assert.deepEqual(require("../mobile/src/navigation-core.js").tabs,
 [["Inicio","home"],["Cantos","song"],["Repertorios","calendar"],["Mis creaciones","repertoires"],["Perfil","profile"]],
 "La estructura incluye Mis creaciones sin alterar los repertorios oficiales");
assert.ok(app.includes('require("./src/navigation-core")'),"La app importa la navegación desde su módulo");
assert.match(app,/goTab\(routeForTab\(name\)\)/,"La pestaña Mis creaciones utiliza su ruta existente");
assert.match(iconGenerator,/home-.*\.png/);
assert.match(iconGenerator,/"mass":/);
assert.match(iconGenerator,/"calendar":/);
assert.match(iconGenerator,/"search":/);
assert.doesNotMatch(app.slice(app.indexOf(" function renderRepertoires(){"),app.indexOf(" function renderRepertoireDetail(")),/INSERT INTO|fetch\(|supabaseClient/);
console.log("SHALOM repertory layout uses real counts, working filters and original dove branding.");
