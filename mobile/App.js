const React=require("react");
const {useEffect,useMemo,useState,useRef,useCallback}=React;
const {
 View,Text,Pressable,ScrollView,StatusBar,
 Alert,AppState,BackHandler,Platform,Linking,Image,ActivityIndicator,Share
}=require("react-native");
const NetInfo=require("@react-native-community/netinfo").default;
const {SafeAreaProvider,SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const {getCatalog,setMetadata,getMetadataBatch,setMetadataBatch}=require("./src/database");
const {syncAll,networkState}=require("./src/sync");
const {createSyncController}=require("./src/sync-controller");
const {parseSong}=require("./src/chords");
const AlignedScore=require("./src/aligned-score-ui");
const {RepertoireReader,MedleyReader,SongReader}=require("./src/music-readers-ui");
const ReaderCues=require("./src/studio-reader-cues");
const {clampReaderFont}=require("./src/score-zoom");
const {buildCatalog,names,safeWebUrl}=require("./src/catalog");
const {sendRequest}=require("./src/requests");
const RequestScreen=require("./src/request-screen-ui");
const SettingsScreen=require("./src/settings-screen-ui");
const {MoreScreen,ExploreScreen,AlbumsScreen}=require("./src/exploration-screens-ui");
const {FAVORITES_KEY,parseFavorites,hasFavorite}=require("./src/favorites");
const HomeScreen=require("./src/home-screen-ui");
const PersonalCollectionsScreen=require("./src/personal-ui");
const SongActionsSheet=require("./src/song-actions-ui");
const StudioCollections=require("./src/studio-collections");
const LocalNotice=require("./src/local-notice");
const PersonalBackupScreen=require("./src/personal-backup-ui");
const ProfileOptionsMenu=require("./src/profile-options-menu");
const {exportPersonalBackup,pickPersonalBackup,stageRestoredPhotos}=require("./src/personal-backup-io");
const {createPersonalBackupController}=require("./src/personal-backup-controller");
const {createPersonalEditController}=require("./src/personal-edit-controller");
const {addToPersonal}=require("./src/song-actions-core");
const {copyOfficial}=require("./src/personal-workflows");
const {updateOccurrenceCues}=require("./src/personal-store");
const {buildPrintableSong}=require("./src/song-print");
const {songPermalink,createSongReaderActions}=require("./src/song-reader-actions");
const {capoSelection}=require("./src/song-capo-core");
const Print=require("expo-print");
const {ProfileScreen}=require("./src/profile-ui");
const {PROFILE_KEY,defaults:profileDefaults,parseProfile}=require("./src/profile-core");
const {InitialCover}=require("./src/visual-ui");
const {SongsScreen,ArtistsScreen,CategoriesScreen,RepertoiresScreen,MedleysScreen}=require("./src/catalog-screens-ui");
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
const {tabs,isSelectedTab,routeForTab,navigateTab,navigateDetail,navigateRequest,handleBack}=require("./src/navigation-core");
const {filterSongs,filterArtists,searchHomeSongs,selectDetailRecords,selectActionSong}=require("./src/library-selectors");
const {startStudioQueue,advanceStudioQueue}=require("./src/studio-queue");
async function openWeb(value) {
 const url=safeWebUrl(value);
 if(!url)return Alert.alert("Enlace no válido","No se encontró una dirección válida.");
 try{await Linking.openURL(url)}
 catch(_){Alert.alert("No se pudo abrir","Revisa tu conexión o intenta desde el navegador.")}
}
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
 const [showReaderCues,setShowReaderCues]=useState(true);
 const [capoExpanded,setCapoExpanded]=useState(false);
 const [likedIds,setLikedIds]=useState([]);
 const [personal,setPersonal]=useState(emptyStore());
 const [personalFilter,setPersonalFilter]=useState(null);
 const [profile,setProfile]=useState(profileDefaults());
 const [actionSongId,setActionId]=useState(null);
 const [actionContext,setActionContext]=useState(null);
 function setActionSongId(id){setActionContext(null);setActionId(id);}
 function openCollectionSong(song,context){setActionContext(context);setActionId(String(song.id));}
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
 const previousTabRef=useRef("Inicio");
 const detailHistoryRef=useRef([]);
 const tabHistoryRef=useRef([]);
 const likedRef=useRef([]);
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
 const eligible=useMemo(()=>filterSongs(model,{
  query,typeFilter,categoryId,onlyLiked,likedSet
 }),[model,typeFilter,categoryId,query,onlyLiked,likedSet]);
 const filteredArtists=useMemo(()=>filterArtists(model,{query,type:artistTypeFilter}),
  [model,query,artistTypeFilter]);
 const homeMatches=useMemo(()=>searchHomeSongs(model,homeSearch,6),[model,homeSearch]);
 function goTab(next,options={}){
  navigateTab(next,options,{tab,tabHistoryRef,detailHistoryRef,personalNavRef},{
   setProfileMenuOpen,setProfileEditNonce,setPersonalFilter,setActionSongId,setSettingsOpen,setImmersive,setTab,setDetail,
   setSongLibraryOpen,setCountLimit,setFolderType,setFolderId,setQuery,setTypeFilter,setArtistTypeFilter,setMedleyTypeFilter,
   setCategoryId,setSectionSearchOpen,setOnlyLiked
  });
 }
 function openDetail(next){navigateDetail(next,{detail,detailHistoryRef},{setDetail});}
 function rememberRead(next){lastReadRef.current=next;setLastRead(next);setMetadata("last_read",JSON.stringify(next)).catch(()=>{});}
 const personalEditsRef=useRef(null);
 if(!personalEditsRef.current)personalEditsRef.current=createPersonalEditController({
  personalRef,profileRef,likedRef,setPersonal,setProfile,setLikedIds,write:setMetadata,
  notice:showLocalNotice,clearNotice:clearLocalNotice,alert:(title,message)=>Alert.alert(title,message)
 });
 const {savePersonal,saveProfile,toggleLike}=personalEditsRef.current;
 function openProfileMenu(){setProfileMenuOpen(true);}
 const backupControllerRef=useRef(null);
 if(!backupControllerRef.current)backupControllerRef.current=createPersonalBackupController({
  waitForWrites:personalEditsRef.current.waitForWrites,
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
  navigateRequest({tab,previousTabRef,detailHistoryRef},{setImmersive,setTab,setDetail});
 }
 const syncControllerRef=useRef(null);
 if(!syncControllerRef.current)syncControllerRef.current=createSyncController({
  syncAll,getCatalog,networkState,writePreference:setMetadata,setNetwork,setWifiOnly,setBusy,setError,setProgress,setCopy,
  alert:(...args)=>Alert.alert(...args)
 });
 const {initialize,updateNetwork,tryAuto,manualSync,changeWifi}=syncControllerRef.current;
 useEffect(()=>{
  let enabled=true;
  (async()=>{
   try{
    const [snapshot,n,prefs]=await Promise.all([
     getCatalog(),networkState().catch(()=>({online:false,wifi:false})),getMetadataBatch({wifi_only:"true",last_read:"",[FAVORITES_KEY]:"[]",[PERSONAL_KEY]:"",[PROFILE_KEY]:""})
    ]);
    const pref=prefs.wifi_only,last=prefs.last_read,likedRaw=prefs[FAVORITES_KEY],personalRaw=prefs[PERSONAL_KEY],profileRaw=prefs[PROFILE_KEY];
    if(!enabled)return;
    initialize(snapshot,pref!=="false");
    setCopy(snapshot);setWifiOnly(pref!=="false");setNetwork(n);
    likedRef.current=parseFavorites(likedRaw);setLikedIds(likedRef.current);
    const savedPersonal=parseStore(personalRaw),savedProfile=parseProfile(profileRaw);
    personalRef.current=savedPersonal;profileRef.current=savedProfile;
    setPersonal(savedPersonal);setProfile(savedProfile);
    if(last){try{setLastRead(JSON.parse(last))}catch(_){}}setLoaded(true);
    if(n.online)tryAuto();
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
 },[initialize,tryAuto,updateNetwork]);
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
 function renderHome(){return h(HomeScreen,{S,C,HOME_IMAGES,label,Btn,SongRow,homeSearch,setHomeSearch,homeMatches,lastRead,model,profile,personal,likedIds,goTab,selectSong,selectMedley,selectRepertoire,manualSync,busy,copy,setSettingsOpen,progress,error});}
 function renderSongs(){return h(SongsScreen,{S,C,label,type,Btn,SectionEmpty,onlyLiked,typeFilter,setOnlyLiked,setTypeFilter,setCountLimit,setSongLibraryOpen,query,setQuery,songLibraryOpen,goTab,copy,busy,manualSync,eligible,countLimit,likedSet,selectSong,toggleLike,setActionSongId});}
 function renderArtists(){return h(ArtistsScreen,{S,label,type,Btn,SectionEmpty,filteredArtists,query,setQuery,setCountLimit,libraryFiltersVisible,setLibraryFiltersVisible,artistTypeFilter,setArtistTypeFilter,countLimit,model,openDetail});}
 function renderCategories(){return h(CategoriesScreen,{S,label,type,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty,model,folderId,folderType,query,setFolderType,setFolderId,setQuery,sectionSearchOpen,selectSong});}
 function renderMore(){
  return h(MoreScreen,{S,SectionHero,SectionListCard,goTab,requestForm,setSettingsOpen,openWeb});
 }

 function renderExplore(){
  return h(ExploreScreen,{S,SectionHero,SectionListCard,goTab});
 }

 function renderRepertoires(){return h(RepertoiresScreen,{S,C,HOME_IMAGES,label,model,repertoireFilter,query,setRepertoireFilter,repertoireSearchOpen,setQuery,selectRepertoire,copy,requestForm,setRequestTitle});}
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
 function renderMultiReadingControls(nav=null){
  return h(View,{style:S.multiControlArea},
   h(View,{style:S.songControls},
    renderToneStepper(transpose===0?"Original":(transpose>0?"+":"")+transpose+" semitonos"),
    h(View,{style:S.songFontControl},
     h(Pressable,{onPress:()=>nav?.enabled?nav.manualFont(nav.fitFont-1):setReaderFont(v=>clampReaderFont(v-1)),
      accessibilityRole:"button",accessibilityLabel:"Reducir letras",style:S.songFontButton},
      label("A−",S.songFontText)),
     h(Pressable,{onPress:()=>nav?.enabled?nav.manualFont(nav.fitFont+1):setReaderFont(v=>clampReaderFont(v+1)),
      accessibilityRole:"button",accessibilityLabel:"Aumentar letras",style:S.songFontButton},
      label("A+",S.songFontText)))),
   h(View,{style:S.multiControlFooter},
    h(Pressable,{onPress:()=>setShowReaderCues(v=>!v),accessibilityRole:"button",accessibilityState:{selected:showReaderCues},style:S.multiTextAction},label(showReaderCues?"Ocultar indicaciones":"Mostrar indicaciones",S.multiTextActionLabel)),
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
 function collectionScoreRows(lyrics,delta,song=null,override=null){
  const parsed=parseSong(lyrics,delta);
  const arrangement=song&&lyrics===song.lyrics?song._studio:null;
  const rows=showReaderCues?ReaderCues.decorateCollection(parseSong(lyrics,0),arrangement,override,parsed):parsed;
  return rows;
 }
 function renderMultiReadingScore(lyrics,delta,keyPrefix,fontOverride=readerFont,song=null,override=null){
  return renderAlignedScoreRows(collectionScoreRows(lyrics,delta,song,override),fontOverride,keyPrefix);
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
 function copyOfficialLocally(collection,kind){
  try{const result=copyOfficial(personalRef.current,collection,kind,model.songs);savePersonal(result.store,{notice:"Copia guardada en Mis creaciones"});}
  catch(error){Alert.alert("No se pudo copiar",error.message);}
 }
 function renderRepertoireDetail(rep){return h(RepertoireReader,{key:String(rep.id),rep,S,collectionScoreRows,readerFont,HOME_IMAGES,label,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,openStudioPart,selectSong,onSongOptions:openCollectionSong,onCopy:()=>copyOfficialLocally(rep,rep.kind==="misa"?"misa":"repertorio")});}
 function renderMedleys(){return h(MedleysScreen,{S,label,type,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty,model,medleyTypeFilter,query,setMedleyTypeFilter,sectionSearchOpen,setQuery,selectMedley,copy});}
 function renderMedleyDetail(medley){return h(MedleyReader,{key:String(medley.id),medley,S,collectionScoreRows,readerFont,HOME_IMAGES,label,type,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,setStudioQueue,setStudioPayload,selectSong,openWeb,onSongOptions:openCollectionSong,onCopy:()=>copyOfficialLocally(medley,"popurri")});}
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
    onPress:()=>openDetail({type:"album",id:al.id})}))
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
  Share,Print,Alert,openWeb,manualSync,copy,model,network,transpose,capo,showReaderCues
 });
 function addSongLocally(song,kind,choice){
  const result=addToPersonal(personal,String(song.id),kind,choice);
  if(result.added)savePersonal(result.store,{notice:"Agregado a tu "+({misa:"misa",popurri:"popurrí",repertorio:"repertorio"}[kind]||"colección")+" personal"});
  return result;
 }
 function renderSongDetail(song){return h(SongReader,{key:String(song.id),song,S,label,type,Chip,capo,transpose,likedIds,toggleLike,renderToneStepper,setReaderFont,capoExpanded,setCapoExpanded,setCapo,renderAlignedScoreRows,readerFont,showReaderCues,setShowReaderCues,immersiveActive});}
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
  :tab==="Mis colecciones"?h(PersonalCollectionsScreen,{store:personal,onChange:savePersonal,songs:model.songs,renderScore:renderMultiReadingScore,showReaderCues,setShowReaderCues,onSelectSong:selectSong,onSongOptions:openCollectionSong,onStudioPart:openStudioPart,onStudioCollection:openStudioCollection,filterKind:personalFilter,onClearFilter:()=>setPersonalFilter(null),
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
   store:personal,onDismiss:()=>setActionSongId(null),context:actionContext,onSaveCues:actionContext?.personalTarget?value=>{const next=updateOccurrenceCues(personalRef.current,actionContext.personalTarget,actionSong,actionContext.lyrics,actionContext.override,value);savePersonal(next,{notice:"Indicaciones actualizadas solo en esta colección"});}:null,onOpenOriginal:actionContext?()=>selectSong(actionSong):null,
   onLike:()=>toggleLike(actionSong.id),onShare:()=>shareSong(actionSong),
   onOpenLink:url=>openWeb(url),
   onOpenSongPage:()=>openWeb(songPermalink(actionSong)),
   onVideo:()=>openSongVideo(actionSong),
   onStudio:actionContext? (actionContext.practiceReady?()=>openStudioPart(actionSong,{lyrics:actionContext.lyrics,shift:actionContext.shift,capo:actionContext.capo}):null):()=>{setStudioQueue(null);const {chosen,offset}=capoSelection(actionSong,capo);setStudioPayload({type:"shalom-studio-init",mode:"public",song:{id:actionSong.id,title:actionSong.title,lyrics:actionSong.lyrics||"",revision:actionSong.updated_at},arrangement:actionSong._studio,shift:transpose+offset,capo:Number(chosen.position)||0})},
   onPrint:actionContext?()=>Print.printAsync({html:buildPrintableSong({...actionSong,lyrics:actionContext.lyrics,_studio:actionContext.lyrics===actionSong.lyrics?actionSong._studio:null},actionContext.shift,showReaderCues,actionContext.override)}):()=>printSong(actionSong),onDownload:()=>checkSongOffline(actionSong),
   onFullScreen:()=>setImmersive(true),onResetTone:actionContext?null:resetTone,
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