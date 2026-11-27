const assert=require("node:assert/strict");
const fs=require("node:fs");
const {newCollection,newEntry,newPart,parseStore}=require("../src/personal-collections");
const {updateCollection,updateComposition,reorderParts}=require("../src/personal-store");

const first=newCollection("Misas","#27c98b","dove");
first.coverPhoto="cover-preservada.jpg";
const mass={...newEntry("misa","Domingo"),parts:[newPart("canto-1"),newPart("canto-2"),newPart("canto-3")]};
first.entries.push(mass);
const second=newCollection("Ensayos","#a078e1");
const state={version:1,collections:[first,second]};

const changed=updateComposition(state,first.id,mass.id,item=>({...item,title:"Misa solemne"}));
assert.equal(state.collections[0].entries[0].title,"Domingo","No alterar el estado anterior");
assert.equal(changed.collections[0].entries[0].title,"Misa solemne");
assert.strictEqual(changed.collections[1],second,"Las demás colecciones no deben mutar");
assert.equal(changed.collections[0].coverPhoto,first.coverPhoto,"Conservar fotos locales");
assert.strictEqual(changed.collections[0].entries[0].parts,mass.parts,"Conservar los cantos");

const colored=updateCollection(changed,second.id,c=>({...c,color:"#58a7a0"}));
assert.equal(colored.collections[1].color,"#58a7a0");
assert.equal(second.color,"#a078e1");
assert.strictEqual(colored.collections[0],changed.collections[0]);

const ids=mass.parts.map(part=>part.id);
const moved=reorderParts(mass,0,1);
assert.deepEqual(moved.parts.map(part=>part.id),[ids[1],ids[0],ids[2]]);
assert.deepEqual(mass.parts.map(part=>part.id),ids,"No modificar la lista original");
for(const [i,d] of [[0,-1],[2,1],[0,0],[-1,1]])
 assert.strictEqual(reorderParts(mass,i,d),mass,"No permutar fuera de rango");
const restored=parseStore(JSON.stringify({...state,collections:[{...first,entries:[moved]},second]}));
assert.deepEqual(restored.collections[0].entries[0].parts.map(part=>part.id),moved.parts.map(part=>part.id),
 "Conservar el orden tras guardar y recuperar");

const screen=fs.readFileSync("src/personal-ui.js","utf8");
const styles=fs.readFileSync("src/personal-styles.js","utf8");
assert.match(screen,/require\("\.\/personal-store"\)/);
assert.match(screen,/require\("\.\/personal-styles"\)\(theme\)/);
assert.doesNotMatch(screen,/StyleSheet\.create\(/);
assert.match(styles,/return createStyles\(StyleSheet,/);
assert.match(styles,/collectionGrid:/);
assert.match(styles,/readerPart:/);
const activeImport=screen.slice(screen.indexOf("function completeImport(){"),screen.indexOf("function receiveView(){"));
assert.match(activeImport,/codePreview\(shareInput,songs\)/,"Revalidar el código antes de guardar");
assert.match(activeImport,/receivePersonal\(store,shareInput,importTarget\)/,
 "Reutiliza las mismas restricciones para importar una misa o popurrí");
assert.match(activeImport,/commit\(result\.store,/,"Guardar el resultado del importador validado");
assert.doesNotMatch(activeImport,/newCollection\(|store\.collections\.some\(/,
 "La pantalla no reconstruye manualmente las colecciones importadas");
console.log("SHALOM: Mis colecciones respeta edición inmutable, orden, fotos y estilos.");
