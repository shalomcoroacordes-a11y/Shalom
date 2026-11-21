const assert=require("node:assert/strict");
const {tabs,isSelectedTab,routeForTab,matchesSearch}=require("../src/navigation-core");
assert.deepEqual(tabs.map(([name])=>name),
 ["Inicio","Cantos","Repertorios","Mis creaciones","Perfil"],
 "Conservar las cinco rutas principales organizadas por tareas");
assert.equal(routeForTab("Mis creaciones"),"Mis colecciones");
assert.equal(routeForTab("Cantos"),"Canciones");
assert.equal(isSelectedTab("Inicio","Inicio"),true);
assert.equal(isSelectedTab("Inicio","Perfil"),false);
assert.equal(isSelectedTab("Canciones","Cantos"),true);
assert.equal(isSelectedTab("Mis colecciones","Mis creaciones"),true);
for(const section of ["Explorar","Artistas","Categorías","Álbumes","Popurrís"]){
 assert.equal(isSelectedTab(section,"Cantos"),true,section+" pertenece a Cantos/Explorar");
 assert.equal(isSelectedTab(section,"Perfil"),false,section+" no pertenece al perfil");
}
for(const section of ["Solicitar","Más","Respaldo"])
 assert.equal(isSelectedTab(section,"Perfil"),true);
assert.equal(isSelectedTab("Mis colecciones","Perfil"),false);
assert.equal(isSelectedTab("Repertorios","Mis creaciones"),false);
assert.equal(matchesSearch(["Canto a María",null,undefined,"Adoración"],"maria"),true);
assert.equal(matchesSearch(["Gloria","Señor"],"gloria senor"),true);
assert.equal(matchesSearch(["Aleluya"],"salmo"),false);
assert.equal(matchesSearch(["Aleluya"],""),true);
assert.equal(matchesSearch(null,"aleluya"),false);
console.log("SHALOM Android: navegación y búsqueda independientes verificadas.");
