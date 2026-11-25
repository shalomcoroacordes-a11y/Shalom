const assert=require("node:assert/strict");
const {tabs,isSelectedTab,routeForTab,matchesSearch,handleBack}=require("../src/navigation-core");
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

function runBack(overrides={},nested=false){
 const calls=[];
 const state={tab:"Inicio",detailHistoryRef:{current:[{type:"artist",id:"a"}]},tabHistoryRef:{current:["Perfil"]},previousTabRef:{current:"Perfil"},nestedBackRef:{current:()=>{calls.push(["nested"]);return nested;}},model:{categoryMap:new Map([["child",{parent_id:"parent"}],["parent",{}],["orphan",{parent_id:"missing"}]])},...overrides};
 const controls=Object.fromEntries(["setProfileMenuOpen","setActionSongId","setImmersive","setSettingsOpen","setCapoExpanded","setDetail","setRepertoireSearchOpen","setQuery","setSectionSearchOpen","setHomeSearch","goTab","setFolderId","setFolderType","setSongLibraryOpen","setOnlyLiked","setTypeFilter"].map(name=>[name,(...args)=>calls.push([name,...args])]));
 return {handled:handleBack(state,controls),calls,detailHistory:state.detailHistoryRef.current,tabHistory:state.tabHistoryRef.current};
}
const cases=[
 [{profileMenuOpen:true,actionSongId:"s",immersiveActive:true},true,[["setProfileMenuOpen",false]]],
 [{actionSongId:"s",immersiveActive:true},true,[["setActionSongId",null]]],
 [{immersiveActive:true,settingsOpen:true},true,[["setImmersive",false]]],
 [{settingsOpen:true,detail:{type:"song"}},true,[["setSettingsOpen",false]]],
 [{detail:{type:"song"},capoExpanded:true},true,[["setCapoExpanded",false]]],
 [{detail:{type:"song"}},true,[["setDetail",{type:"artist",id:"a"}]]],
 [{tab:"Repertorios",repertoireSearchOpen:true,sectionSearchOpen:true},true,[["nested"]]],
 [{tab:"Repertorios",repertoireSearchOpen:true,sectionSearchOpen:true},false,[["nested"],["setRepertoireSearchOpen",false],["setQuery",""]]],
 [{sectionSearchOpen:true,homeSearch:"canto"},false,[["nested"],["setSectionSearchOpen",false],["setQuery",""]]],
 [{homeSearch:"canto"},false,[["nested"],["setHomeSearch",""]]],
 [{tab:"Solicitar"},false,[["nested"],["goTab","Perfil",{replace:true}]]],
 [{tab:"Solicitar",previousTabRef:{current:"Solicitar"}},false,[["nested"],["goTab","Inicio",{replace:true}]]],
 [{tab:"Categorías",folderId:"child",folderType:"catolico"},false,[["nested"],["setFolderId","parent"]]],
 [{tab:"Categorías",folderId:"orphan"},false,[["nested"],["setFolderId",""]]],
 [{tab:"Categorías",folderType:"catolico"},false,[["nested"],["setFolderType",""]]],
 [{tab:"Canciones",songLibraryOpen:true},false,[["nested"],["setSongLibraryOpen",false],["setQuery",""],["setOnlyLiked",false],["setTypeFilter",""]]],
 [{tab:"Artistas"},false,[["nested"],["goTab","Perfil",{replace:true}]]],
 [{tab:"Artistas",tabHistoryRef:{current:[]}},false,[["nested"],["goTab","Inicio",{replace:true}]]]
];
for(const [state,nested,expected] of cases){const result=runBack(state,nested);assert.equal(result.handled,true);assert.deepEqual(result.calls,expected);}
assert.deepEqual(runBack().calls,[["nested"]]);assert.equal(runBack().handled,false);
assert.equal(runBack({detail:{type:"song"}}).detailHistory.length,0);
assert.equal(runBack({tab:"Artistas"}).tabHistory.length,0);
const source=require("node:fs").readFileSync("App.js","utf8");
assert.match(source,/return handleBack\(\{/);
assert.match(source,/BackHandler.addEventListener\("hardwareBackPress",back\)/);
console.log("SHALOM: hardware back priority, nested screens and history verified.");
