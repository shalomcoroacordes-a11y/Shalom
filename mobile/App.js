const React=require("react");
const {useEffect,useMemo,useState,useRef,useCallback}=React;
const {
 View,Text,TextInput,Pressable,ScrollView,StatusBar,StyleSheet,
 Switch,Alert,AppState,BackHandler,Platform,Linking,Image,ActivityIndicator,Share
}=require("react-native");
const NetInfo=require("@react-native-community/netinfo").default;
const {SafeAreaProvider,SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const {getCatalog,getMetadata,setMetadata}=require("./src/database");
const {syncAll,networkState}=require("./src/sync");
const {parseSong,transposeOne}=require("./src/chords");
const AlignedScore=require("./src/aligned-score-ui");
const {buildCatalog,normalize,names,typeLabel,safeWebUrl}=require("./src/catalog");
const {sendRequest,TYPES}=require("./src/requests");
const {FAVORITES_KEY,parseFavorites,hasFavorite,toggleFavorite}=require("./src/favorites");
const {repertoireType,filterRepertoires}=require("./src/repertoire-ui");
const {personalCounts,officialHighlights}=require("./src/home-spotlight");
const PersonalCollectionsScreen=require("./src/personal-ui");
const SongActionsSheet=require("./src/song-actions-ui");
const LocalNotice=require("./src/local-notice");
const PersonalBackupScreen=require("./src/personal-backup-ui");
const ProfileOptionsMenu=require("./src/profile-options-menu");
const {exportPersonalBackup,pickPersonalBackup,stageRestoredPhotos}=require("./src/personal-backup-io");
const {addToPersonal}=require("./src/song-actions-core");
const {buildPrintableSong,readerShiftForPrint}=require("./src/song-print");
const Print=require("expo-print");
const {ProfileScreen,ACTION_LABEL}=require("./src/profile-ui");
const {PROFILE_KEY,defaults:profileDefaults,parseProfile}=require("./src/profile-core");
const {InitialCover}=require("./src/visual-ui");
const {CoverArt}=require("./src/personal-cover-ui");
const {LibraryHero,LibrarySearch,LibraryChipRow,LibrarySongRow,FavoriteSongCard,LibraryArtistCard}=require("./src/library-ui");
const {LinearGradient}=require("expo-linear-gradient");
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
const tabs=[["Inicio","home"],["Canciones","song"],["Repertorios","repertoires"],["Artistas","artists"],["Perfil","profile"]];
const moreTabs=new Set(["Popurrís","Álbumes","Categorías","Solicitar","Mis colecciones"]);
const isSelectedTab=(current,name)=>current===name||(name==="Perfil"&&(moreTabs.has(current)||current==="Más"));
const matchesSearch=(values,term)=>normalize(values.filter(v=>v!==null&&v!==undefined).join(" ")).includes(normalize(term.trim()));
const byMostRecent=(a,b)=>{
 const date=x=>Date.parse(x.updated_at||x.created_at||"")||Date.parse(x.created_at||"")||0;
 return date(b)-date(a);
};
const upcomingMass=(repertoires,today)=>{
 const masses=repertoires.filter(r=>r.kind==="misa");
 return masses.filter(r=>r.event_date&&r.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date))[0]
  ||masses.find(r=>!r.event_date)||null;
};
const label=(value,style)=>h(Text,{style:style||S.info},String(value??""));
const type=val=>typeLabel(val);
const inputField=(name,value,onChangeText,more={})=>h(View,{style:S.field,key:name},
 label(name,S.fieldTitle),
 h(TextInput,{style:[S.input,more.multiline&&S.multiline],value,onChangeText,
  placeholderTextColor:C.muted,placeholder:more.placeholder||"",multiline:Boolean(more.multiline),
  textAlignVertical:more.multiline?"top":"center",
  autoCapitalize:more.email?"none":"sentences",
  keyboardType:more.email?"email-address":more.url?"url":"default",
  maxLength:more.maxLength||2500})
);
function Btn({text,onPress,small=false,secondary=false,disabled=false}){
 return h(Pressable,{onPress,disabled,accessibilityRole:"button",accessibilityLabel:String(text),accessibilityState:{disabled},
   style:[S.button,secondary&&S.secondary,small&&S.smallBtn,disabled&&{opacity:.5}]},
  label(text,[S.buttonText,secondary&&S.secondaryText,small&&S.smallBtnText]));
}
function Card({children,style}){return h(View,{style:[S.card,style]},children)}
function Chip({text,active=false,onPress}){
 return h(Pressable,{onPress,accessibilityRole:"button",accessibilityLabel:String(text),accessibilityState:{selected:active},style:[S.chip,active&&S.chipActive]},
 label(text,[S.chipText,active&&{color:"#03251a"}]));
}
function SongRow({song,onPress}) {
 return h(Pressable,{onPress,style:S.listRow,accessibilityRole:"button",key:song.id},
  h(View,{style:{flex:1}},
   label(song.title||"Sin título",S.listTitle),
   label([names(song._artists),song.tone?"Tono "+song.tone:""].filter(Boolean).join(" · ")||type(song.song_type),S.rowMeta)),
  label("›",S.rowArrow));
}
function EntityRow({item,onPress,description,kind}) {
 const categoryIcon=kind==="folder"?(/misa|liturg/i.test(item.name||"")?"⛪":/adoraci/i.test(item.name||"")?"✦":/alabanza/i.test(item.name||"")?"♫":/navidad/i.test(item.name||"")?"★":/pascua/i.test(item.name||"")?"☀":"📁"):null;
 return h(Pressable,{onPress,style:S.listRow,accessibilityRole:"button",key:item.id},
  h(View,{style:S.entityIcon},label(kind==="artist"?"♪":kind==="folder"?categoryIcon:"▣",S.entityEmoji)),
  h(View,{style:{flex:1}},
   label(item.name||item.title||"Sin nombre",S.listTitle),
   label(description||"Abrir detalles",S.rowMeta)),
  label("›",S.rowArrow));
}
async function openWeb(value) {
 const url=safeWebUrl(value);
 if(!url)return Alert.alert("Enlace no válido","No se encontró una dirección válida.");
 try{await Linking.openURL(url)}
 catch(_){Alert.alert("No se pudo abrir","Revisa tu conexión o intenta desde el navegador.")}
}
function Photo({url,labelText}) {
 const uri=safeWebUrl(url);
 const [failed,setFailed]=useState(false);
 if(!uri||failed)return h(View,{style:S.photoPlaceholder},
   label((labelText||"♪").trim().slice(0,2).toUpperCase(),S.photoLetter));
 return h(Image,{source:{uri},style:S.photo,onError:()=>setFailed(true)});
}
function AppSectionHeader({section,onBack,onSettings}){
 return h(View,{style:S.sectionTopBar},
  onBack?h(Pressable,{style:S.sectionHeaderSide,onPress:onBack,accessibilityRole:"button",accessibilityLabel:"Volver"},
   label("←",S.sectionHeaderArrow)):h(View,{style:S.sectionHeaderSide}),
  h(View,{style:S.sectionHeaderIdentity},
   h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.sectionHeaderLogo,accessibilityLabel:"Logo oficial de SHALOM"}),
   h(View,{style:{flexShrink:1,minWidth:0}},
    label("SHALOM",S.sectionHeaderBrand),
    h(Text,{style:S.sectionHeaderSubtitle,numberOfLines:1},section||"Coro y Alabanza"))),
  onSettings?h(Pressable,{style:S.sectionHeaderSide,onPress:onSettings,accessibilityRole:"button",accessibilityLabel:"Abrir configuración"},
   label("⚙",S.sectionHeaderGear)):h(View,{style:S.sectionHeaderSide})
 );
}
function AppDetailHeader(props){return h(AppSectionHeader,{...props})}

