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
// Forward and backward transitions belong to the same navigation owner.
function navigateTab(next,options,state,controls){
 const {tab,tabHistoryRef,detailHistoryRef,personalNavRef}=state;
 const {setProfileMenuOpen,setProfileEditNonce,setPersonalFilter,setActionSongId,setSettingsOpen,setImmersive,setTab,setDetail,setSongLibraryOpen,setCountLimit,setFolderType,setFolderId,setQuery,setTypeFilter,setArtistTypeFilter,setMedleyTypeFilter,setCategoryId,setSectionSearchOpen,setOnlyLiked}=controls;
 setProfileMenuOpen(false);
 if(next!=="Perfil")setProfileEditNonce(0);
 if(next==="Inicio")tabHistoryRef.current=[];
 else if(next!==tab&&!options.replace)tabHistoryRef.current.push(tab);
 if(next==="Mis colecciones"&&tab!=="Mis colecciones"){
  personalNavRef.current=options.personalNav||(options.personalAction?{view:options.personalAction,kind:options.personalKind||"misa"}:null);
  setPersonalFilter(options.personalKind||null);
 }else if(next!=="Mis colecciones")setPersonalFilter(null);
 setActionSongId(null);
 setSettingsOpen(false);
 setImmersive(false);
 detailHistoryRef.current=[];
 setTab(next);
 setDetail(null);
 setSongLibraryOpen(next==="Canciones"&&Boolean(options.search||options.liked||options.openLibrary));
 setCountLimit(80);
 setFolderType("");
 setFolderId("");
 setQuery(options.search||"");
 setTypeFilter("");
 setArtistTypeFilter("");
 setMedleyTypeFilter("");
 setCategoryId("");
 setSectionSearchOpen(Boolean(options.search));
 setOnlyLiked(Boolean(options.liked));
}
function navigateDetail(next,state,controls){
 if(state.detail)state.detailHistoryRef.current.push(state.detail);
 controls.setDetail(next);
}
function navigateRequest(state,controls){
 if(state.tab!=="Solicitar")state.previousTabRef.current=state.tab;
 controls.setImmersive(false);
 state.detailHistoryRef.current=[];
 controls.setTab("Solicitar");
 controls.setDetail(null);
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
module.exports=Object.freeze({tabs,isSelectedTab,routeForTab,matchesSearch,navigateTab,navigateDetail,navigateRequest,handleBack});
