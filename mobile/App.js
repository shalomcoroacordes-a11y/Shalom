const React=require("react");
const {useEffect,useMemo,useState,useRef,useCallback}=React;
const {
 View,Text,TextInput,Pressable,ScrollView,StatusBar,
 Alert,AppState,BackHandler,Platform,Linking,Image,ActivityIndicator,Share
}=require("react-native");
const NetInfo=require("@react-native-community/netinfo").default;
const {SafeAreaProvider,SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const {getCatalog,setMetadata,getMetadataBatch,setMetadataBatch}=require("./src/database");
const {syncAll,networkState}=require("./src/sync");
const {parseSong,transposeOne}=require("./src/chords");
const AlignedScore=require("./src/aligned-score-ui");
const {clampReaderFont}=require("./src/score-zoom");
const {buildCatalog,normalize,names,safeWebUrl}=require("./src/catalog");
const {sendRequest}=require("./src/requests");
const RequestScreen=require("./src/request-screen-ui");
const SettingsScreen=require("./src/settings-screen-ui");
const {MoreScreen,ExploreScreen,AlbumsScreen}=require("./src/exploration-screens-ui");
const {FAVORITES_KEY,parseFavorites,hasFavorite,toggleFavorite}=require("./src/favorites");
const {repertoireType,filterRepertoires}=require("./src/repertoire-ui");
const {personalCounts,officialHighlights}=require("./src/home-spotlight");
const PersonalCollectionsScreen=require("./src/personal-ui");
const SongActionsSheet=require("./src/song-actions-ui");
const StudioCollections=require("./src/studio-collections");
const LocalNotice=require("./src/local-notice");
const PersonalBackupScreen=require("./src/personal-backup-ui");
const ProfileOptionsMenu=require("./src/profile-options-menu");
const {exportPersonalBackup,pickPersonalBackup,stageRestoredPhotos}=require("./src/personal-backup-io");
const {createPersonalBackupController}=require("./src/personal-backup-controller");
const {addToPersonal}=require("./src/song-actions-core");
const {songPermalink,createSongReaderActions}=require("./src/song-reader-actions");
const {capoSelection}=require("./src/song-capo-core");
const Print=require("expo-print");
const {ProfileScreen}=require("./src/profile-ui");
const {PROFILE_KEY,defaults:profileDefaults,parseProfile}=require("./src/profile-core");
const {InitialCover}=require("./src/visual-ui");
const {CoverArt}=require("./src/personal-cover-ui");
const {LibraryHero,LibrarySearch,LibraryChipRow,LibrarySongRow,LibraryArtistCard}=require("./src/library-ui");
const {STORE_KEY:PERSONAL_KEY,emptyStore,parseStore}=require("./src/personal-collections");
const h=React.createElement;
const C={bg:"#0e1219",panel:"#19222d",sub:"#232d39",border:"#354650",
 text:"#f4f7f7",muted:"#b0c0c7",green:"#27c98b",pale:"#b5ffe0",error:"#ffc4bf",gold:"#ffce53"};
const HOME_IMAGES={
 logo:require("./assets/home-logo.png"),waves:require("./assets/home-waves.png"),
 banner:require("./assets/home-banner.png"),song:require("./assets/home-song.png"),
 repertoires:require("./assets/home-repertoires.png"),artists:require("./assets/home-artists.png"),
 categories:require("./assets/home-categories.png"),medleys:require("./assets/home-medleys.png"),
 albums:require("./assets/home-albums.png"),home:require("./assets/home-home.png"),
 more:require("./assets/home-more.png"),bell:require("./assets/home-bell.png"),
 menu:require("./assets/home-menu.png"),
 mass:require("./assets/home-mass.png"),
 calendar:require("./assets/home-calendar.png"),
 search:require("./assets/home-search.png")};
const MONO=Platform.OS==="ios"?"Menlo":"monospace";
const {tabs,isSelectedTab,routeForTab,matchesSearch,handleBack}=require("./src/navigation-core");
const {filterSongs,filterArtists,favoriteSongs,searchHomeSongs,selectDetailRecords,selectActionSong}=require("./src/library-selectors");
const {startStudioQueue,advanceStudioQueue}=require("./src/studio-queue");
async function openWeb(value) {
 const url=safeWebUrl(value);
 if(!url)return Alert.alert("Enlace no válido","No se encontró una dirección válida.");
 try{await Linking.openURL(url)}
 catch(_){Alert.alert("No se pudo abrir","Revisa tu conexión o intenta desde el navegador.")}
}
const SONG_TYPES=[["","Todos"],["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"],["general","General"]];
function AppScreen() {
 const insets=useSafeAreaInsets();
 // Android edge-to-edge: reserve the status-bar area exactly once.
 const topInset=Platform.OS==="android"?Math.max(insets.top||0,StatusBar.currentHeight||0):Math.max(0,insets.top||0);
 const [copy,setCopy]=useState(null);
 const [loaded,setLoaded]=useState(false);

 const [wifiOnly,setWifiOnly]=useState(true);
 const [network,setNetwork]=useState({online:false,wifi:false});
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [tab,setTab]=useState("Inicio");
 const [detail,setDetail]=useState(null);
 const [lastRead,setLastRead]=useState(null);
 const lastReadRef=useRef(lastRead);
 lastReadRef.current=lastRead;
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [immersive,setImmersive]=useState(false);
 const isReader=detail?.type==="song"||detail?.type==="medley"||detail?.type==="repertoire";
 const immersiveActive=Platform.OS==="android"&&isReader&&immersive;
 const [query,setQuery]=useState("");
 const [homeSearch,setHomeSearch]=useState("");
 const [typeFilter,setTypeFilter]=useState("");
 const [categoryId,setCategoryId]=useState("");
 const [repertoireFilter,setRepertoireFilter]=useState("todos");
 const [repertoireSearchOpen,setRepertoireSearchOpen]=useState(false);
 const [sectionSearchOpen,setSectionSearchOpen]=useState(false);
 const [libraryFiltersVisible,setLibraryFiltersVisible]=useState(true);
 const [songLibraryOpen,setSongLibraryOpen]=useState(false);
 const [artistTypeFilter,setArtistTypeFilter]=useState("");
 const [medleyTypeFilter,setMedleyTypeFilter]=useState("");
 const [folderType,setFolderType]=useState("");
 const [folderId,setFolderId]=useState("");
 const [transpose,setTranspose]=useState(0);
 const [capo,setCapo]=useState("none");
 const [readerFont,setReaderFont]=useState(15);
 const [capoExpanded,setCapoExpanded]=useState(false);
 const [likedIds,setLikedIds]=useState([]);
 const [personal,setPersonal]=useState(emptyStore());
 const [personalFilter,setPersonalFilter]=useState(null);
 const [profile,setProfile]=useState(profileDefaults());
 const [actionSongId,setActionSongId]=useState(null);
 const [studioPayload,setStudioPayload]=useState(null);
 const [studioQueue,setStudioQueue]=useState(null);
 const [notice,setNotice]=useState(null);
 const [profileMenuOpen,setProfileMenuOpen]=useState(false);
 const noticeTimerRef=useRef(null);
 const personalRef=useRef(emptyStore());
 const profileRef=useRef(profileDefaults());
 const nestedBackRef=useRef(null);
 const personalNavRef=useRef(null);
 const registerNestedBack=useCallback(handler=>{
  nestedBackRef.current=handler;
  return()=>{if(nestedBackRef.current===handler)nestedBackRef.current=null;};
 },[]);
 const [profileEditNonce,setProfileEditNonce]=useState(0);
 const profileWriteRef=useRef(Promise.resolve());
 const personalWriteRef=useRef(Promise.resolve());
 const [onlyLiked,setOnlyLiked]=useState(false);
 const [countLimit,setCountLimit]=useState(80);
 const [requestKind,setRequestKind]=useState("song");
 const [requestSong,setRequestSong]=useState(null);
 const [requestTitle,setRequestTitle]=useState("");
 const [requestArtist,setRequestArtist]=useState("");
 const [requestLink,setRequestLink]=useState("");
 const [requestDetails,setRequestDetails]=useState("");
 const [requestName,setRequestName]=useState("");
 const [requestEmail,setRequestEmail]=useState("");
 const [sending,setSending]=useState(false);
 const inFlight=useRef(false),prefRef=useRef(true),lastRef=useRef(null);
 const autoRetryRef=useRef({lastAttempt:0,failures:0});
 const previousTabRef=useRef("Inicio");
 const detailHistoryRef=useRef([]);
 const tabHistoryRef=useRef([]);
 const likedRef=useRef([]);
 const likedWriteRef=useRef(Promise.resolve());
 function showLocalNotice(message,onUndo){
  if(noticeTimerRef.current)clearTimeout(noticeTimerRef.current);
  setNotice({id:Date.now()+Math.random(),message,onUndo});
  noticeTimerRef.current=setTimeout(()=>{setNotice(null);noticeTimerRef.current=null;},5200);
 }
 function clearLocalNotice(){
  if(noticeTimerRef.current)clearTimeout(noticeTimerRef.current);
  noticeTimerRef.current=null;setNotice(null);
 }
 useEffect(()=>()=>{if(noticeTimerRef.current)clearTimeout(noticeTimerRef.current)},[]);
 const model=useMemo(()=>buildCatalog(copy?.data||{}),[copy]);
 const {active,focusedArtist,focusedAlbum,focusedMedley,focusedRepertoire}=useMemo(()=>selectDetailRecords(model,detail),[model,detail]);
 const likedSet=useMemo(()=>new Set(likedIds),[likedIds]);
 const actionSong=selectActionSong(model,actionSongId);
 const favorites=useMemo(()=>favoriteSongs(model,likedSet),[model,likedSet]);
 const eligible=useMemo(()=>filterSongs(model,{
  query,typeFilter,categoryId,onlyLiked,likedSet
 }),[model,typeFilter,categoryId,query,onlyLiked,likedSet]);
 const filteredArtists=useMemo(()=>filterArtists(model,{query,type:artistTypeFilter}),
  [model,query,artistTypeFilter]);
 const homeMatches=useMemo(()=>searchHomeSongs(model,homeSearch,6),[model,homeSearch]);
 function goTab(next,options={}){setProfileMenuOpen(false);if(next!=="Perfil")setProfileEditNonce(0);if(next==="Inicio")tabHistoryRef.current=[];else if(next!==tab&&!options.replace)tabHistoryRef.current.push(tab);if(next==="Mis colecciones"&&tab!=="Mis colecciones"){
  personalNavRef.current=options.personalNav||(
   options.personalAction?{view:options.personalAction,kind:options.personalKind||"misa"}:null);
  setPersonalFilter(options.personalKind||null);
 }else if(next!=="Mis colecciones")setPersonalFilter(null);setActionSongId(null);setSettingsOpen(false);setImmersive(false);detailHistoryRef.current=[];setTab(next);setDetail(null);setSongLibraryOpen(next==="Canciones"&&Boolean(options.search||options.liked||options.openLibrary));setCountLimit(80);setFolderType("");setFolderId("");setQuery(options.search||"");setTypeFilter("");setArtistTypeFilter("");setMedleyTypeFilter("");setCategoryId("");setSectionSearchOpen(Boolean(options.search));setOnlyLiked(Boolean(options.liked));}
 function openDetail(next){if(detail)detailHistoryRef.current.push(detail);setDetail(next);}
 function rememberRead(next){lastReadRef.current=next;setLastRead(next);setMetadata("last_read",JSON.stringify(next)).catch(()=>{});}
 function personalTotals(value){
  const groups=value?.collections||[];
  return {folders:groups.length,entries:groups.reduce((n,c)=>n+c.entries.length,0)};
 }
 function savePersonal(next,options={}){
  const prev=personalRef.current;
  personalRef.current=next;setPersonal(next);
  const payload=JSON.stringify(next);
  personalWriteRef.current=personalWriteRef.current.catch(()=>{}).then(()=>setMetadata(PERSONAL_KEY,payload));
  personalWriteRef.current.catch(err=>{
   if(personalRef.current===next){personalRef.current=prev;setPersonal(prev);}
   clearLocalNotice();
   Alert.alert("No se guardó la colección",(err?.message||"Revisa el espacio del teléfono.")+" Tus cantos oficiales no se modificaron.");
  });
  if(!options.quiet){
   const old=personalTotals(prev),current=personalTotals(next);
   const msg=options.notice||(current.folders>old.folders?"Colección creada":
    current.entries>old.entries?"Composición guardada":null);
   if(msg)showLocalNotice(msg,()=>savePersonal(prev,{quiet:true}));
  }
 }
 function saveProfile(next,options={}){
  const prev=profileRef.current;
  const clean=parseProfile(JSON.stringify(next));
  profileRef.current=clean;setProfile(clean);
  profileWriteRef.current=profileWriteRef.current.catch(()=>{}).then(()=>setMetadata(PROFILE_KEY,JSON.stringify(clean)));
  profileWriteRef.current.catch(e=>{
   if(profileRef.current===clean){profileRef.current=prev;setProfile(prev);}
   clearLocalNotice();
   Alert.alert("No se guardó el perfil",(e?.message||"Revisa el almacenamiento privado del teléfono."));
  });
  if(!options.quiet)showLocalNotice("Perfil guardado",()=>saveProfile(prev,{quiet:true}));
 }
 function openProfileMenu(){setProfileMenuOpen(true);}
 function setFavoritesLocal(next){
  const prev=likedRef.current;
  likedRef.current=next;setLikedIds(next);
  const payload=JSON.stringify(next);
  const write=likedWriteRef.current.catch(()=>{}).then(()=>setMetadata(FAVORITES_KEY,payload));
  likedWriteRef.current=write;
  write.catch(e=>{
   if(likedRef.current===next){likedRef.current=prev;setLikedIds(prev);}
   clearLocalNotice();
   Alert.alert("No se guardó Me gusta",(e?.message||"Revisa el almacenamiento del teléfono.")+" No se modificó el catálogo.");
  });
 }
 function toggleLike(songId){
  const prev=likedRef.current;
  const next=toggleFavorite(prev,songId);
  setFavoritesLocal(next);
  showLocalNotice(next.includes(String(songId))?"Agregado a Mis me gusta":"Quitado de Mis me gusta",
   ()=>setFavoritesLocal(prev));
 }
 const backupControllerRef=useRef(null);
 if(!backupControllerRef.current)backupControllerRef.current=createPersonalBackupController({
  waitForWrites:()=>Promise.all([likedWriteRef.current,personalWriteRef.current,profileWriteRef.current]),
  readCurrent:()=>({profile:profileRef.current,personal:personalRef.current,likedIds:likedRef.current,lastRead:lastReadRef.current}),
  exportFile:exportPersonalBackup,stagePhotos:stageRestoredPhotos,commitMetadata:setMetadataBatch,
  applyRestored:next=>{
   clearLocalNotice();
   personalRef.current=next.personal;profileRef.current=next.profile;
   likedRef.current=next.likedIds;
   setPersonal(next.personal);setProfile(next.profile);setLikedIds(next.likedIds);
   lastReadRef.current=next.lastRead;setLastRead(next.lastRead);
   showLocalNotice("Respaldo personal restaurado");
  }
 });
 const {exportBackup:exportMyPersonalBackup,restoreBackup:restoreMyPersonalBackup}=backupControllerRef.current;
 function selectSong(song){openDetail({type:"song",id:song.id,from:tab});rememberRead({type:"song",id:song.id});setTranspose(0);setCapo("none");setCapoExpanded(false);}
 function selectMedley(medley){openDetail({type:"medley",id:medley.id,from:tab});rememberRead({type:"medley",id:medley.id});setTranspose(0);}
 function selectRepertoire(rep){openDetail({type:"repertoire",id:rep.id,from:tab});setTranspose(0);}
 function back(){
  return handleBack({
   profileMenuOpen,actionSongId,immersiveActive,settingsOpen,detail,capoExpanded,
   tab,repertoireSearchOpen,sectionSearchOpen,homeSearch,folderId,folderType,songLibraryOpen,
   detailHistoryRef,tabHistoryRef,previousTabRef,nestedBackRef,model
  },{
   setProfileMenuOpen,setActionSongId,setImmersive,setSettingsOpen,setCapoExpanded,setDetail,setRepertoireSearchOpen,setQuery,
   setSectionSearchOpen,setHomeSearch,goTab,setFolderId,setFolderType,setSongLibraryOpen,setOnlyLiked,setTypeFilter
  });
 }
 useEffect(()=>{
  if(Platform.OS!=="android")return;
  const subscription=BackHandler.addEventListener("hardwareBackPress",back);
  return()=>subscription.remove();
 },[detail,tab,folderId,folderType,model,immersiveActive,settingsOpen,actionSongId,capoExpanded,personalFilter,profileMenuOpen,songLibraryOpen,repertoireSearchOpen,sectionSearchOpen,homeSearch]);
 function requestForm(kind="song",song=null) {
  setRequestSong(song);
  setRequestKind(kind);
  setRequestTitle(song?.title||"");
  setRequestArtist(names(song?._artists)||"");
  setRequestLink("");
  setRequestDetails("");
  previousTabRef.current=tab;
  setImmersive(false);
  detailHistoryRef.current=[];
  setTab("Solicitar");
  setDetail(null);
 }
 const updateNetwork=useCallback(async()=>{
  try {const n=await networkState();setNetwork(n);return n}
  catch(_){return {online:false,wifi:false}}
 },[]);
 const sync=useCallback(async(manual=false)=>{
  if(inFlight.current)return;
  if(!manual)autoRetryRef.current.lastAttempt=Date.now();
  inFlight.current=true;setBusy(true);setError("");setProgress("Comprobando conexión…");
  try{
   const result=await syncAll({wifiOnly:prefRef.current,manual,onProgress:p=>
    setProgress("Descargando "+p.index+"/"+p.total+" · "+p.table.replace(/_/g," "))});
   if(result.skipped){setProgress(result.reason);return}
   const saved=await getCatalog();
   lastRef.current=saved.syncedAt;autoRetryRef.current.failures=0;setCopy(saved);
   setProgress(saved.data.songs.length+" cantos y sus carpetas guardados en el teléfono.");
  }catch(e){
   if(!manual)autoRetryRef.current.failures=Math.min(autoRetryRef.current.failures+1,5);
   setError(e.message||"No se pudo descargar el cancionero.");
   setProgress("Si había una copia anterior, se conserva.");
  }finally{inFlight.current=false;setBusy(false)}
 },[]);
 const tryAuto=useCallback(async()=>{
  if(inFlight.current)return;
  const retry=autoRetryRef.current;
  if(retry.failures && Date.now()-retry.lastAttempt<20*60*1000*Math.pow(2,retry.failures))return;
  if(lastRef.current && Date.now()-new Date(lastRef.current).valueOf()<20*60*1000)return;
  const n=await networkState().catch(()=>({online:false,wifi:false}));
  if(n.online&&(!prefRef.current||n.wifi))await sync(false);
 },[sync]);
 async function manualSync(){
  const n=await updateNetwork();
  if(!n.online)return Alert.alert("Sin internet","Puedes seguir leyendo los cantos que ya descargaste.");
  if(prefRef.current&&!n.wifi){
   return Alert.alert("No se detecta Wi-Fi","¿Deseas actualizar utilizando esta conexión?",[
    {text:"Cancelar",style:"cancel"},{text:"Descargar",onPress:()=>sync(true)}]);
  }
  await sync(true);
 }
 async function changeWifi(enabled) {
  prefRef.current=enabled;setWifiOnly(enabled);
  try{await setMetadata("wifi_only",enabled?"true":"false")}
  catch(e){setError("No fue posible guardar la preferencia: "+e.message)}
 }
 useEffect(()=>{
  let enabled=true;
  (async()=>{
   try{
    const [snapshot,n,prefs]=await Promise.all([
     getCatalog(),networkState(),getMetadataBatch({wifi_only:"true",last_read:"",[FAVORITES_KEY]:"[]",[PERSONAL_KEY]:"",[PROFILE_KEY]:""})
    ]);
    const pref=prefs.wifi_only,last=prefs.last_read,likedRaw=prefs[FAVORITES_KEY],personalRaw=prefs[PERSONAL_KEY],profileRaw=prefs[PROFILE_KEY];
    if(!enabled)return;
    lastRef.current=snapshot.syncedAt;prefRef.current=pref!=="false";
    setCopy(snapshot);setWifiOnly(pref!=="false");setNetwork(n);
    likedRef.current=parseFavorites(likedRaw);setLikedIds(likedRef.current);
    const savedPersonal=parseStore(personalRaw),savedProfile=parseProfile(profileRaw);
    personalRef.current=savedPersonal;profileRef.current=savedProfile;
    setPersonal(savedPersonal);setProfile(savedProfile);
    if(last){try{setLastRead(JSON.parse(last))}catch(_){}}setLoaded(true);
    if(!snapshot.syncedAt && n.online && n.wifi) sync(false);
   }catch(e){if(enabled){setLoaded(true);setError("No se pudo abrir la biblioteca local: "+e.message)}}
  })();
  const unsubscribe=NetInfo.addEventListener(s=>{
   if(!enabled)return;
   const online=Boolean(s.isConnected&&s.isInternetReachable!==false);
   setNetwork({online,wifi:s.type==="wifi"});
   if(online&&s.type==="wifi")tryAuto();
  });
  const listener=AppState.addEventListener("change",state=>{
   if(state==="active") {updateNetwork();tryAuto();}
  });
  return()=>{enabled=false;unsubscribe();listener.remove()};
 },[tryAuto,updateNetwork]);
 async function submitRequest(){
  if(sending)return;
  const n=await updateNetwork();
  if(!n.online)return Alert.alert("Requiere internet","Conéctate a Wi-Fi o datos móviles para enviar tu solicitud.");
  setSending(true);
  try{
   await sendRequest({kind:requestKind,song:requestSong,title:requestTitle,artist:requestArtist,
    reference:requestLink,details:requestDetails,name:requestName,email:requestEmail});
   Alert.alert("Solicitud enviada","El administrador de SHALOM podrá revisarla.");
   setRequestDetails("");setRequestSong(null);setRequestTitle("");
   goTab("Inicio");
  }catch(e){Alert.alert("No se pudo enviar",e.message||"Inténtalo de nuevo.")}
  finally{setSending(false)}
 }
 function title(text,sub){return h(View,{style:S.sectionHeading},label(text,S.title),sub?label(sub,S.info):null)}
 function previewSongs(songs,limit=countLimit) {
  if(!songs.length)return label(copy?.syncedAt?"Todavía no hay cantos en esta sección.":"Biblioteca pendiente de descarga. Abre Inicio y toca Descargar cancionero.",S.empty);
  return h(View,{style:S.list},
   ...songs.slice(0,limit).map(song=>h(SongRow,{key:song.id,song,onPress:()=>selectSong(song)})),
   songs.length>limit?h(Btn,{text:"Mostrar más cantos",secondary:true,onPress:()=>setCountLimit(v=>v+80)}):null);
 }
 function renderSettings(){
  return h(SettingsScreen,{S,C,title,label,Card,Btn,copy,model,wifiOnly,changeWifi,busy,manualSync,progress,error,goTab,openWeb});
 }
 function renderHome(){
  const term=normalize(homeSearch.trim());
  const found=homeMatches;
  const recent=lastRead?.type==="song"?model.songs.find(song=>song.id===lastRead.id):null;
  function goBanner(){
   switch(profile.bannerAction){
    case "repertorios":return goTab("Repertorios");
    case "favoritos":return goTab("Canciones",{liked:true});
    case "popurris":return goTab("Mis colecciones",{personalKind:"popurri"});
    case "recientes":return recent?selectSong(recent):goTab("Canciones");
    default:return goTab("Canciones");
   }
  }
  const counts=personalCounts(personal,likedIds);
  const official=officialHighlights(model,new Date());
  const shortcuts=[
   ["heart","Mis me gusta","Cantos favoritos",counts.likes,()=>goTab("Canciones",{liked:true})],
   ["medleys","Mis popurrís","Cantos enlazados",counts.medleys,()=>goTab("Mis colecciones",{personalKind:"popurri"})],
   ["mass","Mis misas","Celebraciones guardadas",counts.masses,()=>goTab("Mis colecciones",{personalKind:"misa"})],
   ["repertoires","Mis repertorios","Ensayos y selecciones",Math.max(0,counts.creations-counts.medleys-counts.masses),()=>goTab("Mis colecciones",{personalKind:"repertorio"})]
  ];
  return h(View,{style:S.homeContainer},
   h(View,{style:S.spotifyWelcome},
    label("Bienvenido a SHALOM",S.spotifyWelcomeTitle),
    label("Tu música para celebrar y ensayar.",S.spotifyWelcomeText)),
   h(View,{style:S.shalomToday},
    h(View,{style:S.shalomTodayHeader},
     h(View,{style:S.todayTitleWrap},
      label("▦",S.todayTitleIcon),label("Hoy en SHALOM",S.shalomTodayHeading)),
     h(Pressable,{onPress:manualSync,disabled:busy,style:S.shalomTodayRefresh,
      accessibilityRole:"button",accessibilityLabel:"Actualizar publicaciones del coro"},
      label(busy?"…":"↻",S.shalomTodayRefreshIcon))),
    
    ...official.map((item,index)=>h(Pressable,{key:item.type+"-"+item.id,
     style:[S.shalomTodayCard,index>0&&S.todayEntryDivider],onPress:()=>{
      if(item.type==="medley"){
       const medley=model.medleys.find(x=>String(x.id)===item.id);
       if(medley)selectMedley(medley);
      }else{
       const rep=model.repertoires.find(x=>String(x.id)===item.id);
       if(rep)selectRepertoire(rep);
      }
     },accessibilityRole:"button",accessibilityLabel:"Abrir "+item.label+": "+item.title},
     h(View,{style:S.todayEntryBody},
      h(Text,{style:S.shalomTodayTitle,numberOfLines:2},item.title),
      h(Text,{style:S.shalomTodayMeta,numberOfLines:2},
       [item.label,item.count+" "+(item.count===1?"canto":"cantos"),item.subtitle]
        .filter(Boolean).join(" · "))),
     label("›",S.shalomTodayArrow))),
    !official.length?h(View,{style:S.shalomTodayEmpty},
     label(copy?.syncedAt?
      "Aquí aparecerán las misas, repertorios y popurrís que publique el coro.":
      "Descarga el cancionero para ver las publicaciones oficiales de SHALOM.",S.shalomTodayEmptyText),
     label("Publicaciones oficiales",S.todayFootnote),
     !copy?.syncedAt?h(Btn,{text:"Descargar biblioteca",onPress:manualSync,
      disabled:busy,small:true}):null):null),
   h(View,{style:S.homeSearchWrap},
    label("⌕",S.homeSearchIcon),
    h(TextInput,{style:S.homeSearch,value:homeSearch,onChangeText:setHomeSearch,
     placeholder:"Buscar canto, artista o tema…",placeholderTextColor:C.muted,
     accessibilityLabel:"Buscar canto, artista o tema",returnKeyType:"search",
     onSubmitEditing:()=>{if(homeSearch.trim())goTab("Canciones",{search:homeSearch})}})),
   term?h(View,{style:S.homeResults},
    ...found.map(song=>h(SongRow,{key:song.id,song,onPress:()=>selectSong(song)})),
    !found.length?label("No se encontraron cantos.",S.empty):null,
    h(Btn,{text:"Ver todos los resultados",secondary:true,onPress:()=>goTab("Canciones",{search:homeSearch})})):null,
   h(View,{style:S.spotifyBlock},
    label("Continuar donde te quedaste",S.spotifyHeading),
    h(Pressable,{style:S.homeRecentCard,onPress:()=>recent?selectSong(recent):goTab("Canciones"),
     accessibilityRole:"button",accessibilityLabel:recent?"Continuar con "+recent.title:"Explorar cantos"},
     h(View,{style:{flex:1,minWidth:0}},
      h(Text,{style:S.homeRecentTitle,numberOfLines:1},
       recent?recent.title:"Abre un canto para comenzar"),
      recent?h(Text,{style:S.homeRecentSubtitle,numberOfLines:1},
       names(recent._artists)||"Último canto consultado"):null),
     label("›",S.homeRecentArrow))),
   h(View,{style:S.spotifyBlock},label("Tus accesos",S.spotifyHeading)),
   h(View,{style:S.spotifyShortcuts},...shortcuts.map(([icon,name,subtitle,count,onPress])=>
    h(Pressable,{key:name,onPress,accessibilityRole:"button",
     accessibilityLabel:name+": "+count,style:S.spotifyShortcut},
     h(View,{style:S.spotifyShortcutTop},
      h(View,{style:S.spotifyShortcutSymbolBox},
       icon==="heart"?label("♥",S.spotifyShortcutIcon):
       h(Image,{source:HOME_IMAGES[icon],resizeMode:"contain",style:S.spotifyShortcutImage})),
      h(View,{style:S.spotifyShortcutCount},label(count,S.spotifyShortcutCountText))),
     h(View,{style:S.spotifyShortcutText},
      label(name,S.spotifyShortcutName),
      label(subtitle,S.spotifyShortcutSubtitle))))),
   h(Pressable,{style:S.spotifyBannerMini,onPress:goBanner,accessibilityRole:"button",
    accessibilityLabel:"Destacado: "+(profile.bannerTitle||"Explorar cantos")},
    h(View,{style:S.spotifyBannerMiniCover},
     h(CoverArt,{preset:profile.bannerPreset,photo:profile.banner||profile.cover,
      color:C.green,height:53})),
    h(View,{style:{flex:1,minWidth:0}},
     label("DESTACADO DE TU PERFIL",S.spotifyBannerEyebrow),
     h(Text,{style:S.spotifyBannerMiniTitle,numberOfLines:1},profile.bannerTitle||"Cantos de SHALOM")),
    label("›",S.homeRecentArrow)),
   h(View,{style:S.spotifyBlock},
    label("Descubre más en SHALOM",S.spotifyHeading),
    h(View,{style:S.homeGrid},...[
     ["Explorar","Artistas, álbumes y categorías","categories","Explorar"],
     ["Popurrís oficiales","Cantos unidos por SHALOM","medleys","Popurrís"],
     ["Álbumes","Colecciones oficiales","albums","Álbumes"],
     ["Más opciones","Solicitudes y ajustes","more","Más"]
    ].map(([name,subtitle,icon,destination])=>h(Pressable,{
     key:name,onPress:()=>goTab(destination),style:S.homeTile,accessibilityRole:"button"},
     h(View,{style:S.homeTileIcon},
      h(Image,{source:HOME_IMAGES[icon],style:S.homeTileImage,resizeMode:"contain"})),
     h(View,{style:{flex:1,minWidth:0}},label(name,S.homeTileName),label(subtitle,S.homeTileSubtitle)))))),

   !copy?.syncedAt?h(Pressable,{style:S.homeNeedsSync,onPress:()=>setSettingsOpen(true),accessibilityRole:"button"},
    label("↓ Descargar cancionero sin conexión  ›",S.homeSyncText)):null,
   busy?label("Sincronizando… "+progress,S.info):null,error?label(error,S.error):null);
 }
 function renderSongs(){
  const chosen=onlyLiked?"liked":typeFilter||"all";
  const options=[["all","Todos"],["catolico","Católicos"],
   ["cristiano","Cristianos"],["liked","Mis me gusta"]];
  const selectLibraryFilter=value=>{
   setOnlyLiked(value==="liked");
   setTypeFilter(value==="all"||value==="liked"?"":value);
   setCountLimit(80);
   setSongLibraryOpen(true);
  };
  const searchValue=h(View,{style:S.cantosSearch},
   label("⌕",S.cantosSearchIcon),
   h(TextInput,{value:query,onChangeText:value=>{setQuery(value);setCountLimit(80);},
    style:S.cantosSearchInput,placeholder:"Buscar letras, acordes y títulos",
    placeholderTextColor:C.muted,returnKeyType:"search",autoCorrect:false,
    accessibilityLabel:"Buscar letras, acordes y títulos",
    onSubmitEditing:()=>setSongLibraryOpen(true)}));
  return h(View,{style:S.cantosPage},
   songLibraryOpen?h(Pressable,{onPress:()=>{setSongLibraryOpen(false);setQuery("");setTypeFilter("");setOnlyLiked(false);},
    style:S.cantosBack,accessibilityRole:"button",accessibilityLabel:"Volver a la portada de Cantos"},
    label("‹  Cantos",S.cantosBackText)):null,
   label(songLibraryOpen?"Biblioteca de cantos":"Cantos",S.cantosPageTitle),
   searchValue,
   h(View,{style:S.cantosFilterRow},
    ...options.map(([value,name])=>h(Pressable,{key:value,
     style:[S.cantosFilterChip,value===chosen&&S.cantosFilterSelected],
     accessibilityRole:"button",accessibilityLabel:"Filtrar cantos: "+name,
     accessibilityState:{selected:value===chosen},onPress:()=>selectLibraryFilter(value)},
     label(name,[S.cantosFilterText,value===chosen&&S.cantosFilterTextSelected])))),
   !songLibraryOpen?h(View,{style:S.cantosOverviewContent},
    h(Pressable,{style:S.cantosLibraryCard,onPress:()=>setSongLibraryOpen(true),
     accessibilityRole:"button",accessibilityLabel:"Abrir Biblioteca de cantos"},
     h(View,{style:{flex:1,minWidth:0}},
      label("Biblioteca de cantos",S.cantosLibraryTitle),
      label("Listado de canciones disponibles con su artista y opciones.",S.cantosLibraryDescription)),
     label("♫",S.cantosLibraryIcon)),
    h(View,{style:S.cantosExploreSection},
     label("Explorar también por",S.cantosExploreHeading),
     h(View,{style:S.cantosExploreGrid},
      ...[["Artistas","Artistas"],["Categorías","Categorías"],["Álbumes","Álbumes"],
       ["Popurrís oficiales","Popurrís"]].map(([name,dest])=>
       h(Pressable,{key:name,onPress:()=>goTab(dest),style:S.cantosExploreTile,
        accessibilityRole:"button",accessibilityLabel:"Explorar "+name},
        label(name,S.cantosExploreTileText))))),
    !copy?.syncedAt?h(View,{style:S.cantosOfflinePrompt},
     label("Descarga el cancionero para consultar todos los cantos sin conexión.",S.librarySubtitle),
     h(Btn,{text:busy?"Descargando…":"Descargar biblioteca",onPress:manualSync,disabled:busy})):null
   ):h(View,{style:S.cantosLibraryResults},
    h(View,{style:S.libraryTitleRow},
     label(onlyLiked?"Mis me gusta":typeFilter==="catolico"?"Cantos católicos":
      typeFilter==="cristiano"?"Cantos cristianos":"Todos los cantos",S.librarySectionTitle),
     label(eligible.length+" "+(eligible.length===1?"canto":"cantos"),S.libraryCount)),
    h(View,{style:S.libraryList},
     ...eligible.slice(0,countLimit).map(song=>h(LibrarySongRow,{key:song.id,song,
      artistName:names(song._artists)||type(song.song_type),tone:song.tone,
      liked:likedSet.has(String(song.id)),onOpen:()=>selectSong(song),
      onLike:()=>toggleLike(song.id),onOptions:()=>setActionSongId(String(song.id))})),
     eligible.length>countLimit?h(Btn,{text:"Mostrar más cantos",secondary:true,
      onPress:()=>setCountLimit(v=>v+80)}):null,
     !eligible.length?h(SectionEmpty,{message:copy?.syncedAt?
      "No hay cantos que coincidan con tu búsqueda.":"Descarga la biblioteca para ver los cantos."}):null),
    !copy?.syncedAt?h(Btn,{text:"Descargar cancionero",onPress:manualSync,disabled:busy}):null));
 }
 function renderArtists(){
  const filtered=filteredArtists;
  return h(View,{style:S.repPage},
   h(LibraryHero,{title:"Artistas",
    subtitle:"Coros, ministerios y cantores de alabanza.",preset:"choir"}),
   h(LibrarySearch,{value:query,onChangeText:v=>{setQuery(v);setCountLimit(80)},
    placeholder:"Buscar artistas o ministerios…",showFilters:libraryFiltersVisible,
    onFilters:()=>setLibraryFiltersVisible(v=>!v)}),
   libraryFiltersVisible?h(LibraryChipRow,{options:SONG_TYPES,value:artistTypeFilter,
    onChange:val=>{setArtistTypeFilter(val);setCountLimit(80)}}):null,
   h(View,{style:S.libraryTitleRow},
    label("Nuestros artistas",S.librarySectionTitle),
    label(filtered.length+" "+(filtered.length===1?"artista":"artistas"),S.libraryCount)),
   h(View,{style:S.artistGrid},
    ...filtered.slice(0,countLimit).map(a=>{
     const count=model.songsForArtist(a.id).length;
     return h(LibraryArtistCard,{key:a.id,artist:a,count,type:type(a.artist_type),
      onOpen:()=>openDetail({type:"artist",id:a.id})});
    })),
   filtered.length>countLimit?h(Btn,{text:"Mostrar más artistas",secondary:true,
    onPress:()=>setCountLimit(v=>v+80)}):null,
   !filtered.length?h(SectionEmpty,{message:"No hay artistas que coincidan con tu búsqueda."}):null);
 }
 function renderCategories(){
  const current=model.categoryMap.get(folderId);
  const typeChoices=[["","Todas",null],["catolico","Católico",null],
   ["cristiano","Cristiano",null],["mixto","Mixto",null],["general","General",null]];
  const term=normalize(query.trim());
  const countFolders=code=>model.categories.filter(c=>(normalize(c.song_type)||"general")===code).length;
  const typeNames={catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto",general:"General"};
  const rootTypes=["catolico","cristiano","mixto","general"];
  const allMatches=model.categories.filter(c=>
   matchesSearch([c.name,c.description],query)&&
   (!folderType||(normalize(c.song_type)||"general")===folderType));
  const children=current?model.children(current.id):model.children("",folderType);
  const visibleChildren=term?children.filter(c=>matchesSearch([c.name,c.description],query)):children;
  const songs=current?model.songsForCategory(current.id):[];
  const visibleSongs=term?songs.filter(song=>matchesSearch([song.title,names(song._artists)],query)):songs;
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Categorías",subtitle:"Explora por tema o celebración",icon:"categories"}),
   h(SectionFilterBar,{options:typeChoices,value:folderType,
    onChange:val=>{setFolderType(val);setFolderId("");setQuery("")}}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,placeholder:"Buscar carpetas o temas…"}):null,
   current?h(View,{style:S.categoryPath},
    h(Pressable,{onPress:()=>setFolderId(""),accessibilityRole:"button",
     accessibilityLabel:"Volver a categorías principales",style:S.categoryBack},
     label("‹  "+(typeNames[folderType]||"Categorías"),S.categoryBackText)),
    label(model.categoryPath(current),S.categoryPathText)):null,
   h(View,{style:S.repCards},
    ...(!folderType&&!term?rootTypes.map(code=>h(SectionListCard,{key:code,
     title:typeNames[code],subtitle:countFolders(code)+" "+(countFolders(code)===1?"carpeta":"carpetas"),
     icon:"categories",onPress:()=>{setFolderType(code);setFolderId("");setQuery("")}})):[]),
    ...(!folderType&&term?allMatches.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:(typeNames[normalize(c.song_type)]||"General")+" · "+
      model.songsForCategory(c.id).length+" cantos",icon:"categories",
     onPress:()=>{setFolderType(normalize(c.song_type)||"general");setFolderId(c.id);setQuery("")}})):[]),
    ...(folderType?visibleChildren.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:model.songsForCategory(c.id).length+" cantos · "+
      model.children(c.id).length+" subcarpetas",icon:"categories",
     onPress:()=>{setFolderId(c.id);setQuery("")}})):[]),
    current?h(View,{style:S.categorySongHeading},
     label("Cantos de "+current.name,S.categorySongTitle),
     label(visibleSongs.length+" cantos",S.sectionSupporting)):null,
    ...(current?visibleSongs.map(song=>h(SectionListCard,{key:song.id,title:song.title,
     subtitle:names(song._artists)||type(song.song_type),meta:song.tone?"Tono "+song.tone:null,
     icon:"song",onPress:()=>selectSong(song)})):[]),
    ((folderType&&!visibleChildren.length&&!current)||
     (term&&!allMatches.length&&!folderType)||
     (current&&!visibleChildren.length&&!visibleSongs.length))
     ?h(SectionEmpty,{message:"No se encontraron categorías o cantos en esta sección."}):null)
  );
 }
 function renderMore(){
  return h(MoreScreen,{S,SectionHero,SectionListCard,goTab,requestForm,setSettingsOpen,openWeb});
 }

 function renderExplore(){
  return h(ExploreScreen,{S,SectionHero,SectionListCard,goTab});
 }

 function renderRepertoires(){
  const sections=[
   ["todos","Todos",null],
   ["misa","Misa","mass"],
   ["ensayo","Ensayo","artists"],
   ["otras","Otras","calendar"]
  ];
  const visible=filterRepertoires(model.repertoires,repertoireFilter,query);
  return h(View,{style:S.repPage},
   h(View,{style:S.repHeading},
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.repTitle,numberOfLines:1,adjustsFontSizeToFit:true,minimumFontScale:.8},"Repertorios"),
     label("Publicados por SHALOM · Misas, ensayos y celebraciones",S.repSubtitle))),
   h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
    contentContainerStyle:S.repFilters},
    ...sections.map(([code,name,icon])=>{
     const active=repertoireFilter===code;
     return h(Pressable,{key:code,accessibilityRole:"button",accessibilityLabel:"Filtrar: "+name,
      accessibilityState:{selected:active},onPress:()=>setRepertoireFilter(code),
      style:[S.repFilterChip,active&&S.repFilterActive]},
      icon?h(Image,{source:HOME_IMAGES[icon],resizeMode:"contain",
       style:[S.repFilterIcon,{tintColor:active?"#05271d":C.text}]}):null,
      label(name,[S.repFilterText,active&&S.repFilterTextActive]));
    })),
   repertoireSearchOpen?h(TextInput,{style:S.repSearchInput,value:query,onChangeText:setQuery,
    placeholder:"Buscar por repertorio, fecha o lugar…",placeholderTextColor:C.muted,
    accessibilityLabel:"Buscar repertorios",autoCorrect:false}):null,
   h(View,{style:S.repCards},
    ...visible.map(rep=>{
     const count=Array.isArray(rep.items)?rep.items.length:0;
     return h(Pressable,{key:rep.id,onPress:()=>selectRepertoire(rep),
      accessibilityRole:"button",accessibilityLabel:(rep.title||"Repertorio")+", "+count+" cantos",
      style:S.repCard},
      h(InitialCover,{title:rep.title||"Repertorio",size:53}),
      h(View,{style:{flex:1,minWidth:0}},
       h(Text,{style:S.repCardTitle,numberOfLines:2},rep.title||"Repertorio sin título"),
       label(count+" "+(count===1?"canto":"cantos"),S.repCardCount),
       (rep.event_date||rep.location)?h(Text,{style:S.repCardMeta,numberOfLines:1},
        [rep.event_date,rep.location].filter(Boolean).join(" · ")):null),
      label("›",S.repArrow));
    }),
    !visible.length?h(View,{style:S.repEmptyCard},
     h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repEmptyLogo}),
     label(!copy?.syncedAt?"Todavía no hay repertorios descargados. Actualiza el cancionero desde Ajustes.":"No hay repertorios que coincidan con esta selección.",S.repEmptyText)):null
   ),
   h(Pressable,{style:S.repSuggest,onPress:()=>{
     requestForm("other");setRequestTitle("Sugerencia de repertorio");
    },accessibilityRole:"button",accessibilityLabel:"Sugerir un repertorio al administrador"},
    label("＋",S.repSuggestIcon),
    label("Sugerir un repertorio",S.repSuggestCaption),
    label("›",S.homeRecentArrow))
  );
 }
 async function shareMultiReading(){
  const medley=detail?.type==="medley"?focusedMedley:null;
  const rep=detail?.type==="repertoire"?focusedRepertoire:null;
  const item=medley||rep;
  if(!item)return;
  const lines=medley?(medley.parts||[]).map((p,i)=>
   (i+1)+". "+(p.title||p.song_title||"Fragmento")):
   (rep.items||[]).map((p,i)=>{
    const song=model.songs.find(s=>String(s.id)===String(p.song_id));
    return (i+1)+". "+(p.moment||"Canto")+" — "+(song?.title||"Canto");
   });
  try{
   await Share.share({title:item.title||"SHALOM",message:(item.title||"SHALOM")+
    "\n"+lines.join("\n")+"\nCoro SHALOM"});
  }catch(e){
   Alert.alert("No se pudo compartir",e?.message||"Inténtalo de nuevo.");
  }
 }
 function renderMultiReadingControls(){
  return h(View,{style:S.multiControlArea},
   h(View,{style:S.songControls},
    renderToneStepper(transpose===0?"Original":(transpose>0?"+":"")+transpose+" semitonos"),
    h(View,{style:S.songFontControl},
     h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v-1)),
      accessibilityRole:"button",accessibilityLabel:"Reducir letras",style:S.songFontButton},
      label("A−",S.songFontText)),
     h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v+1)),
      accessibilityRole:"button",accessibilityLabel:"Aumentar letras",style:S.songFontButton},
      label("A+",S.songFontText)))),
   h(View,{style:S.multiControlFooter},
    h(Pressable,{onPress:resetTone,accessibilityRole:"button",
     accessibilityLabel:"Restablecer transposición",style:S.multiTextAction},
     label("Restablecer tono",S.multiTextActionLabel)),
    Platform.OS==="android"?h(Pressable,{onPress:()=>setImmersive(v=>!v),
     accessibilityRole:"button",accessibilityLabel:immersiveActive?"Salir de pantalla completa":"Pantalla completa",
     style:S.multiTextAction},label(immersiveActive?"Salir de pantalla completa":"⛶ Pantalla completa",S.multiTextActionLabel)):null));
 }
 // Todos los lectores usan una sola cuadrícula de texto monoespaciado:
 // en un único Text padre, los acordes mantienen sus columnas al cambiar dispositivo.
 function renderAlignedScoreRows(rows,fontSize,keyPrefix){
  return h(AlignedScore,{rows,fontSize,variant:keyPrefix,
    onFontSizeChange:next=>setReaderFont(clampReaderFont(next))});
 }
  function renderMultiReadingScore(lyrics,delta,keyPrefix,fontOverride=readerFont){
  const parsed=parseSong(lyrics,delta);
  return renderAlignedScoreRows(parsed,fontOverride,keyPrefix);
 }
 function openStudioCollection(plan,index=0){
  const selection=startStudioQueue(plan,index);
  if(!selection)return;
  setStudioQueue(selection.queue);setStudioPayload(selection.payload);
 }
 function openStudioPart(song,part){
  const result=StudioCollections.resolve(song,part);
  if(result.ready){setStudioQueue(null);setStudioPayload(result.payload);}
 }
 function closeStudio(){setStudioPayload(null);setStudioQueue(null);}
 function nextStudio(delta){
  const selection=advanceStudioQueue(studioQueue,delta);
  if(selection){setStudioQueue(selection.queue);setStudioPayload(selection.payload);}
 }
 function renderStudioCollectionAction(plan,caption){
  if(!plan.ready.length)return null;
  return h(View,{style:{paddingVertical:8}},h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>openStudioCollection(plan)},
   label("♫ "+caption+" · "+plan.ready.length+"/"+plan.total,S.multiOriginalText)));
 }
 function renderRepertoireDetail(rep){
  const items=Array.isArray(rep.items)?rep.items:[];
  const kind=repertoireType(rep);
  const plan=StudioCollections.plan(items.map(item=>({...item,shift:transpose})),model.songs);
  return h(View,{style:S.multiReader},
   h(View,{style:S.songMetaRow},
    h(View,{style:S.songMetaIcon},h(Image,{source:HOME_IMAGES[kind==="misa"?"mass":"repertoires"],
     resizeMode:"contain",style:S.songMetaIconImage})),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.songHeading},rep.title||"Repertorio"),
     label(items.length+" "+(items.length===1?"canto":"cantos")+
      (rep.event_date?" · "+rep.event_date:""),S.songArtist),
     h(View,{style:S.songTypeBadge},
      label(kind==="misa"?"Misa":kind==="ensayo"?"Ensayo":"Repertorio",S.songTypeText)))),
   (rep.location||rep.notes)?h(Text,{style:S.multiDescription},[rep.location,rep.notes].filter(Boolean).join(" · ")):null,
   renderMultiReadingControls(),
   !immersiveActive&&kind!=="misa"?renderStudioCollectionAction(plan,"Ensayar con guitarra"):null,
   ...items.map((item,index)=>{
    const song=model.songs.find(s=>String(s.id)===String(item.song_id));
    const title=String(song?.title||item.song_title||"Canto no disponible");
    const moment=String(item.moment||"Canto "+(index+1));
    const tone=song?.tone?transposeOne(song.tone,transpose):"";
    return h(View,{key:item.id||index,style:[S.multiPart,index>0&&S.multiPartDivider]},
     h(View,{style:S.multiPartHeading},
      h(View,{style:S.multiPartNumber},label(String(index+1),S.multiPartNumberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(View,{style:S.multiMomentPill},label(moment,S.multiMomentText)),
       h(Text,{style:S.multiPartTitle},title),
       tone?label("Tono "+tone,S.multiPartDetail):null)),
     item.notes?h(Text,{style:S.multiPartNote},item.notes):null,
     renderMultiReadingScore(song?.lyrics||"Canto no disponible.",transpose,"rep-"+index),
     !immersiveActive&&plan.entries[index]?.ready?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>openStudioPart(song,{shift:transpose})},label("♫ Practicar con guitarra",S.multiOriginalText)):null,
     song?h(Pressable,{onPress:()=>selectSong(song),accessibilityRole:"button",
       accessibilityLabel:"Abrir "+title+" como canto individual",style:S.multiOriginalLink},
       label("Ver canto individual  ›",S.multiOriginalText)):null
    );
   }),
   !items.length?h(SectionEmpty,{message:"Este repertorio todavía no tiene cantos."}):null
  );
 }
 function renderMedleys(){
  const filtered=model.medleys.filter(m=>
   (!medleyTypeFilter||normalize(type(m.song_type))===medleyTypeFilter)
   &&matchesSearch([m.title,m.description,m.song_type],query));
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Popurrís",subtitle:"Varios cantos unidos en una sola lectura",icon:"medleys"}),
   h(SectionFilterBar,{options:SONG_TYPES.map(([code,name])=>[code,name,null]),
    value:medleyTypeFilter,onChange:setMedleyTypeFilter}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,
    placeholder:"Buscar popurrí o celebración…"}):null,
   label(filtered.length+" "+(filtered.length===1?"popurrí":"popurrís"),S.sectionResults),
   h(View,{style:S.repCards},
    ...filtered.map(m=>{
     const fragments=Array.isArray(m.parts)?m.parts.length:0;
     return h(SectionListCard,{key:m.id,title:m.title||"Popurrí",
      subtitle:fragments+" "+(fragments===1?"fragmento":"fragmentos")+" · "+type(m.song_type),
      icon:"medleys",onPress:()=>selectMedley(m)});
    }),
    !filtered.length?h(SectionEmpty,{message:copy?.syncedAt?
     "Todavía no hay popurrís publicados con estos filtros.":
     "Actualiza el cancionero para consultar los popurrís."}):null)
  );
 }
 function renderMedleyDetail(medley){
  const parts=Array.isArray(medley.parts)?medley.parts:[];
  const generalTone=String(medley.base_tone||"");
  const practiceParts=parts.map(part=>({...part,shift:transpose+Number(part.shift||0)}));
  const plan=StudioCollections.plan(practiceParts,model.songs);
  const sequence=StudioCollections.sequencePlan(practiceParts,model.songs,medley.title);
  return h(View,{style:S.multiReader},
   h(View,{style:S.songMetaRow},
    h(View,{style:S.songMetaIcon},
     h(Image,{source:HOME_IMAGES.medleys,resizeMode:"contain",style:S.songMetaIconImage})),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.songHeading},medley.title||"Popurrí"),
     label(parts.length+" "+(parts.length===1?"fragmento":"fragmentos")+
      (generalTone?" · Tono "+transposeOne(generalTone,transpose):""),S.songArtist),
     h(View,{style:S.songTypeBadge},label(type(medley.song_type),S.songTypeText)))),
   medley.description?h(Text,{style:S.multiDescription},medley.description):null,
   renderMultiReadingControls(),
   !immersiveActive&&sequence?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>{setStudioQueue(null);setStudioPayload(sequence)}},label("▶ Practicar popurrí completo",S.multiOriginalText)):null,
   !immersiveActive?renderStudioCollectionAction(plan,"Practicar fragmentos disponibles"):null,
   ...parts.map((part,index)=>{
    const original=model.songs.find(song=>String(song.id)===String(part.song_id));
    const fragmentTitle=part.title||part.song_title||original?.title||"Canto "+(index+1);
    const shift=Number(part.shift||0);
    const delta=transpose+(Number.isFinite(shift)?shift:0);
    const tone=part.tone||original?.tone||"";
    const capoPosition=Number(part.capo_position||original?.capo_position||0);
    const capoKey=String(part.capo_key||original?.capo_key||"").trim();
    const otherCapos=(original?._capos||[]).filter(v=>Number(v.capo_position)>0);
    const tutorials=[
     ...(original?._links||[]).map(x=>({title:x.title||"Video",url:x.url})),
     {title:"Tutorial guitarra",url:original?.tutorial_guitar},
     {title:"Tutorial piano",url:original?.tutorial_piano}
    ].filter(x=>safeWebUrl(x.url));
    return h(View,{key:part.id||index,style:[S.multiPart,index>0&&S.multiPartDivider]},
     h(View,{style:S.multiPartHeading},
      h(View,{style:S.multiPartNumber},label(String(index+1),S.multiPartNumberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(Text,{style:S.multiPartTitle},fragmentTitle),
       tone?label("Tono "+transposeOne(tone,delta),S.multiPartDetail):null,
       capoPosition>0?label("Capo: traste "+capoPosition+
        (capoKey?" · Figuras en "+capoKey:""),S.multiPartCapo):null,
       otherCapos.length?label("Otros capos: "+otherCapos.map(c=>"traste "+c.capo_position+
        (c.capo_key?" · "+c.capo_key:"")).join(" / "),S.multiPartCapo):null)),
     renderMultiReadingScore(part.lyrics||original?.lyrics||"Sin letra guardada.",delta,"medley-"+index),
     h(View,{style:S.multiQuickLinks},
      !immersiveActive&&plan.entries[index]?.ready?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>{setStudioQueue(null);setStudioPayload(plan.entries[index].payload)}},label("♫ Practicar fragmento",S.multiOriginalText)):null,
      original?h(Pressable,{onPress:()=>selectSong(original),accessibilityRole:"button",
       accessibilityLabel:"Abrir "+original.title+" como canto individual",style:S.multiOriginalLink},
       label("Ver canto original  ›",S.multiOriginalText)):null,
      ...tutorials.map((x,i)=>h(Pressable,{key:"video-"+i,onPress:()=>openWeb(x.url),
       accessibilityRole:"button",accessibilityLabel:"Abrir "+x.title,style:S.multiOriginalLink},
       label("▶ "+x.title,S.multiOriginalText))))
    );
   }),
   !parts.length?h(SectionEmpty,{message:"Este popurrí todavía no tiene fragmentos."}):null
  );
 }
 function renderAlbums(){
  return h(AlbumsScreen,{S,SectionHero,SectionListCard,SectionSearch,SectionEmpty,label,model,query,sectionSearchOpen,setQuery,openDetail});
 }

 function renderArtistDetail(a){
  const songs=model.songsForArtist(a.id);
  const urls=[["YouTube",a.youtube_url],["Spotify",a.spotify_url],
   ["Instagram",a.instagram_url],["Facebook",a.facebook_url]].filter(x=>safeWebUrl(x[1]));
  return h(View,null,
   h(View,{style:S.profileHeader},
    h(Photo,{url:network.online?a.avatar_url:null,labelText:a.name}),
    h(View,{style:{flex:1}},label(a.name,S.readerTitle),label(type(a.artist_type),S.eyebrow))),
   a.description||a.bio?label(a.bio||a.description,S.description):null,
   urls.length?title("Redes y tutoriales"):null,
   h(View,{style:S.rowWrap},...urls.map(([name,url])=>h(Btn,{key:name,text:name+" ↗",small:true,secondary:true,onPress:()=>openWeb(url)}))),
   title("Cantos de "+a.name,songs.length+" cantos"),
   previewSongs(songs),
   model.albums.some(al=>al.artist_id===a.id)?title("Álbumes"):null,
   ...model.albums.filter(al=>al.artist_id===a.id).map(al=>h(EntityRow,{key:al.id,item:al,kind:"album",
    description:model.songsForAlbum(al.id).length+" cantos",
    onPress:()=>setDetail({type:"album",id:al.id})}))
  );
 }
 function renderAlbumDetail(a){
  const songs=model.songsForAlbum(a.id);
  const owner=model.artistMap.get(a.artist_id);
  return h(View,null,
   label("ÁLBUM",S.eyebrow),label(a.title,S.readerTitle),
   a.description?label(a.description,S.description):null,
   owner?h(Btn,{text:"Artista: "+owner.name,secondary:true,onPress:()=>openDetail({type:"artist",id:owner.id})}):null,
   title("Cantos",songs.length+" canciones"),previewSongs(songs)
  );
 }
 // El tono cambia inmediatamente, sin mostrar menús ni enviar datos a la nube.
 function adjustTone(step){setTranspose(v=>Math.max(-11,Math.min(11,v+step)));}
 function resetTone(){setTranspose(0);setCapo("none");}
 function renderToneStepper(text,compact=false){
  return h(View,{style:[S.songToneStepper,compact&&S.songToneStepperCompact]},
   h(Pressable,{style:S.songToneStepButton,onPress:()=>adjustTone(-1),
    accessibilityRole:"button",accessibilityLabel:"Bajar un semitono",disabled:transpose<=-11,
    accessibilityState:{disabled:transpose<=-11}},
    label("−",S.songToneStepText)),
   h(Text,{style:S.songToneCurrent,numberOfLines:1,adjustsFontSizeToFit:true,minimumFontScale:.7},text),
   h(Pressable,{style:S.songToneStepButton,onPress:()=>adjustTone(1),
    accessibilityRole:"button",accessibilityLabel:"Subir un semitono",disabled:transpose>=11,
    accessibilityState:{disabled:transpose>=11}},
    label("+",S.songToneStepText))
  );
 }
 const {shareSong,printSong,checkSongOffline,openSongVideo}=createSongReaderActions({
  Share,Print,Alert,openWeb,manualSync,copy,model,network,transpose,capo
 });
 function addSongLocally(song,kind,choice){
  const result=addToPersonal(personal,String(song.id),kind,choice);
  if(result.added)savePersonal(result.store,{notice:"Agregado a tu "+({misa:"misa",popurri:"popurrí",repertorio:"repertorio"}[kind]||"colección")+" personal"});
  return result;
 }
 function renderSongDetail(song){
  const {choices,chosen,offset:capoOffset}=capoSelection(song,capo);
  const toned=transpose?transposeOne(song.tone||"",transpose):song.tone||"—";
  const liked=hasFavorite(likedIds,song.id);
  const parsed=parseSong(song.lyrics||"Sin letra guardada.",transpose+capoOffset);
  return h(View,{style:S.songReader},
   h(View,{style:S.songReaderIntro},
    label(type(song.song_type).toUpperCase(),S.songReaderKicker),
    h(View,{style:S.songReaderTitleRow},
     h(View,{style:{flex:1,minWidth:0}},
      h(Text,{style:S.songReaderTitle},song.title||"Sin título"),
      label(names(song._artists)||"SHALOM",S.songReaderArtist)),
     h(Pressable,{onPress:()=>toggleLike(song.id),accessibilityRole:"button",
      accessibilityLabel:liked?"Quitar Me gusta":"Marcar Me gusta",
      accessibilityState:{selected:liked},style:S.songLikeButton},
      h(Text,{style:[S.songHeart,liked&&S.songHeartActive]},liked?"♥":"♡"))),
    h(View,{style:S.songReaderBadges},
     h(View,{style:S.songReaderToneBadge},label(toned,S.songReaderToneText)),
     label("Letra y acordes",S.songReaderHint))),
   h(View,{style:S.songControlsStack},
    h(View,{style:S.songCompactControls},
     h(View,{style:[S.songControlColumn,S.songControlTone]},
      label("TONO",S.songControlCaption),
      renderToneStepper(toned,true)),
     h(View,{style:[S.songControlColumn,S.songControlFont]},
      label("LETRA",S.songControlCaption),
      h(View,{style:[S.songFontControl,S.songFontCompact]},
       h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v-1)),
        accessibilityRole:"button",accessibilityLabel:"Reducir tamaño de letra",style:S.songFontButton},
        label("A−",S.songFontText)),
       h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v+1)),
        accessibilityRole:"button",accessibilityLabel:"Aumentar tamaño de letra",style:S.songFontButton},
        label("A+",S.songFontText)))),
     h(View,{style:[S.songControlColumn,S.songControlCapo]},
      label("CAPO",S.songControlCaption),
      h(Pressable,{style:[S.songCapoButton,S.songCapoCompact],onPress:()=>{
       if(choices.length>1)setCapoExpanded(v=>!v);
       else Alert.alert("Capo","No hay variantes de capo registradas para este canto.");
      },accessibilityRole:"button",accessibilityLabel:"Seleccionar capo",
       accessibilityState:{expanded:capoExpanded,disabled:choices.length<=1}},
       label(chosen.id==="none"?"Sin capo ▾":"Capo "+chosen.position+" ▾",S.songControlText))))),
   capoExpanded&&choices.length>1?h(View,{style:S.songCapoVariants},
    ...choices.map(item=>h(Chip,{key:String(item.id),text:item.label,
     active:item.id===capo,onPress:()=>{setCapo(item.id);setCapoExpanded(false)}}))):null,
   chosen.id!=="none"?label("Capo "+chosen.position+(chosen.key?" · Figuras en "+chosen.key:""),S.songCapoNote):null,
   h(View,{style:S.songScorePlain},
    renderAlignedScoreRows(parsed,readerFont,"song-"+song.id))
  );
 }
 function renderRequest(){
  return h(RequestScreen,{
   styles:S,online:network.online,sending,
   form:{kind:requestKind,title:requestTitle,artist:requestArtist,
    link:requestLink,details:requestDetails,name:requestName,email:requestEmail},
   onChange:{kind:setRequestKind,title:setRequestTitle,artist:setRequestArtist,
    link:setRequestLink,details:setRequestDetails,name:setRequestName,email:setRequestEmail},
   onSubmit:submitRequest,ui:{title,label,inputField,Chip,Btn}
  });
 }
 const page=detail?.type==="repertoire"&&focusedRepertoire?renderRepertoireDetail(focusedRepertoire)
  :detail?.type==="medley"&&focusedMedley?renderMedleyDetail(focusedMedley)
   :detail?.type==="song"&&active?renderSongDetail(active)
  :detail?.type==="artist"&&focusedArtist?renderArtistDetail(focusedArtist)
  :detail?.type==="album"&&focusedAlbum?renderAlbumDetail(focusedAlbum)
  :tab==="Canciones"?renderSongs():tab==="Popurrís"?renderMedleys():tab==="Artistas"?renderArtists()
  :tab==="Categorías"?renderCategories():tab==="Álbumes"?renderAlbums():tab==="Explorar"?renderExplore():tab==="Repertorios"?renderRepertoires()
  :tab==="Mis colecciones"?h(PersonalCollectionsScreen,{store:personal,onChange:savePersonal,songs:model.songs,renderScore:renderMultiReadingScore,onSelectSong:selectSong,onStudioPart:openStudioPart,onStudioCollection:openStudioCollection,filterKind:personalFilter,onClearFilter:()=>setPersonalFilter(null),
    registerBack:registerNestedBack,initialNav:personalNavRef.current,onNavChange:next=>{personalNavRef.current=next;}})
   :tab==="Perfil"?h(ProfileScreen,{profile,onChange:saveProfile,likedSongs:model.songs.filter(s=>likedSet.has(String(s.id))),
     personal,openSong:selectSong,onLiked:toggleLike,onCollections:(kind,action)=>goTab("Mis colecciones",{personalKind:kind||null,personalAction:action||null}),
      onOpenPersonal:(folderId,entryId,parts)=>goTab("Mis colecciones",{
       personalNav:{view:parts?"reading":"editing",folderId,entryId,editReturn:"home"}}),
     onSongs:liked=>goTab("Canciones",{liked}),onRepertoires:()=>goTab("Repertorios"),
      onSettings:()=>setSettingsOpen(true),onBackup:()=>goTab("Respaldo"),
      onRequest:()=>requestForm("song"),onMore:()=>goTab("Más"),editNonce:profileEditNonce,
      onEditRequestConsumed:()=>setProfileEditNonce(0),registerBack:registerNestedBack})
   :tab==="Respaldo"?h(PersonalBackupScreen,{
      onExport:exportMyPersonalBackup,onPick:pickPersonalBackup,
      onRestore:restoreMyPersonalBackup,onBack:back})
   :tab==="Solicitar"?renderRequest():tab==="Más"?renderMore():renderHome();
 return h(SafeAreaView,{style:[S.root,{paddingTop:immersiveActive?0:topInset}],edges:["bottom","left","right"]},
  h(StatusBar,{barStyle:"light-content",backgroundColor:C.bg,hidden:immersiveActive,animated:true}),
  !immersiveActive&&isReader&&!settingsOpen?h(View,{style:S.songTopBar},
   h(Pressable,{style:S.songBackButton,onPress:()=>back(),accessibilityRole:"button",accessibilityLabel:"Volver a las canciones"},
    label("‹",S.songBackSymbol)),
   h(View,{style:S.songTopBrand},
    h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.songTopLogo}),
    label("SHALOM",S.songTopName)),
   h(Pressable,{style:S.songTopMore,onPress:()=>active?setActionSongId(String(active.id)):
     Alert.alert("Opciones de lectura","Elige una acción.",[
      {text:"Compartir",onPress:shareMultiReading},
      {text:"Pantalla completa",onPress:()=>setImmersive(true)},
      {text:"Tono original",onPress:()=>{setTranspose(0);setCapo("none")}},
      {text:"Cancelar",style:"cancel"}]),accessibilityRole:"button",accessibilityLabel:active?"Opciones de canción":"Opciones de lectura"},
     label("⋮",S.songTopMoreText))):
  !immersiveActive&&!detail&&!settingsOpen&&["Artistas","Categorías","Popurrís","Álbumes","Explorar","Más","Respaldo"].includes(tab)?h(View,{style:S.repTopBar},
   h(Pressable,{style:S.repTopBack,onPress:()=>back(),accessibilityRole:"button",accessibilityLabel:"Regresar"},
    label("←",S.repTopBackSymbol)),
   h(View,{style:S.repTopBrand},
    h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repTopLogo}),
    h(View,{style:{flex:1,minWidth:0}},
     label("SHALOM",S.repTopName),
     label("Coro y Alabanza",S.repTopSub))),
   (tab!=="Canciones"&&tab!=="Artistas"&&tab!=="Explorar"&&tab!=="Más"&&tab!=="Mis colecciones"&&tab!=="Perfil"&&tab!=="Respaldo")?h(Pressable,{style:S.repTopAction,onPress:()=>{
     if(tab==="Repertorios"){setRepertoireSearchOpen(v=>!v)}
     else{setSectionSearchOpen(v=>!v)}
     setQuery("");
    },accessibilityRole:"button",accessibilityLabel:(tab==="Repertorios"?repertoireSearchOpen:sectionSearchOpen)?"Ocultar búsqueda":"Buscar en "+tab},
    h(Image,{source:HOME_IMAGES.search,resizeMode:"contain",style:S.repTopActionIcon})):h(View,{style:S.repTopAction}),
   h(Pressable,{style:S.repTopAction,onPress:()=>tab==="Perfil"?openProfileMenu():tab==="Más"?setSettingsOpen(true):goTab("Más"),
    accessibilityRole:"button",accessibilityLabel:tab==="Más"?"Abrir configuración":"Más opciones"},
    tab==="Más"?label("⚙",S.sectionHeaderGear):tab==="Perfil"?label("⋯",S.sectionHeaderGear):
     h(Image,{source:HOME_IMAGES.more,resizeMode:"contain",style:S.repTopActionIcon}))):
  !immersiveActive&&!detail&&!settingsOpen&&["Inicio","Canciones","Repertorios","Mis colecciones","Perfil"].includes(tab)?h(View,{style:S.homeTopBar},
   h(View,{style:S.spotifyHomeBrand},
    h(Image,{source:HOME_IMAGES.logo,style:S.spotifyHomeLogo,resizeMode:"contain",accessibilityLabel:"Paloma original de SHALOM"}),
    h(View,null,label("SHALOM",S.spotifyHomeBrandName),label("Coro y Alabanza",S.spotifyHomeBrandSub))),
   h(Pressable,{onPress:()=>{
    if(tab==="Canciones")setSongLibraryOpen(true);
    else if(tab==="Repertorios"){setRepertoireSearchOpen(v=>!v);setQuery("");}
    else goTab("Canciones",{openLibrary:true});
   },accessibilityRole:"button",accessibilityLabel:"Buscar cantos",style:S.homeTopButton},
    h(Image,{source:HOME_IMAGES.search,style:S.homeTopIcon,resizeMode:"contain"})),
   h(Pressable,{onPress:()=>tab==="Perfil"?openProfileMenu():setSettingsOpen(true),accessibilityRole:"button",accessibilityLabel:tab==="Perfil"?"Más opciones del perfil":"Configuración y sincronización del cancionero",style:S.homeTopButton},
    label("⚙",S.sectionHeaderGear))):
  !immersiveActive&&settingsOpen?h(AppSectionHeader,{section:"Configuración",onBack:()=>setSettingsOpen(false)}):
  !immersiveActive&&detail&&!isReader?h(AppDetailHeader,{
   section:detail.type==="artist"?"Artista":detail.type==="album"?"Álbum":
    detail.type==="medley"?"Popurrí":detail.type==="repertoire"?"Repertorio":"Detalle",
   onBack:back
  }):
  !immersiveActive&&!settingsOpen&&!detail&&tab==="Solicitar"?h(AppSectionHeader,{
   section:"Solicitudes",onBack:back
  }):null,
  !loaded?h(View,{style:{flex:1,justifyContent:"center"}},h(ActivityIndicator,{color:C.green})):
  h(ScrollView,{key:(detail?.type||tab)+(detail?.id||""),style:{flex:1},
   contentContainerStyle:detail&&(detail.type==="medley"||detail.type==="repertoire")?S.multiPage:S.page,
   keyboardShouldPersistTaps:"handled"},
   settingsOpen?renderSettings():page,h(View,{style:{height:27}})),
  !immersiveActive&&!settingsOpen&&!isReader?h(View,{style:S.nav},
   ...tabs.map(([name,icon])=>{
    const selected=isSelectedTab(tab,name)&&!detail;
    const homeIcon=HOME_IMAGES[icon];
    return h(Pressable,{key:name,accessibilityRole:"tab",accessibilityState:{selected},
     onPress:()=>goTab(routeForTab(name)),style:[S.navItem,selected&&S.navSelected]},
     name==="Perfil"?h(View,{style:S.profileNavIcon},
       h(View,{style:[S.profileNavHead,{borderColor:selected?C.green:C.text}]}),
       h(View,{style:[S.profileNavBody,{borderColor:selected?C.green:C.text}]})):
      homeIcon?h(Image,{source:homeIcon,resizeMode:"contain",style:[S.homeNavIcon,{tintColor:selected?C.green:C.text}]}):
      label(icon,[S.navIcon,selected&&{color:C.green}]),
     h(Text,{style:[S.navText,selected&&{color:C.green}],numberOfLines:2,
       adjustsFontSizeToFit:true,minimumFontScale:.78,allowFontScaling:false},name));})) : null,
  actionSong?h(SongActionsSheet,{key:String(actionSong.id),song:actionSong,
   liked:hasFavorite(likedIds,actionSong.id),offline:Boolean(copy?.syncedAt),
   store:personal,onDismiss:()=>setActionSongId(null),
   onLike:()=>toggleLike(actionSong.id),onShare:()=>shareSong(actionSong),
   onOpenLink:url=>openWeb(url),
   onOpenSongPage:()=>openWeb(songPermalink(actionSong)),
   onVideo:()=>openSongVideo(actionSong),
   onStudio:()=>{setStudioQueue(null);const {chosen,offset}=capoSelection(actionSong,capo);setStudioPayload({type:"shalom-studio-init",mode:"public",song:{id:actionSong.id,title:actionSong.title,lyrics:actionSong.lyrics||"",revision:actionSong.updated_at},arrangement:actionSong._studio,shift:transpose+offset,capo:Number(chosen.position)||0})},
   onPrint:()=>printSong(actionSong),onDownload:()=>checkSongOffline(actionSong),
   onFullScreen:()=>setImmersive(true),onResetTone:resetTone,
   onAdd:(kind,choice)=>addSongLocally(actionSong,kind,choice)}):null,
   studioPayload?h(require("./src/studio-screen"),{key:studioQueue?"studio-"+studioQueue.index:"studio-song",payload:studioPayload,onClose:closeStudio,queue:studioQueue,onNext:nextStudio}):null,
   !immersiveActive?h(LocalNotice,{notice,
    bottom:settingsOpen||tab==="Respaldo"||detail?22:tab==="Inicio"?91:86,
    onUndo:()=>{
     const undo=notice?.onUndo;
     clearLocalNotice();
     if(typeof undo==="function")undo();
    }}):null,
   h(ProfileOptionsMenu,{visible:profileMenuOpen,onDismiss:()=>setProfileMenuOpen(false),
    onEdit:()=>setProfileEditNonce(n=>n+1),
    onCollections:()=>goTab("Mis colecciones"),
    onBackup:()=>goTab("Respaldo"),
    onMore:()=>goTab("Más")})
 );
}
function App(){return h(SafeAreaProvider,null,h(AppScreen));}
// La lógica de navegación no contiene definiciones de estilo.
const S=require("./src/app-styles")(C,MONO);
const {label,type,inputField,Btn,Card,Chip,SongRow,EntityRow,Photo,AppSectionHeader,AppDetailHeader,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty}=
 require("./src/app-components")({styles:S,colors:C,images:HOME_IMAGES,InitialCover});
module.exports=App;