const assert=require("node:assert/strict");
const {tabs,isSelectedTab,matchesSearch}=require("../src/navigation-core");

assert.deepEqual(tabs.map(([name])=>name),
 ["Inicio","Canciones","Repertorios","Artistas","Perfil"],
 "No alterar la navegación principal ni su orden");
assert.equal(isSelectedTab("Inicio","Inicio"),true);
assert.equal(isSelectedTab("Inicio","Perfil"),false);
for(const section of ["Popurrís","Álbumes","Categorías","Solicitar","Mis colecciones","Más"]){
 assert.equal(isSelectedTab(section,"Perfil"),true,section+" pertenece a Perfil");
}
assert.equal(isSelectedTab("Repertorios","Perfil"),false);
assert.equal(matchesSearch(["Canto a María",null,undefined,"Adoración"],"maria"),true,
 "La búsqueda ignora tildes y valores ausentes");
assert.equal(matchesSearch(["Gloria","Señor"],"gloria senor"),true);
assert.equal(matchesSearch(["Aleluya"],"salmo"),false);
assert.equal(matchesSearch(["Aleluya"],""),true);
assert.equal(matchesSearch(null,"aleluya"),false);
console.log("SHALOM Android: navegación y búsqueda independientes verificadas.");