function SectionHero({title,subtitle,icon}){
 return h(View,{style:S.repHeading},
  h(Image,{source:HOME_IMAGES[icon]||HOME_IMAGES.song,resizeMode:"contain",style:S.repHeadingIcon}),
  h(View,{style:{flex:1,minWidth:0}},
   h(Text,{style:S.repTitle,numberOfLines:2,adjustsFontSizeToFit:true,minimumFontScale:.8},title),
   h(Text,{style:S.repSubtitle,numberOfLines:2},subtitle||"")));
}
function SectionFilterBar({options,value,onChange,compact=false}){
 return h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
  contentContainerStyle:[S.repFilters,compact&&S.sectionFiltersCompact]},
  ...options.map(([code,text,icon])=>{
   const selected=value===code;
   return h(Pressable,{key:String(code),onPress:()=>onChange(code),
    accessibilityRole:"button",accessibilityLabel:"Filtrar: "+text,
    accessibilityState:{selected},style:[S.repFilterChip,selected&&S.repFilterActive]},
    icon?h(Image,{source:HOME_IMAGES[icon]||HOME_IMAGES.song,resizeMode:"contain",
     style:[S.repFilterIcon,{tintColor:selected?"#05271d":C.text}]}):null,
    label(text,[S.repFilterText,selected&&S.repFilterTextActive]));
  }));
}
function SectionSearch({value,onChangeText,placeholder}){
 return h(TextInput,{style:S.repSearchInput,value,onChangeText,
  placeholder,placeholderTextColor:C.muted,autoCorrect:false,
  accessibilityLabel:placeholder,returnKeyType:"search"});
}
function SectionListCard({title,subtitle,meta,icon,onPress}){
 return h(Pressable,{style:S.repCard,onPress,accessibilityRole:"button",
  accessibilityLabel:[title,subtitle].filter(Boolean).join(", ")},
  h(InitialCover,{title:title||"Canto",size:53}),
  h(View,{style:{flex:1,minWidth:0}},
   h(Text,{style:S.repCardTitle,numberOfLines:2},title||"Sin título"),
   subtitle?h(Text,{style:S.repCardCount,numberOfLines:2},subtitle):null,
   meta?h(Text,{style:S.repCardMeta,numberOfLines:1},meta):null),
  label("›",S.repArrow));
}
function SectionEmpty({message}){
 return h(View,{style:S.repEmptyCard},
  h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repEmptyLogo}),
  label(message,S.repEmptyText));
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
 const active=detail?.type==="song"?model.songs.find(s=>s.id===detail.id):null;
 const focusedArtist=detail?.type==="artist"?model.artistMap.get(detail.id):null;
 const focusedAlbum=detail?.type==="album"?model.albumMap.get(detail.id):null;
 const focusedMedley=detail?.type==="medley"?model.medleys.find(x=>x.id===detail.id):null;
 const focusedRepertoire=detail?.type==="repertoire"?model.repertoires.find(x=>x.id===detail.id):null;
 const likedSet=useMemo(()=>new Set(likedIds),[likedIds]);
 const actionSong=actionSongId?model.songs.find(song=>String(song.id)===String(actionSongId)):null;
 const eligible=useMemo(()=>model.songs.filter(s=>{
  if(onlyLiked&&!likedSet.has(String(s.id)))return false;
  if(typeFilter&&s.song_type!==typeFilter)return false;
  if(categoryId&&!s._categories.some(c=>model.descendants(categoryId).has(c.id)))return false;
  const term=normalize(query.trim());
  if(!term)return true;
  return matchesSearch([s.title,s.tone,s.lyrics,names(s._artists),names(s._categories)],term);
 }),[model,typeFilter,categoryId,query,onlyLiked,likedSet]);
 function goTab(next,options={}){setProfileMenuOpen(false);if(next==="Inicio")tabHistoryRef.current=[];else if(next!==tab&&!options.replace)tabHistoryRef.current.push(tab);if(next==="Mis colecciones"&&tab!=="Mis colecciones"){
  personalNavRef.current=options.personalNav||(
   options.personalAction?{view:options.personalAction,kind:options.personalKind||"misa"}:null);
  setPersonalFilter(options.personalKind||null);
 }else if(next!=="Mis colecciones")setPersonalFilter(null);setActionSongId(null);setSettingsOpen(false);setImmersive(false);detailHistoryRef.current=[];setTab(next);setDetail(null);setCountLimit(80);setFolderType("");setFolderId("");setQuery(options.search||"");setTypeFilter("");setArtistTypeFilter("");setMedleyTypeFilter("");setCategoryId("");setSectionSearchOpen(Boolean(options.search));setOnlyLiked(Boolean(options.liked));}
 function openDetail(next){if(detail)detailHistoryRef.current.push(detail);setDetail(next);}
 function rememberRead(next){setLastRead(next);setMetadata("last_read",JSON.stringify(next)).catch(()=>{});}
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
 async function exportMyPersonalBackup(){
  await Promise.all([likedWriteRef.current,personalWriteRef.current,profileWriteRef.current]);
  return exportPersonalBackup({
   profile:profileRef.current,personal:personalRef.current,
   likedIds:likedRef.current,lastRead
  });
 }
 async function restoreMyPersonalBackup(parsed){
  await Promise.all([likedWriteRef.current,personalWriteRef.current,profileWriteRef.current]);
  const old={profile:profileRef.current,personal:personalRef.current,
   likedIds:likedRef.current,lastRead};
  const staged=await stageRestoredPhotos(parsed);
  const next=staged.data;
  try{
   await setMetadata(PERSONAL_KEY,JSON.stringify(next.personal));
   await setMetadata(PROFILE_KEY,JSON.stringify(next.profile));
   await setMetadata(FAVORITES_KEY,JSON.stringify(next.likedIds));
   await setMetadata("last_read",next.lastRead?JSON.stringify(next.lastRead):"");
  }catch(err){
   const rolled=[];
   for(const [key,value] of [
    [PERSONAL_KEY,JSON.stringify(old.personal)],
    [PROFILE_KEY,JSON.stringify(old.profile)],
    [FAVORITES_KEY,JSON.stringify(old.likedIds)],
    ["last_read",old.lastRead?JSON.stringify(old.lastRead):""]
   ]){
    try{await setMetadata(key,value);rolled.push(true);}
    catch(_){rolled.push(false);}
   }
   const rollbackFailed=rolled.some(result=>!result);
   // Mantener las fotos importadas si la recuperación de metadatos fue parcial:
   // las preferencias quizá las sigan referenciando. Nunca perder una foto a ciegas.
   if(!rollbackFailed)staged.cleanup();
   if(rollbackFailed)
    throw new Error("La restauración falló y no fue posible recuperar completamente las preferencias anteriores. Conserva tu archivo y vuelve a importarlo: "+err.message);
   throw err;
  }
  clearLocalNotice();
  personalRef.current=next.personal;profileRef.current=next.profile;
  likedRef.current=next.likedIds;
  setPersonal(next.personal);setProfile(next.profile);setLikedIds(next.likedIds);
  setLastRead(next.lastRead);
  showLocalNotice("Respaldo personal restaurado");
 }
 function selectSong(song){openDetail({type:"song",id:song.id,from:tab});rememberRead({type:"song",id:song.id});setTranspose(0);setCapo("none");setCapoExpanded(false);}
 function selectMedley(medley){openDetail({type:"medley",id:medley.id,from:tab});rememberRead({type:"medley",id:medley.id});setTranspose(0);}
 function selectRepertoire(rep){openDetail({type:"repertoire",id:rep.id,from:tab});setTranspose(0);}
 function back(){
  if(profileMenuOpen){setProfileMenuOpen(false);return true;}
  if(actionSongId){setActionSongId(null);return true;}
  if(immersiveActive){setImmersive(false);return true;}
  if(settingsOpen){setSettingsOpen(false);return true;}
  if(detail){
   if(detail.type==="song"&&capoExpanded){setCapoExpanded(false);return true;}
   setDetail(detailHistoryRef.current.pop()||null);return true;
  }
  if(nestedBackRef.current?.())return true;
  if(tab==="Solicitar"){goTab(previousTabRef.current==="Solicitar"?"Inicio":previousTabRef.current,{replace:true});return true;}
  if(tab==="Categorías"&&folderId){
   const parent=model.categoryMap.get(folderId)?.parent_id;
   setFolderId(parent&&model.categoryMap.has(parent)?parent:"");return true;
  }
  if(tab==="Categorías"&&folderType){setFolderType("");return true;}
  if(tab!=="Inicio"){const previous=tabHistoryRef.current.pop();goTab(previous||"Inicio",{replace:true});return true;}
  return false;
 }
 useEffect(()=>{
  if(Platform.OS!=="android")return;
  const subscription=BackHandler.addEventListener("hardwareBackPress",back);
  return()=>subscription.remove();
 },[detail,tab,folderId,folderType,model,immersiveActive,settingsOpen,actionSongId,capoExpanded,personalFilter,profileMenuOpen]);
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
    const [snapshot,pref,n,last,likedRaw,personalRaw,profileRaw]=await Promise.all([
     getCatalog(),getMetadata("wifi_only","true"),networkState(),getMetadata("last_read",""),
     getMetadata(FAVORITES_KEY,"[]"),getMetadata(PERSONAL_KEY,""),getMetadata(PROFILE_KEY,"")
    ]);
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
  return h(View,null,
   title("Configuración","Preferencias de SHALOM Android"),
   h(Card,null,
    label("Biblioteca y sincronización",S.listTitle),
    label(copy?.syncedAt?"Última actualización: "+new Date(copy.syncedAt).toLocaleString("es-MX"):"Todavía no has descargado la biblioteca.",S.rowMeta),
    h(View,{style:S.metrics},metric("Cantos",model.songs.length),metric("Artistas",model.artists.length),metric("Categorías",model.categories.length)),
    h(View,{style:S.switchRow},
     h(View,{style:{flex:1}},label("Preferir Wi-Fi",S.listTitle),label("Sincronización automática al abrir la aplicación.",S.smallMuted)),
     h(Switch,{value:wifiOnly,onValueChange:changeWifi,trackColor:{false:C.border,true:"#1f8f60"},thumbColor:C.pale})),
    h(Btn,{text:busy?"Actualizando…":"Actualizar cancionero",onPress:manualSync,disabled:busy}),
    busy?h(ActivityIndicator,{color:C.green,style:{marginTop:8}}):null,
    progress?label(progress,S.info):null,error?label(error,S.error):null),
   title("Información de SHALOM"),
   h(Btn,{text:"Acerca de SHALOM ↗",secondary:true,onPress:()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/acerca.html")}),
   h(View,{style:{height:10}}),
   h(Btn,{text:"Donaciones ↗",secondary:true,onPress:()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/donaciones.html")}),
  );
 }
 function renderHome(){
  const term=normalize(homeSearch.trim());
  const found=term?model.songs.filter(song=>matchesSearch([song.title,song.lyrics,names(song._artists),names(song._categories)],term)).slice(0,6):[];
  const likes=model.songs.filter(song=>likedSet.has(String(song.id)));
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
   ["repertoires","Mis creaciones","Tu biblioteca personal",counts.creations,()=>goTab("Mis colecciones")]
  ];
  return h(View,{style:S.homeContainer},
   h(View,{style:S.spotifyWelcome},
    label("Hola, "+(profile.name==="Mi perfil"?"bienvenido":profile.name),S.spotifyWelcomeTitle),
    label("Bienvenido a SHALOM 💚",S.spotifyWelcomeText)),
   h(View,{style:S.spotifyBanner},
    h(CoverArt,{preset:profile.bannerPreset,photo:profile.banner||profile.cover,color:C.green,height:214}),
    h(LinearGradient,{colors:["rgba(0,12,13,.62)","rgba(0,20,17,.1)","rgba(0,0,0,.72)"],
     style:S.spotifyBannerOverlay}),
    h(View,{style:S.spotifyBannerContent},
     label("♫  DESTACADO",S.spotifyBannerEyebrow),
     h(Text,{style:S.spotifyBannerTitle,numberOfLines:2},profile.bannerTitle),
     label("Cantos y acordes para acompañar tu alabanza",S.spotifyBannerSubtitle),
     h(Pressable,{onPress:goBanner,style:S.spotifyBannerButton,accessibilityRole:"button",
      accessibilityLabel:ACTION_LABEL[profile.bannerAction]||"Explorar cantos"},
      label((ACTION_LABEL[profile.bannerAction]||"Explorar cantos")+"  ›",S.spotifyBannerButtonLabel)))),
   h(View,{style:S.spotifyShortcuts},...shortcuts.map(([icon,name,subtitle,count,onPress])=>
    h(Pressable,{key:name,onPress,accessibilityRole:"button",
     accessibilityLabel:name+": "+count,style:S.spotifyShortcut},
     h(LinearGradient,{colors:["#193b33","#172831"],start:{x:0,y:0},end:{x:1,y:1},
      style:S.spotifyShortcutBackground}),
     h(View,{style:S.spotifyShortcutTop},
      h(View,{style:S.spotifyShortcutSymbolBox},
       icon==="heart"?label("♥",S.spotifyShortcutIcon):
       h(Image,{source:HOME_IMAGES[icon],resizeMode:"contain",style:S.spotifyShortcutImage})),
      h(View,{style:S.spotifyShortcutCount},label(count,S.spotifyShortcutCountText))),
     h(View,{style:S.spotifyShortcutText},
      label(name,S.spotifyShortcutName),
      label(subtitle,S.spotifyShortcutSubtitle))))),
   h(View,{style:S.shalomToday},
    h(View,{style:S.shalomTodayHeader},
     h(View,{style:{flex:1,minWidth:0}},
      label("Hoy en SHALOM",S.shalomTodayHeading),
      label("Lo que cantaremos y ensayaremos como coro",S.shalomTodaySubheading)),
     h(Pressable,{onPress:manualSync,disabled:busy,style:S.shalomTodayRefresh,
      accessibilityRole:"button",accessibilityLabel:"Actualizar publicaciones del coro"},
      label(busy?"…":"↻",S.shalomTodayRefreshIcon))),
    ...official.map(item=>h(Pressable,{key:item.type+"-"+item.id,
     style:S.shalomTodayCard,onPress:()=>{
      if(item.type==="medley"){
       const m=model.medleys.find(x=>String(x.id)===item.id);
       if(m)selectMedley(m);
      }else{
       const rep=model.repertoires.find(x=>String(x.id)===item.id);
       if(rep)selectRepertoire(rep);
      }
     },accessibilityRole:"button",accessibilityLabel:"Abrir "+item.label+": "+item.title},
     h(View,{style:S.shalomTodayIconBox},
      h(Image,{source:HOME_IMAGES[item.type==="medley"?"medleys":item.kind==="misa"?"mass":"repertoires"],
       resizeMode:"contain",style:S.shalomTodayImage})),
     h(View,{style:{flex:1,minWidth:0}},
      label(item.label.toUpperCase(),S.shalomTodayLabel),
      h(Text,{style:S.shalomTodayTitle,numberOfLines:2},item.title),
      h(Text,{style:S.shalomTodayMeta,numberOfLines:2},
       [item.count+" "+(item.count===1?"canto":"cantos"),item.subtitle].filter(Boolean).join(" · "))),
     label("›",S.shalomTodayArrow))),
    !official.length?h(View,{style:S.shalomTodayEmpty},
     label(copy?.syncedAt?
      "Cuando publiquen una misa, repertorio o popurrí desde el administrador, aparecerá aquí al actualizar.":
      "Descarga el cancionero para ver las misas y ensayos publicados por SHALOM.",S.shalomTodayEmptyText),
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
   recent?h(View,{style:S.spotifyBlock},
    label("Recientes",S.spotifyHeading),
    h(SectionListCard,{title:recent.title,subtitle:names(recent._artists)||"Último canto consultado",
     onPress:()=>selectSong(recent)})):null,
   likes.length?h(View,{style:S.spotifyBlock},
    label("Mis me gusta",S.spotifyHeading),
    ...likes.slice(0,3).map(song=>h(SectionListCard,{key:song.id,title:song.title,
     subtitle:names(song._artists)||"Canto SHALOM",onPress:()=>selectSong(song)}))):null,
   h(View,{style:S.spotifyBlock},
    label("Descubre más en SHALOM",S.spotifyHeading),
    h(View,{style:S.homeGrid},...[
     ["Categorías","Explorar por tema","categories","Categorías"],
     ["Álbumes","Colecciones oficiales","albums","Álbumes"],
     ["Artistas","Coros y cantores","artists","Artistas"],
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
  const options=[["all","Todos"],["liked","♥ Mis me gusta"],...SONG_TYPES.filter(([code])=>code)];
  const favorites=model.songs.filter(song=>likedSet.has(String(song.id)));
  const showing=onlyLiked?"Mis me gusta":"Todas las canciones";
  return h(View,{style:S.repPage},
   h(LibraryHero,{title:"Canciones",
    subtitle:"Explora nuestro cancionero de letras y acordes.",preset:"sunrise"}),
   !copy?.syncedAt?h(Card,null,
    label("Descarga el cancionero",S.listTitle),
    label("Necesitas descargar primero la biblioteca a este dispositivo.",S.info),
    h(Btn,{text:busy?"Descargando…":"Descargar mis cantos",onPress:manualSync,disabled:busy}),
    busy?h(ActivityIndicator,{color:C.green}):null,
    error?label(error,S.error):null):null,
   h(LibrarySearch,{value:query,onChangeText:v=>{setQuery(v);setCountLimit(80)},
    placeholder:"Buscar canción, artista o letra…",showFilters:libraryFiltersVisible,
    onFilters:()=>setLibraryFiltersVisible(v=>!v)}),
   libraryFiltersVisible?h(LibraryChipRow,{options,value:chosen,
    onChange:val=>{
     setOnlyLiked(val==="liked");
     setTypeFilter(val==="all"||val==="liked"?"":val);
     setCountLimit(80);
    }}):null,
   !onlyLiked&&favorites.length?h(View,{style:S.libraryFavorites},
    h(View,{style:S.libraryTitleRow},
     label("♡  Tus favoritas",S.librarySectionTitle),
     h(Pressable,{onPress:()=>{setOnlyLiked(true);setTypeFilter("");setCountLimit(80)},
      accessibilityRole:"button",accessibilityLabel:"Ver todos mis Me gusta"},
      label("Ver todo  ›",S.libraryMore))),
    label("Cantos que marcaste como Me gusta en este teléfono.",S.librarySubtitle),
    h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
     contentContainerStyle:S.libraryFavoriteRail},
     ...favorites.slice(0,12).map(song=>h(FavoriteSongCard,{key:song.id,song,
      artistName:names(song._artists)||type(song.song_type),
      onOpen:()=>selectSong(song),onLike:()=>toggleLike(song.id)})))):null,
   h(View,{style:S.libraryTitleRow},
    label(showing,S.librarySectionTitle),
    label(eligible.length+" "+(eligible.length===1?"canto":"cantos"),S.libraryCount)),
   h(View,{style:S.libraryList},
    ...eligible.slice(0,countLimit).map(song=>h(LibrarySongRow,{key:song.id,song,
     artistName:names(song._artists)||type(song.song_type),tone:song.tone,
     liked:likedSet.has(String(song.id)),
     onOpen:()=>selectSong(song),onLike:()=>toggleLike(song.id),
     onOptions:()=>setActionSongId(String(song.id))})),
    eligible.length>countLimit?h(Btn,{text:"Mostrar más cantos",secondary:true,
     onPress:()=>setCountLimit(v=>v+80)}):null,
    !eligible.length?h(SectionEmpty,{message:copy?.syncedAt?
     "No hay cantos que coincidan con tu búsqueda.":"Descarga la biblioteca para ver los cantos."}):null));
 }
 function renderArtists(){
  const filtered=model.artists.filter(a=>
   (!artistTypeFilter||normalize(type(a.artist_type))===artistTypeFilter)
   &&matchesSearch([a.name,a.description,a.artist_type],query));
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
  const cards=[
   ["Categorías","Explora por tema o celebración","categories",()=>goTab("Categorías")],
   ["Mis creaciones",personal.collections.reduce((n,c)=>n+c.entries.length,0)+" composiciones personales","repertoires",()=>goTab("Mis colecciones")],
   ["Respaldo personal","Exportar o recuperar datos y fotografías","repertoires",()=>goTab("Respaldo")],
    ["Mis Me gusta",likedIds.length+" cantos guardados en este teléfono","song",
    ()=>goTab("Canciones",{liked:true})],
   ["Popurrís",model.medleys.length+" disponibles · Varios cantos unidos","medleys",()=>goTab("Popurrís")],
   ["Álbumes",model.albums.length+" colecciones musicales","albums",()=>goTab("Álbumes")],
   ["Solicitar canto o corrección","Envía una solicitud al administrador","song",()=>requestForm("song")]
  ];
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Más opciones",subtitle:"Otras secciones de SHALOM",icon:"more"}),
   h(View,{style:S.repCards},
    ...cards.map(([name,subtitle,icon,action])=>h(SectionListCard,{key:name,title:name,
     subtitle,icon,onPress:action}))));
 }
 function renderRepertoires(){
  const sections=[
   ["todos","Todos",null],
   ["misa","Misa","mass"],
   ["ensayo","Ensayo","artists"],
   ["otras","Otras","calendar"]
  ];
  const visible=filterRepertoires(model.repertoires,repertoireFilter,query);
  const iconFor=kind=>kind==="misa"?"mass":kind==="ensayo"?"artists":"calendar";
  return h(View,{style:S.repPage},
   h(View,{style:S.repHeading},
    h(Image,{source:HOME_IMAGES.repertoires,resizeMode:"contain",
     style:S.repHeadingIcon}),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.repTitle,numberOfLines:1,adjustsFontSizeToFit:true,minimumFontScale:.8},"Repertorios"),
     label("Misas, ensayos y celebraciones en un solo lugar",S.repSubtitle))),
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
     const code=repertoireType(rep);
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
    label("+",S.repSuggestIcon)),
   label("Sugerir repertorio",S.repSuggestCaption)
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
     h(Pressable,{onPress:()=>setReaderFont(v=>Math.max(13,v-1)),
      accessibilityRole:"button",accessibilityLabel:"Reducir letras",style:S.songFontButton},
      label("A−",S.songFontText)),
     h(Pressable,{onPress:()=>setReaderFont(v=>Math.min(22,v+1)),
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
  return h(AlignedScore,{rows,fontSize,variant:keyPrefix});
 }
  function renderMultiReadingScore(lyrics,delta,keyPrefix,fontOverride=readerFont){
  const parsed=parseSong(lyrics,delta);
  return renderAlignedScoreRows(parsed,fontOverride,keyPrefix);
 }
 function renderRepertoireDetail(rep){
  const items=Array.isArray(rep.items)?rep.items:[];
  const kind=repertoireType(rep);
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
    ].filter(x=>safeWebUrl(x.url)).slice(0,3);
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
  const filtered=model.albums.filter(a=>
   matchesSearch([a.title,a.description,model.artistMap.get(a.artist_id)?.name],query));
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Álbumes",subtitle:"Colecciones de canciones y artistas",icon:"albums"}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,
    placeholder:"Buscar álbum o artista…"}):null,
   label(filtered.length+" "+(filtered.length===1?"álbum":"álbumes"),S.sectionResults),
   h(View,{style:S.repCards},
    ...filtered.map(a=>h(SectionListCard,{key:a.id,title:a.title,
     subtitle:model.songsForAlbum(a.id).length+" cantos",
     meta:model.artistMap.get(a.artist_id)?.name||a.description,
     icon:"albums",onPress:()=>openDetail({type:"album",id:a.id})})),
    !filtered.length?h(SectionEmpty,{message:"No hay álbumes que coincidan con tu búsqueda."}):null)
  );
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
 function renderToneStepper(text){
  return h(View,{style:S.songToneStepper},
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
 function songPermalink(song){
  return "https://shalomcoroacordes-a11y.github.io/Shalom/cancion.html?id="+encodeURIComponent(String(song.id));
 }
 async function shareSong(song){
  try{
   await Share.share({title:song.title||"Canto de SHALOM",
    message:(song.title||"Canto")+" — SHALOM\n"+songPermalink(song)});
  }catch(e){Alert.alert("No se pudo compartir",e?.message||"Inténtalo nuevamente.")}
 }
 async function printSong(song){
  try{
   await Print.printAsync({html:buildPrintableSong(song,readerShiftForPrint(song,transpose,capo))});
  }catch(e){
   Alert.alert("No se pudo abrir la impresión",e?.message||"Revisa el servicio de impresión del teléfono.");
  }
 }
 async function checkSongOffline(song){
  if(copy?.syncedAt&&model.songs.some(s=>String(s.id)===String(song.id))){
   return Alert.alert("Disponible sin conexión",
    "Este canto ya está guardado en la biblioteca de SHALOM. Puedes abrirlo sin internet.");
  }
  return manualSync();
 }
 function addSongLocally(song,kind,choice){
  const result=addToPersonal(personal,String(song.id),kind,choice);
  if(result.added)savePersonal(result.store,{notice:"Agregado a tu "+({misa:"misa",popurri:"popurrí",repertorio:"repertorio"}[kind]||"colección")+" personal"});
  return result;
 }
 function openSongVideo(song){
  const videos=[...(song._links||[]).map(link=>link.url),song.tutorial_guitar,song.tutorial_piano]
   .map(safeWebUrl).filter(Boolean);
  const found=videos.find(link=>/youtube\.com|youtu\.be/i.test(link));
  if(!found)return Alert.alert("Sin video registrado","Este canto todavía no tiene un enlace de YouTube.");
  if(!network.online)return Alert.alert("Requiere internet","Conéctate para abrir el video.");
  openWeb(found);
 }
 function renderSongDetail(song){
  const choices=[{id:"none",label:"Sin capo",position:0,key:""}];
  if(Number(song.capo_position)>0)choices.push({id:"main",label:"Capo "+song.capo_position,
   position:Number(song.capo_position),key:song.capo_key||""});
  for(const item of song._capos||[])choices.push({
   id:item.id,label:item.label||"Capo "+item.capo_position,
   position:Number(item.capo_position||0),key:item.capo_key||""});
  const chosen=choices.find(c=>c.id===capo)||choices[0];
  const root=String(song.tone||"").trim().match(/[A-G](?:#|b)?/);
  const rootOf=str=>String(str||"").match(/[A-G](?:#|b)?/)?.[0]||"";
  const normRoot=root=>({"Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#"}[root]||root);
  const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  let capoOffset=0;
  if(chosen.id!=="none"){
   const from=NOTES.indexOf(normRoot(root?.[0]||""));
   const to=NOTES.indexOf(normRoot(rootOf(chosen.key)));
   capoOffset=from>=0&&to>=0?((to-from+12)%12):(-chosen.position||0);
   if(capoOffset>6)capoOffset-=12;
  }
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
    h(View,{style:S.songControls},
     renderToneStepper("Tono "+toned),
     h(View,{style:S.songFontControl},
      h(Pressable,{onPress:()=>setReaderFont(v=>Math.max(13,v-1)),
       accessibilityRole:"button",accessibilityLabel:"Reducir tamaño de letra",style:S.songFontButton},
       label("A−",S.songFontText)),
      h(Pressable,{onPress:()=>setReaderFont(v=>Math.min(22,v+1)),
       accessibilityRole:"button",accessibilityLabel:"Aumentar tamaño de letra",style:S.songFontButton},
       label("A+",S.songFontText)))),
    h(View,{style:S.songSecondaryControls},
     h(Pressable,{style:S.songCapoButton,onPress:()=>{
       if(choices.length>1)setCapoExpanded(v=>!v);
       else Alert.alert("Capo","No hay variantes de capo registradas para este canto.");
      },accessibilityRole:"button",accessibilityLabel:"Seleccionar capo"},
      label("Capo: "+(chosen.id==="none"?"—":chosen.position)+"  ▾",S.songControlText)),
     h(Pressable,{style:S.songResetButton,onPress:resetTone,
      accessibilityRole:"button",accessibilityLabel:"Restablecer tono original"},
      label("Restablecer tono",S.multiTextActionLabel)))),
   capoExpanded&&choices.length>1?h(View,{style:S.songCapoVariants},
    ...choices.map(item=>h(Chip,{key:String(item.id),text:item.label,
     active:item.id===capo,onPress:()=>{setCapo(item.id);setCapoExpanded(false)}}))):null,
   chosen.id!=="none"?label("Capo "+chosen.position+(chosen.key?" · Figuras en "+chosen.key:""),S.songCapoNote):null,
   h(View,{style:S.songScorePlain},
    renderAlignedScoreRows(parsed,readerFont,"song-"+song.id))
  );
 }
 function renderRequest(){
  return h(View,null,
   title("Solicitudes y correcciones","Los administradores de SHALOM revisarán cada mensaje."),
   !network.online?label("Para enviar una solicitud necesitas conexión. Puedes seguir consultando los cantos descargados sin internet.",S.error):null,
   label("¿Qué deseas solicitar?",S.fieldTitle),
   h(View,{style:S.chips},
    ...Object.entries(TYPES).map(([kind,name])=>h(Chip,{key:kind,text:name,active:requestKind===kind,onPress:()=>setRequestKind(kind)}))),
   inputField("Nombre del canto o tema",requestTitle,setRequestTitle,{maxLength:160,placeholder:"Ej. Canto de entrada"}),
   inputField("Artista o ministerio (opcional)",requestArtist,setRequestArtist,{maxLength:160}),
   inputField("Enlace de YouTube o referencia (opcional)",requestLink,setRequestLink,{url:true,maxLength:400,placeholder:"https://…"}),
   inputField("¿Qué propones o qué debemos corregir?",requestDetails,setRequestDetails,{
    multiline:true,maxLength:2500,placeholder:"Describe dónde está el error o qué canto te gustaría agregar…"}),
   inputField("Tu nombre (opcional)",requestName,setRequestName,{maxLength:120}),
   inputField("Correo de contacto (opcional)",requestEmail,setRequestEmail,{email:true,maxLength:160}),
   h(Btn,{text:sending?"Enviando solicitud…":"Enviar al administrador",onPress:submitRequest,disabled:sending}),
   label("Se requiere internet para enviar. No modifica la canción directamente.",S.smallMuted)
  );
 }
 function metric(name,n){return h(View,{style:S.metric,key:name},label(String(n),S.metricNumber),label(name,S.smallMuted))}
 const page=detail?.type==="repertoire"&&focusedRepertoire?renderRepertoireDetail(focusedRepertoire)
  :detail?.type==="medley"&&focusedMedley?renderMedleyDetail(focusedMedley)
   :detail?.type==="song"&&active?renderSongDetail(active)
  :detail?.type==="artist"&&focusedArtist?renderArtistDetail(focusedArtist)
  :detail?.type==="album"&&focusedAlbum?renderAlbumDetail(focusedAlbum)
  :tab==="Canciones"?renderSongs():tab==="Popurrís"?renderMedleys():tab==="Artistas"?renderArtists()
  :tab==="Categorías"?renderCategories():tab==="Álbumes"?renderAlbums():tab==="Repertorios"?renderRepertoires()
  :tab==="Mis colecciones"?h(PersonalCollectionsScreen,{store:personal,onChange:savePersonal,songs:model.songs,renderScore:renderMultiReadingScore,onSelectSong:selectSong,filterKind:personalFilter,onClearFilter:()=>setPersonalFilter(null),
    registerBack:registerNestedBack,initialNav:personalNavRef.current,onNavChange:next=>{personalNavRef.current=next;}})
   :tab==="Perfil"?h(ProfileScreen,{profile,onChange:saveProfile,likedSongs:model.songs.filter(s=>likedSet.has(String(s.id))),
     personal,openSong:selectSong,onLiked:toggleLike,onCollections:(kind,action)=>goTab("Mis colecciones",{personalKind:kind||null,personalAction:action||null}),
      onOpenPersonal:(folderId,entryId,parts)=>goTab("Mis colecciones",{
       personalNav:{view:parts?"reading":"editing",folderId,entryId,editReturn:"home"}}),
     onSongs:liked=>goTab("Canciones",{liked}),onRepertoires:()=>goTab("Repertorios"),editNonce:profileEditNonce,registerBack:registerNestedBack})
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
      {text:"Pantalla completa",onPress:()=>setImmersive(true)},
      {text:"Tono original",onPress:()=>{setTranspose(0);setCapo("none")}},
      {text:"Cancelar",style:"cancel"}]),accessibilityRole:"button",accessibilityLabel:active?"Opciones de canción":"Opciones de lectura"},
     label("⋮",S.songTopMoreText))):
  !immersiveActive&&!detail&&!settingsOpen&&["Repertorios","Canciones","Artistas","Categorías","Popurrís","Álbumes","Mis colecciones","Más","Perfil","Respaldo"].includes(tab)?h(View,{style:S.repTopBar},
   h(Pressable,{style:S.repTopBack,onPress:()=>back(),accessibilityRole:"button",accessibilityLabel:"Regresar"},
    label("←",S.repTopBackSymbol)),
   h(View,{style:S.repTopBrand},
    h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repTopLogo}),
    h(View,{style:{flex:1,minWidth:0}},
     label("SHALOM",S.repTopName),
     label("Coro y Alabanza",S.repTopSub))),
   (tab!=="Canciones"&&tab!=="Artistas"&&tab!=="Más"&&tab!=="Mis colecciones"&&tab!=="Perfil"&&tab!=="Respaldo")?h(Pressable,{style:S.repTopAction,onPress:()=>{
     if(tab==="Repertorios"){setRepertoireSearchOpen(v=>!v)}
     else{setSectionSearchOpen(v=>!v)}
     setQuery("");
    },accessibilityRole:"button",accessibilityLabel:(tab==="Repertorios"?repertoireSearchOpen:sectionSearchOpen)?"Ocultar búsqueda":"Buscar en "+tab},
    h(Image,{source:HOME_IMAGES.search,resizeMode:"contain",style:S.repTopActionIcon})):h(View,{style:S.repTopAction}),
   h(Pressable,{style:S.repTopAction,onPress:()=>tab==="Perfil"?openProfileMenu():tab==="Más"?setSettingsOpen(true):goTab("Más"),
    accessibilityRole:"button",accessibilityLabel:tab==="Más"?"Abrir configuración":"Más opciones"},
    tab==="Más"?label("⚙",S.sectionHeaderGear):tab==="Perfil"?label("⋯",S.sectionHeaderGear):
     h(Image,{source:HOME_IMAGES.more,resizeMode:"contain",style:S.repTopActionIcon}))):
  !immersiveActive&&tab==="Inicio"&&!detail&&!settingsOpen?h(View,{style:S.homeTopBar},
   h(View,{style:S.spotifyHomeBrand},
    h(Image,{source:HOME_IMAGES.logo,style:S.spotifyHomeLogo,resizeMode:"contain",accessibilityLabel:"Paloma original de SHALOM"}),
    h(View,null,label("SHALOM",S.spotifyHomeBrandName),label("Coro y Alabanza",S.spotifyHomeBrandSub))),
   h(Pressable,{onPress:()=>goTab("Canciones"),accessibilityRole:"button",accessibilityLabel:"Buscar canciones",style:S.homeTopButton},
    h(Image,{source:HOME_IMAGES.search,style:S.homeTopIcon,resizeMode:"contain"})),
   h(Pressable,{onPress:()=>setSettingsOpen(true),accessibilityRole:"button",accessibilityLabel:"Estado y ajustes del cancionero",style:S.homeTopButton},
    h(Image,{source:HOME_IMAGES.bell,style:S.homeTopIcon,resizeMode:"contain"}),
    h(View,{style:S.homeBellDot}))):
  !immersiveActive&&settingsOpen?h(AppSectionHeader,{section:"Configuración",onBack:()=>setSettingsOpen(false)}):
  !immersiveActive&&detail&&!isReader?h(AppDetailHeader,{
   section:detail.type==="artist"?"Artista":detail.type==="album"?"Álbum":
    detail.type==="medley"?"Popurrí":detail.type==="repertoire"?"Repertorio":"Detalle",
   onBack:back
  }):
  !immersiveActive?h(AppSectionHeader,{
   section:tab==="Solicitar"?"Solicitudes":tab,
   onSettings:()=>setSettingsOpen(true)
  }):null,
  !loaded?h(View,{style:{flex:1,justifyContent:"center"}},h(ActivityIndicator,{color:C.green})):
  h(ScrollView,{key:(detail?.type||tab)+(detail?.id||""),style:{flex:1},
   contentContainerStyle:detail&&(detail.type==="medley"||detail.type==="repertoire")?S.multiPage:S.page,
   keyboardShouldPersistTaps:"handled"},
   settingsOpen?renderSettings():page,h(View,{style:{height:27}})),
  !immersiveActive&&!settingsOpen&&detail?.type==="song"&&active?h(View,{style:S.songActionBar},
   ...[
    ["T−","Tono −",()=>adjustTone(-1)],
    ["T+","Tono +",()=>adjustTone(1)],
    ["▤","Imprimir",()=>printSong(active)],
    ["↗","Compartir",()=>shareSong(active)],
    ["▶","YouTube",()=>openSongVideo(active)]
   ].map(([symbol,name,onPress])=>h(Pressable,{key:name,style:S.songActionItem,
    onPress,accessibilityRole:"button",accessibilityLabel:name},
    label(symbol,S.songActionIcon),label(name,S.songActionLabel)))):null,
  !immersiveActive&&!settingsOpen&&isReader&&detail?.type!=="song"?h(View,{style:S.songActionBar},
   ...[
    ["T−","Tono −",()=>adjustTone(-1)],
    ["T+","Tono +",()=>adjustTone(1)],
    ["↗","Compartir",shareMultiReading],
    ["A−","Letra −",()=>setReaderFont(v=>Math.max(13,v-1))],
    ["A+","Letra +",()=>setReaderFont(v=>Math.min(22,v+1))]
   ].map(([symbol,name,onPress])=>h(Pressable,{key:name,style:S.songActionItem,
    onPress,accessibilityRole:"button",accessibilityLabel:name},
    label(symbol,S.songActionIcon),label(name,S.songActionLabel)))):null,
  !immersiveActive&&!settingsOpen&&!isReader?h(View,{style:[S.nav,tab==="Inicio"&&!detail&&S.homeNav]},
   ...tabs.map(([name,icon])=>{
    const selected=isSelectedTab(tab,name)&&!detail;
    const homeIcon=HOME_IMAGES[icon];
    return h(Pressable,{key:name,accessibilityRole:"tab",accessibilityState:{selected},
     onPress:()=>goTab(name),style:[S.navItem,selected&&S.navSelected]},
     name==="Perfil"?h(View,{style:S.profileNavIcon},
       h(View,{style:[S.profileNavHead,{borderColor:selected?C.green:C.text}]}),
       h(View,{style:[S.profileNavBody,{borderColor:selected?C.green:C.text}]})):
      homeIcon?h(Image,{source:homeIcon,resizeMode:"contain",style:[S.homeNavIcon,{tintColor:selected?C.green:C.text}]}):
      label(icon,[S.navIcon,selected&&{color:C.green}]),
     label(name,[S.navText,selected&&{color:C.green}]));})) : null,
  actionSong?h(SongActionsSheet,{key:String(actionSong.id),song:actionSong,
   liked:hasFavorite(likedIds,actionSong.id),offline:Boolean(copy?.syncedAt),
   store:personal,onDismiss:()=>setActionSongId(null),
   onLike:()=>toggleLike(actionSong.id),onShare:()=>shareSong(actionSong),
   onPrint:()=>printSong(actionSong),onDownload:()=>checkSongOffline(actionSong),
   onFullScreen:()=>setImmersive(true),onResetTone:resetTone,
   onAdd:(kind,choice)=>addSongLocally(actionSong,kind,choice)}):null,
   !immersiveActive?h(LocalNotice,{notice,
    bottom:settingsOpen||tab==="Respaldo"?22:detail?96:tab==="Inicio"?91:86,
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
const S=StyleSheet.create({
 libraryList:{gap:9,paddingBottom:10},
 libraryTitleRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",
  gap:10,marginTop:12,marginBottom:8},
 librarySectionTitle:{fontSize:19,fontWeight:"900",color:C.text,flexShrink:1},
 libraryCount:{fontSize:11,fontWeight:"750",color:C.green},
 libraryMore:{fontSize:12,color:C.green,fontWeight:"800"},
 libraryFavorites:{marginTop:3,marginBottom:15,gap:2},
 librarySubtitle:{fontSize:11,color:C.muted,marginBottom:7},
 libraryFavoriteRail:{flexDirection:"row",gap:9,paddingBottom:3},

 songReaderIntro:{paddingHorizontal:2,paddingTop:4,paddingBottom:10,gap:7},
 songReaderKicker:{color:C.green,fontWeight:"900",letterSpacing:1.5,fontSize:11},
 songReaderTitleRow:{flexDirection:"row",alignItems:"center",gap:10},
 songReaderTitle:{fontSize:24,lineHeight:30,fontWeight:"900",color:C.text},
 songReaderArtist:{color:C.muted,fontSize:12,marginTop:3},
 songReaderBadges:{flexDirection:"row",alignItems:"center",gap:9},
 songReaderToneBadge:{paddingVertical:6,paddingHorizontal:11,borderRadius:13,
  borderWidth:1,borderColor:"#24684f",backgroundColor:"#153a31"},
 songReaderToneText:{fontSize:14,color:C.pale,fontWeight:"900"},
 songReaderHint:{fontSize:11,color:C.muted},
 // Área de lectura abierta: sin borde, fondo de tarjeta ni recorte de renglones.
 songScorePlain:{width:"100%",marginTop:13,paddingBottom:10},

 spotifyHomeBrand:{flex:1,flexDirection:"row",alignItems:"center",gap:6},
 spotifyHomeLogo:{height:45,width:52},
 spotifyHomeBrandName:{fontSize:20,color:C.text,fontWeight:"900",letterSpacing:.5},
 spotifyHomeBrandSub:{fontSize:10.5,color:C.muted},
 profileNavIcon:{height:28,width:28,alignItems:"center",justifyContent:"center",overflow:"hidden"},
 profileNavHead:{position:"absolute",top:1,width:11,height:11,borderRadius:12,borderWidth:2},
 profileNavBody:{position:"absolute",bottom:1,width:22,height:12,borderTopLeftRadius:11,borderTopRightRadius:11,
  borderWidth:2,borderBottomWidth:1},

 spotifyWelcome:{paddingVertical:8,gap:3},
 spotifyWelcomeTitle:{fontSize:23,fontWeight:"900",color:C.text},
 spotifyWelcomeText:{fontSize:13,color:C.muted},
 spotifyBanner:{position:"relative",borderRadius:19,overflow:"hidden",borderWidth:1,borderColor:"#376c59",marginBottom:15},
 spotifyBannerOverlay:{position:"absolute",top:0,left:0,right:0,bottom:0},
 spotifyBannerContent:{position:"absolute",left:15,right:15,top:18,bottom:14,justifyContent:"space-between",alignItems:"flex-start"},
 spotifyBannerEyebrow:{fontSize:10,color:"#9ffbca",fontWeight:"900",letterSpacing:1},
 spotifyBannerTitle:{fontSize:22,color:C.text,fontWeight:"900",lineHeight:27,maxWidth:"95%"},
 spotifyBannerSubtitle:{fontSize:12,color:"#f0f5f2",maxWidth:"92%"},
 spotifyBannerButton:{paddingHorizontal:15,paddingVertical:9,borderRadius:99,backgroundColor:C.green,alignSelf:"flex-start"},
 spotifyBannerButtonLabel:{fontSize:12,color:"#0c3022",fontWeight:"900"},
 // Cuatro accesos minimalistas con contador, sin ilustraciones detrás del texto.
 spotifyShortcuts:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",
  rowGap:10,marginBottom:18},
 spotifyShortcut:{width:"48.6%",minHeight:118,overflow:"hidden",position:"relative",
  padding:12,borderRadius:15,borderWidth:1,borderColor:"#406457",justifyContent:"space-between"},
 spotifyShortcutBackground:{position:"absolute",top:0,bottom:0,left:0,right:0},
 spotifyShortcutTop:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between"},
 spotifyShortcutSymbolBox:{height:35,width:35,borderRadius:11,backgroundColor:"#245448",
  justifyContent:"center",alignItems:"center"},
 spotifyShortcutImage:{width:23,height:23,tintColor:C.pale},
 spotifyShortcutIcon:{fontSize:26,color:C.pale,fontWeight:"900"},
 spotifyShortcutCount:{minWidth:31,minHeight:26,paddingHorizontal:7,borderRadius:99,
  alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#467667",
  backgroundColor:"#203a35"},
 spotifyShortcutCountText:{fontSize:12,color:C.pale,fontWeight:"850"},
 spotifyShortcutText:{gap:2,alignItems:"flex-start",marginTop:10},
 spotifyShortcutName:{fontSize:14,color:C.text,fontWeight:"850",textAlign:"left"},
 spotifyShortcutSubtitle:{fontSize:10.5,color:C.muted,lineHeight:14},
 shalomToday:{gap:9,marginBottom:20,marginTop:0},
 shalomTodayHeader:{flexDirection:"row",alignItems:"center",gap:9,marginBottom:2},
 shalomTodayHeading:{fontSize:19,fontWeight:"900",color:C.text},
 shalomTodaySubheading:{fontSize:11.5,color:C.muted,marginTop:3,lineHeight:16},
 shalomTodayRefresh:{height:38,width:38,alignItems:"center",justifyContent:"center",
  borderWidth:1,borderColor:"#406457",borderRadius:12,backgroundColor:"#17362e"},
 shalomTodayRefreshIcon:{color:C.green,fontSize:24,fontWeight:"750"},
 shalomTodayCard:{flexDirection:"row",alignItems:"center",gap:11,padding:12,minHeight:91,
  backgroundColor:"#18262b",borderRadius:14,borderWidth:1,borderColor:"#365d52"},
 shalomTodayIconBox:{width:49,height:49,borderRadius:12,backgroundColor:"#214c40",
  alignItems:"center",justifyContent:"center"},
 shalomTodayImage:{width:28,height:28,tintColor:C.pale},
 shalomTodayLabel:{fontSize:10,fontWeight:"850",color:C.green,letterSpacing:.5},
 shalomTodayTitle:{fontSize:14,fontWeight:"900",color:C.text,lineHeight:19,marginTop:2},
 shalomTodayMeta:{color:C.muted,fontSize:11,lineHeight:15,marginTop:4},
 shalomTodayArrow:{fontSize:27,color:C.pale},
 shalomTodayEmpty:{paddingHorizontal:14,paddingVertical:15,borderRadius:13,
  borderWidth:1,borderColor:"#365249",backgroundColor:"#16272b",gap:10},
 shalomTodayEmptyText:{fontSize:12,color:C.muted,lineHeight:18},
 spotifyBlock:{gap:7,marginTop:12,marginBottom:15},
 spotifyHeading:{color:C.text,fontWeight:"900",fontSize:18},

 artistGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:12},
 artistGridCard:{width:"48%",padding:12,backgroundColor:"#19332d",borderWidth:1,borderColor:"#3e6757",
  borderRadius:15,alignItems:"center",justifyContent:"center",minHeight:175,gap:5},
 artistGridTitle:{color:C.text,fontWeight:"900",fontSize:14,lineHeight:19,textAlign:"center"},
 artistGridMeta:{color:C.muted,fontSize:11,textAlign:"center"},
 artistGridCount:{color:C.green,fontSize:11,fontWeight:"750"},

 root:{flex:1,backgroundColor:C.bg},
 sectionTopBar:{backgroundColor:C.bg,minHeight:62,paddingHorizontal:10,flexDirection:"row",alignItems:"center",
  borderBottomWidth:1,borderBottomColor:"#24363e"},
 sectionHeaderSide:{width:48,height:50,alignItems:"center",justifyContent:"center"},
 sectionHeaderArrow:{fontSize:30,color:C.text,fontWeight:"600",lineHeight:36},
 sectionHeaderGear:{fontSize:24,color:C.pale,lineHeight:30},
 sectionHeaderIdentity:{flex:1,minWidth:0,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:6},
 sectionHeaderLogo:{width:53,height:44},
 sectionHeaderBrand:{fontSize:20,fontWeight:"900",letterSpacing:.5,color:C.text},
 sectionHeaderSubtitle:{fontSize:11,color:C.muted,marginTop:1},

 globalBrand:{flex:1,flexDirection:"row",alignItems:"center",gap:7},
 globalBrandDove:{width:48,height:38},
 globalBrandName:{fontSize:19,fontWeight:"900",color:C.text,letterSpacing:.7},
 repTopBar:{backgroundColor:C.bg,minHeight:66,flexDirection:"row",alignItems:"center",paddingHorizontal:8,gap:3,borderBottomWidth:1,borderColor:"#243c3e"},
 repTopBack:{width:39,height:51,alignItems:"center",justifyContent:"center"},
 repTopBackSymbol:{color:C.text,fontSize:28,fontWeight:"600"},
 repTopBrand:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4},
 repTopLogo:{width:63,height:52},
 repTopName:{fontWeight:"900",fontSize:19,color:C.text,letterSpacing:.5},
 repTopSub:{fontSize:10,color:C.muted,marginTop:2},
 repTopAction:{width:38,height:45,alignItems:"center",justifyContent:"center"},
 repTopActionIcon:{width:25,height:25,tintColor:C.text},
 repPage:{paddingTop:10,minHeight:320},
 repHeading:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:16},
 repHeadingIcon:{width:50,height:50,tintColor:C.green},
 repTitle:{fontSize:26,fontWeight:"900",lineHeight:33,color:C.text},
 repSubtitle:{fontSize:13,color:C.muted,lineHeight:19},
 repFilters:{flexDirection:"row",alignItems:"center",gap:7,paddingBottom:5,marginBottom:11},
 repFilterChip:{minHeight:44,borderRadius:99,borderWidth:1,borderColor:"#4f6870",backgroundColor:"#13272d",paddingHorizontal:13,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:6},
 repFilterActive:{backgroundColor:C.green,borderColor:C.green},
 repFilterIcon:{width:19,height:19},
 repFilterText:{fontSize:12.5,fontWeight:"800",color:C.text},
 repFilterTextActive:{color:"#05271d"},
 repSearchInput:{backgroundColor:C.sub,borderColor:C.border,borderWidth:1,borderRadius:14,paddingHorizontal:14,minHeight:46,color:C.text,fontSize:14,marginBottom:16},
 repCards:{gap:9},
 sectionFiltersCompact:{marginBottom:4},
 sectionResults:{fontSize:12,color:C.muted,marginBottom:12,marginTop:3},
 sectionSupporting:{fontSize:12,lineHeight:17,color:C.muted,marginBottom:10},
 categoryPath:{marginBottom:14,gap:4},
 categoryBack:{alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:12,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.sub},
 categoryBackText:{fontSize:13,color:C.pale,fontWeight:"800"},
 categoryPathText:{fontSize:11,color:C.muted,lineHeight:17},
 categorySongHeading:{marginTop:12,marginBottom:3,gap:4},
 categorySongTitle:{fontSize:18,fontWeight:"850",color:C.text},
 repCard:{minHeight:78,backgroundColor:"#20313b",borderColor:"#334b51",borderWidth:1,borderRadius:15,flexDirection:"row",alignItems:"center",gap:10,paddingVertical:9,paddingHorizontal:11},
 repCardIconWrap:{height:50,width:50,borderRadius:12,backgroundColor:"#14664a",alignItems:"center",justifyContent:"center"},
 repCardIcon:{height:31,width:31,tintColor:"#61ffb3"},
 repCardTitle:{fontSize:16,fontWeight:"850",lineHeight:21,color:C.text},
 repCardCount:{fontSize:12.5,color:C.muted,marginTop:3},
 repCardMeta:{fontSize:10.5,color:C.muted,marginTop:3},
 repArrow:{fontSize:27,color:C.text,marginHorizontal:1},
 repEmptyCard:{minHeight:122,alignItems:"center",justifyContent:"center",backgroundColor:C.panel,borderRadius:14,borderWidth:1,borderColor:C.border,padding:15},
 repEmptyLogo:{width:70,height:40,opacity:.55},
 repEmptyText:{fontSize:13,lineHeight:20,color:C.muted,textAlign:"center",marginTop:10},
 repSuggest:{width:52,height:52,borderRadius:14,backgroundColor:C.green,alignSelf:"flex-end",alignItems:"center",justifyContent:"center",marginTop:13,marginRight:2},
 repSuggestIcon:{fontSize:37,color:"#07251a",lineHeight:43,fontWeight:"500"},
 repSuggestCaption:{fontSize:11,color:C.muted,textAlign:"right",marginRight:2,marginTop:5},

 homeTopBar:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingTop:3,backgroundColor:C.bg},
 homeTopButton:{width:46,height:46,justifyContent:"center",alignItems:"center",position:"relative"},
 homeTopIcon:{height:27,width:27,tintColor:C.text},
 homeBellDot:{position:"absolute",right:6,top:7,width:9,height:9,borderRadius:5,backgroundColor:C.green},
 homeContainer:{paddingBottom:6},
 homeBrand:{alignItems:"center",justifyContent:"center",paddingTop:3,paddingBottom:22,minHeight:210,overflow:"hidden"},
 homeWaves:{position:"absolute",width:"120%",height:155,top:22,left:"-10%",opacity:.55},
 homeLogo:{width:186,height:112},
 homeBrandName:{fontSize:35,fontWeight:"900",color:C.text,letterSpacing:2,marginTop:-3},
 homeBrandSub:{fontSize:11,fontWeight:"800",color:C.pale,letterSpacing:2,marginTop:3},
 homeSearchWrap:{flexDirection:"row",alignItems:"center",backgroundColor:C.sub,borderColor:"#557575",borderWidth:1,borderRadius:28,paddingHorizontal:14,minHeight:53,marginBottom:21},
 homeSearchIcon:{fontSize:30,color:C.text,marginRight:9},
 homeSearch:{flex:1,color:C.text,fontSize:13,minHeight:49,paddingVertical:8},
 homeResults:{gap:5,marginBottom:17},
 homeGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:9,marginBottom:17},
 homeTile:{width:"48.6%",minHeight:76,backgroundColor:C.panel,borderWidth:1,borderColor:"#405761",borderRadius:14,paddingHorizontal:7,paddingVertical:8,flexDirection:"row",alignItems:"center",gap:5},
 homeTileIcon:{height:36,width:34,backgroundColor:"#08704f",borderRadius:10,justifyContent:"center",alignItems:"center"},
 homeTileImage:{height:24,width:24,tintColor:"#effff8"},
 homeTileName:{fontSize:13.3,fontWeight:"800",color:C.text},
 homeTileSubtitle:{fontSize:10.1,lineHeight:13.5,color:C.muted,marginTop:3},
 homeTileArrow:{fontSize:19,color:C.text,marginRight:1},
 homeFeature:{borderColor:C.green,borderWidth:1,borderRadius:18,minHeight:100,overflow:"hidden",justifyContent:"center"},
 homeFeatureBackground:{position:"absolute",width:"100%",height:"100%",left:0,top:0},
 homeFeatureText:{marginLeft:"29%",paddingVertical:12,paddingRight:12},
 homeFeatureKicker:{fontSize:14,color:C.text},
 homeFeatureTitle:{fontSize:20,fontWeight:"900",color:C.text,marginVertical:2},
 homeFeatureButton:{borderWidth:1,borderColor:C.green,borderRadius:99,alignSelf:"flex-start",marginTop:6,paddingHorizontal:11,paddingVertical:5,backgroundColor:"#103a31"},
 homeFeatureLink:{fontSize:11,fontWeight:"800",color:C.pale},
 homeNeedsSync:{alignItems:"center",paddingVertical:12},
 homeSyncText:{fontSize:12,color:C.pale},
 homeNav:{marginHorizontal:14,marginBottom:7,borderRadius:18,borderWidth:1,borderColor:C.border,paddingVertical:6,minHeight:64,overflow:"hidden"},
 homeNavIcon:{height:25,width:25},
 songTopBar:{backgroundColor:C.bg,flexDirection:"row",alignItems:"center",minHeight:60,paddingHorizontal:11,borderBottomWidth:1,borderColor:"#2a3a40"},
 songBackButton:{width:46,height:50,justifyContent:"center",alignItems:"center"},
 songBackSymbol:{color:C.text,fontSize:39,lineHeight:42},
 songTopBrand:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},
 songTopLogo:{width:54,height:42},
 songTopName:{color:C.text,fontWeight:"900",fontSize:23,letterSpacing:.6},
 songTopMore:{width:44,height:50,alignItems:"center",justifyContent:"center"},
 songTopMoreText:{color:C.text,fontSize:29,lineHeight:39},
 songReader:{paddingBottom:11},
 songMetaRow:{flexDirection:"row",alignItems:"center",gap:9,borderBottomWidth:1,borderColor:C.border,paddingBottom:9,marginBottom:10},
 songMetaIcon:{width:46,height:52,borderRadius:11,backgroundColor:"#1c3938",alignItems:"center",justifyContent:"center"},
 songMetaIconImage:{width:29,height:29,tintColor:C.green},
 songHeading:{fontSize:19,fontWeight:"900",color:C.text,lineHeight:24},
 songArtist:{fontSize:13,color:C.muted,marginTop:2,marginBottom:4},
 songTypeBadge:{backgroundColor:"#195447",borderRadius:99,paddingHorizontal:10,paddingVertical:3,alignSelf:"flex-start"},
 songTypeText:{color:C.pale,fontSize:12,fontWeight:"850"},
 songLikeButton:{width:50,minHeight:57,alignItems:"center",justifyContent:"center"},
 songHeart:{fontSize:43,color:C.text,lineHeight:49,fontWeight:"400"},
 songHeartActive:{color:C.green},
 songControls:{flexDirection:"row",alignItems:"center",gap:7,paddingVertical:7,borderBottomWidth:1,borderColor:C.border,justifyContent:"space-between"},
 songControlsStack:{marginBottom:3},
 songToneStepper:{flex:1.8,minHeight:44,borderRadius:22,borderWidth:1,borderColor:"#577179",
  backgroundColor:C.sub,flexDirection:"row",alignItems:"center",paddingHorizontal:1},
 songToneStepButton:{width:40,minHeight:44,alignItems:"center",justifyContent:"center"},
 songToneStepText:{fontSize:24,fontWeight:"850",color:C.pale,lineHeight:29},
 songToneCurrent:{flex:1,fontSize:11.5,fontWeight:"800",color:C.text,textAlign:"center"},
 songSecondaryControls:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,paddingTop:4},
 songCapoButton:{minHeight:36,borderColor:C.border,borderWidth:1,borderRadius:18,
  backgroundColor:C.sub,justifyContent:"center",alignItems:"center",paddingHorizontal:12},
 songResetButton:{minHeight:36,justifyContent:"center",alignItems:"center",paddingHorizontal:6},
 songToneControl:{flex:1,minHeight:43,borderRadius:23,borderWidth:1,borderColor:"#577179",backgroundColor:C.sub,alignItems:"center",justifyContent:"center",paddingHorizontal:3},
 songControlText:{fontSize:12,color:C.text,fontWeight:"750",textAlign:"center"},
 songFontControl:{flex:0.9,flexDirection:"row",minHeight:44,borderRadius:22,borderWidth:1,borderColor:"#577179",backgroundColor:C.sub,alignItems:"center",justifyContent:"space-evenly"},
 songFontButton:{flex:1,alignItems:"center",justifyContent:"center",minHeight:44},
 songFontText:{fontSize:19,fontWeight:"850",color:C.text},
 songCapoVariants:{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:10},
 songCapoNote:{fontSize:11,color:C.pale,marginTop:8},
 songScoreScroll:{marginTop:0,marginBottom:4},
 songScoreContent:{paddingVertical:3,paddingHorizontal:3,minWidth:"100%"},
 songSectionRow:{flexDirection:"row",alignItems:"center",gap:9,marginTop:14,marginBottom:6,minWidth:150},
 songSectionPill:{borderWidth:0,borderRadius:0,paddingVertical:3,paddingHorizontal:1,backgroundColor:"transparent"},
 songChorusPill:{backgroundColor:"transparent"},
 songSectionText:{fontSize:14,color:C.green,fontWeight:"850"},
 songChorusText:{color:C.green},
 songSectionRule:{height:1,backgroundColor:"#386259",flex:1,minWidth:18,opacity:.65},
 songScoreBody:{minWidth:"100%",paddingHorizontal:5,paddingTop:6,paddingBottom:14,alignItems:"flex-start"},
 songScoreText:{fontFamily:MONO,fontWeight:"normal",letterSpacing:0,includeFontPadding:false},
 songPair:{marginBottom:9},
 songChord:{color:C.green,fontWeight:"normal"},
 songLyric:{color:C.text,fontWeight:"normal"},
 songActionBar:{backgroundColor:"#12212a",flexDirection:"row",justifyContent:"space-around",minHeight:62,borderTopWidth:1,borderColor:"#4a6267",paddingVertical:4},
 songActionItem:{flex:1,alignItems:"center",justifyContent:"center",minHeight:52},
 songActionIcon:{fontSize:21,color:C.text,lineHeight:26,fontWeight:"800"},
 songActionLabel:{fontSize:10,color:C.text,fontWeight:"800",marginTop:2},
 multiPage:{paddingHorizontal:18,paddingTop:11,paddingBottom:20},
 multiReader:{paddingBottom:9},
 multiDescription:{fontSize:13,color:C.muted,lineHeight:19,marginTop:-2,marginBottom:9},
 multiControlArea:{marginBottom:9},
 multiControlFooter:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:3,gap:8},
 multiTextAction:{minHeight:36,justifyContent:"center",paddingHorizontal:5},
 multiTextActionLabel:{fontSize:12,color:C.pale,fontWeight:"750"},
 multiPart:{paddingTop:5,paddingBottom:16},
 multiPartDivider:{borderTopWidth:1,borderTopColor:"#334e4b",paddingTop:17,marginTop:7},
 multiPartHeading:{flexDirection:"row",alignItems:"center",gap:9,paddingBottom:3},
 multiPartNumber:{width:33,height:33,alignItems:"center",justifyContent:"center",backgroundColor:"#106849",borderRadius:9},
 multiPartNumberText:{fontSize:17,fontWeight:"900",color:C.pale},
 multiPartTitle:{fontSize:17,lineHeight:23,fontWeight:"850",color:C.text},
 multiMomentPill:{borderColor:C.green,borderWidth:1,borderRadius:8,alignSelf:"flex-start",paddingHorizontal:8,paddingVertical:2,backgroundColor:"#133b31",marginBottom:5},
 multiMomentText:{fontSize:12,fontWeight:"850",color:C.pale},
 multiPartDetail:{fontSize:12,color:C.muted,marginTop:5},
 multiPartCapo:{fontSize:12,color:C.pale,marginTop:5},
 multiPartNote:{fontSize:12,color:C.muted,marginTop:8,lineHeight:17},
 multiQuickLinks:{flexDirection:"row",flexWrap:"wrap",columnGap:14,rowGap:0,alignItems:"center"},
 multiOriginalLink:{alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:2,marginTop:5},
 multiOriginalText:{fontSize:12,fontWeight:"750",color:C.pale},
 readerActions:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:8},
 capoNote:{fontSize:12,color:C.pale,fontWeight:"800",marginTop:7},
 hero:{paddingHorizontal:15,paddingTop:13,paddingBottom:10,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:16,marginBottom:8},
 heroSubtitle:{fontSize:12,color:C.muted,lineHeight:18,marginBottom:0},
 syncIcon:{fontSize:18,color:C.green,fontWeight:"800"},
 syncText:{fontSize:13,color:C.text,fontWeight:"750"},
 massCard:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:15,padding:14,marginVertical:4,gap:13},
 massTitle:{fontSize:18,color:C.text,fontWeight:"850"},
 massAction:{backgroundColor:C.green,borderRadius:10,minHeight:40,alignItems:"center",justifyContent:"center"},
 massActionText:{color:"#041b13",fontSize:13,fontWeight:"850"},
 repertoireLink:{paddingVertical:10,alignItems:"center"},
 repertoireLinkText:{color:C.pale,fontSize:13,fontWeight:"750"},
 newCardTitle:{fontSize:14,lineHeight:19,fontWeight:"800",color:C.text,minHeight:38},
 syncCompact:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:12,paddingVertical:9,flexDirection:"row",alignItems:"center",gap:9,marginBottom:5},
 newCard:{width:172,minHeight:88,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,justifyContent:"center",gap:4},
 eyebrow:{fontSize:10,letterSpacing:1.2,color:C.green,fontWeight:"850",marginBottom:5},
 heroTitle:{fontSize:19,lineHeight:25,fontWeight:"900",color:C.text,marginBottom:4},
 title:{fontSize:20,color:C.text,fontWeight:"850",marginBottom:6},
 sectionHeading:{marginTop:13,marginBottom:8},
 info:{fontSize:13,lineHeight:20,color:C.muted,marginBottom:9},smallMuted:{fontSize:11,color:C.muted,lineHeight:16},
 empty:{fontSize:14,color:C.muted,marginVertical:14,lineHeight:21},
 description:{fontSize:14,color:C.text,lineHeight:22,marginVertical:12},
 error:{fontSize:13,color:C.error,marginVertical:10,lineHeight:19},
 card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:13,padding:11,marginVertical:8},
 metrics:{flexDirection:"row",gap:8,marginVertical:12},
 metric:{flex:1,borderRadius:11,backgroundColor:C.sub,padding:9},
 metricNumber:{fontSize:24,color:C.green,fontWeight:"900"},
 switchRow:{flexDirection:"row",alignItems:"center",gap:8,marginVertical:13},
 button:{backgroundColor:C.green,borderRadius:11,paddingVertical:12,paddingHorizontal:14,alignItems:"center",justifyContent:"center",minHeight:44},
 secondary:{backgroundColor:C.sub,borderWidth:1,borderColor:C.border},
 buttonText:{fontSize:13,color:"#041b13",fontWeight:"850",textAlign:"center"},
 secondaryText:{color:C.text},
 smallBtn:{paddingVertical:8,paddingHorizontal:10,minHeight:35},
 smallBtnText:{fontSize:11},
 rowWrap:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:11,alignItems:"center"},
 chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginVertical:9},
 chip:{backgroundColor:C.sub,borderRadius:99,borderWidth:1,borderColor:C.border,paddingHorizontal:11,paddingVertical:9},
 chipActive:{backgroundColor:C.green,borderColor:C.green},
 chipText:{color:C.text,fontSize:12,fontWeight:"800"},
 field:{marginVertical:8},fieldTitle:{fontSize:13,color:C.text,fontWeight:"700",marginBottom:7},
 input:{backgroundColor:C.sub,color:C.text,borderColor:C.border,borderWidth:1,borderRadius:12,padding:11,fontSize:14,minHeight:44},
 multiline:{height:112},
 list:{gap:8},listRow:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,marginVertical:3,flexDirection:"row",alignItems:"center",gap:9},
 listTitle:{fontSize:15,fontWeight:"800",color:C.text},
 rowMeta:{fontSize:12,lineHeight:18,color:C.muted,marginTop:5},
 rowArrow:{fontSize:27,color:C.green,paddingHorizontal:3},
 entityIcon:{borderRadius:10,backgroundColor:"#174433",height:40,width:40,alignItems:"center",justifyContent:"center"},
 entityEmoji:{fontSize:18,color:C.green},
 breadcrumb:{flexDirection:"row",flexWrap:"wrap",gap:6,alignItems:"center",marginBottom:7},
 profileHeader:{flexDirection:"row",gap:14,marginTop:17,alignItems:"center"},
 photo:{height:80,width:80,borderRadius:40},
 photoPlaceholder:{height:80,width:80,borderRadius:40,backgroundColor:"#155b3d",alignItems:"center",justifyContent:"center"},
 photoLetter:{fontSize:25,color:C.pale,fontWeight:"900"},
 readerTitle:{fontSize:25,color:C.text,fontWeight:"900",lineHeight:31,marginVertical:8},
 transpose:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:7,marginVertical:12},
 lyricsArea:{backgroundColor:"#151d27",borderWidth:1,borderColor:C.border,borderRadius:14,marginVertical:11},
 chordText:{fontFamily:MONO,fontSize:14,color:C.green,lineHeight:18,fontWeight:"750"},
 lyricText:{fontFamily:MONO,fontSize:14,color:C.text,lineHeight:19},
 verse:{fontFamily:MONO,fontSize:14,color:C.green,fontWeight:"850",marginTop:10,marginBottom:6},
 nav:{backgroundColor:C.panel,borderTopWidth:1,borderColor:C.border,flexDirection:"row",justifyContent:"space-around",paddingVertical:8,minHeight:62},
 navItem:{alignItems:"center",justifyContent:"center",flex:1,paddingVertical:3},
 navSelected:{backgroundColor:"#143b2c",borderRadius:10},
 navIcon:{fontSize:23,color:C.muted,lineHeight:26,textAlign:"center"},navText:{fontSize:9,fontWeight:"800",color:C.muted,marginTop:4,textAlign:"center"}
});
module.exports=App;