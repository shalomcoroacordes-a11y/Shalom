const assert=require("node:assert/strict");
const {tabs,isSelectedTab,routeForTab,matchesSearch,navigateTab,navigateDetail,navigateRequest,handleBack}=require("../src/navigation-core");
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

function fixture(tab="Artistas"){
 const values={},calls=[];
 const controls=Object.fromEntries(["setProfileMenuOpen","setProfileEditNonce","setPersonalFilter","setActionSongId","setSettingsOpen","setImmersive","setTab","setDetail","setSongLibraryOpen","setCountLimit","setFolderType","setFolderId","setQuery","setTypeFilter","setArtistTypeFilter","setMedleyTypeFilter","setCategoryId","setSectionSearchOpen","setOnlyLiked"].map(key=>[key,value=>{values[key]=value;calls.push([key,value])}]));
 return {state:{tab,tabHistoryRef:{current:["Inicio"]},detailHistoryRef:{current:[{type:"song",id:"s"}]},personalNavRef:{current:null},previousTabRef:{current:"Perfil"}},controls,values,calls};
}
for(const [options,library,query,liked] of [[{},false,"",false],[{search:"Gloria"},true,"Gloria",false],[{liked:true},true,"",true],[{openLibrary:true},true,"",false]]){
 const f=fixture();navigateTab("Canciones",options,f.state,f.controls);
 assert.deepEqual(f.state.tabHistoryRef.current,["Inicio","Artistas"]);assert.deepEqual(f.state.detailHistoryRef.current,[]);
 assert.equal(f.values.setSongLibraryOpen,library);assert.equal(f.values.setQuery,query);assert.equal(f.values.setOnlyLiked,liked);
 assert.equal(f.values.setProfileEditNonce,0);assert.equal(f.values.setDetail,null);assert.equal(f.values.setCountLimit,80);
}
const personal=fixture("Perfil");navigateTab("Mis colecciones",{personalAction:"create",personalKind:"popurri"},personal.state,personal.controls);
assert.deepEqual(personal.state.personalNavRef.current,{view:"create",kind:"popurri"});
assert.equal(personal.values.setPersonalFilter,"popurri");
const deep=fixture();const route={view:"reading",entryId:"entry",folderId:"folder"};navigateTab("Mis colecciones",{personalNav:route},deep.state,deep.controls);assert.equal(deep.state.personalNavRef.current,route);
const same=fixture("Mis colecciones");same.state.personalNavRef.current=route;navigateTab("Mis colecciones",{},same.state,same.controls);assert.equal(same.state.personalNavRef.current,route);assert.deepEqual(same.state.tabHistoryRef.current,["Inicio"]);
const back=fixture();navigateTab("Perfil",{replace:true},back.state,back.controls);assert.deepEqual(back.state.tabHistoryRef.current,["Inicio"]);assert.equal(back.values.setProfileEditNonce,undefined);
navigateTab("Inicio",{},back.state,back.controls);assert.deepEqual(back.state.tabHistoryRef.current,[]);
const artist={type:"artist",id:"a"},album={type:"album",id:"b"};const f=fixture();f.state.detail=artist;navigateDetail(album,f.state,f.controls);assert.equal(f.values.setDetail,album);assert.equal(f.state.detailHistoryRef.current.at(-1),artist);
navigateRequest(f.state,f.controls);assert.equal(f.state.previousTabRef.current,"Artistas");assert.equal(f.values.setTab,"Solicitar");assert.deepEqual(f.state.detailHistoryRef.current,[]);
f.state.tab="Solicitar";navigateRequest(f.state,f.controls);assert.equal(f.state.previousTabRef.current,"Artistas");
// Artist-to-album navigation is exercised through the real profile renderer in artist-profile.test.js.
console.log("Navigation forward transitions, deep links, filters, album history and repeated request verified.");
