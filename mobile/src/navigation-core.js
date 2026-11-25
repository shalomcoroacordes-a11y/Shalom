// Rutas de navegación: cantos oficiales, creaciones locales y opciones del usuario.
const {normalize}=require("./catalog");
const tabs=Object.freeze([
 Object.freeze(["Inicio","home"]),
 Object.freeze(["Cantos","song"]),
 Object.freeze(["Repertorios","calendar"]),
 Object.freeze(["Mis creaciones","repertoires"]),
 Object.freeze(["Perfil","profile"])
]);
const exploreTabs=new Set(["Explorar","Artistas","Categorías","Álbumes","Popurrís"]);
const profileTabs=new Set(["Solicitar","Más","Respaldo"]);
function routeForTab(name){
 if(name==="Mis creaciones")return "Mis colecciones";
 if(name==="Cantos")return "Canciones";
 return name;
}
function isSelectedTab(current,name){
 return current===name||
  (name==="Mis creaciones"&&current==="Mis colecciones")||
  (name==="Cantos"&&(current==="Canciones"||exploreTabs.has(current)))||
  (name==="Perfil"&&profileTabs.has(current));
}
function matchesSearch(values,term){
 const fields=Array.isArray(values)?values:[];
 const haystack=normalize(fields.filter(value=>value!==null&&value!==undefined).join(" "));
 return haystack.includes(normalize(String(term??"").trim()));
}
// Apply the original priority order once; nested readers are consulted lazily.
function handleBack(state,controls){
 const {profileMenuOpen,actionSongId,immersiveActive,settingsOpen,detail,capoExpanded,tab,repertoireSearchOpen,sectionSearchOpen,homeSearch,folderId,folderType,songLibraryOpen,detailHistoryRef,tabHistoryRef,previousTabRef,nestedBackRef,model}=state;
 const {setProfileMenuOpen,setActionSongId,setImmersive,setSettingsOpen,setCapoExpanded,setDetail,setRepertoireSearchOpen,setQuery,setSectionSearchOpen,setHomeSearch,goTab,setFolderId,setFolderType,setSongLibraryOpen,setOnlyLiked,setTypeFilter}=controls;
  if(profileMenuOpen){setProfileMenuOpen(false);return true;}
  if(actionSongId){setActionSongId(null);return true;}
  if(immersiveActive){setImmersive(false);return true;}
  if(settingsOpen){setSettingsOpen(false);return true;}
  if(detail){
   if(detail.type==="song"&&capoExpanded){setCapoExpanded(false);return true;}
   setDetail(detailHistoryRef.current.pop()||null);return true;
  }
  if(nestedBackRef.current?.())return true;
  if(tab==="Repertorios"&&repertoireSearchOpen){setRepertoireSearchOpen(false);setQuery("");return true;}
  if(sectionSearchOpen){setSectionSearchOpen(false);setQuery("");return true;}
  if(tab==="Inicio"&&homeSearch){setHomeSearch("");return true;}
  if(tab==="Solicitar"){goTab(previousTabRef.current==="Solicitar"?"Inicio":previousTabRef.current,{replace:true});return true;}
  if(tab==="Categorías"&&folderId){
   const parent=model.categoryMap.get(folderId)?.parent_id;
   setFolderId(parent&&model.categoryMap.has(parent)?parent:"");return true;
  }
  if(tab==="Categorías"&&folderType){setFolderType("");return true;}
  if(tab==="Canciones"&&songLibraryOpen){setSongLibraryOpen(false);setQuery("");setOnlyLiked(false);setTypeFilter("");return true;}
  if(tab!=="Inicio"){const previous=tabHistoryRef.current.pop();goTab(previous||"Inicio",{replace:true});return true;}
  return false;
 }
module.exports=Object.freeze({tabs,isSelectedTab,routeForTab,matchesSearch,handleBack});
