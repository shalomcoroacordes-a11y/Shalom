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
const {buildCatalog,normalize,names,typeLabel,safeWebUrl}=require("./src/catalog");
const {sendRequest,TYPES}=require("./src/requests");
const {FAVORITES_KEY,parseFavorites,hasFavorite,toggleFavorite}=require("./src/favorites");
const {repertoireType,filterRepertoires}=require("./src/repertoire-ui");
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
const tabs=[["Inicio","home"],["Canciones","song"],["Repertorios","repertoires"],["Artistas","artists"],["Más","more"]];
const moreTabs=new Set(["Popurrís","Álbumes","Categorías","Solicitar"]);
const isSelectedTab=(current,name)=>current===name||(name==="Más"&&moreTabs.has(current));
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
  h(View,{style:S.repCardIconWrap},
   h(Image,{source:HOME_IMAGES[icon]||HOME_IMAGES.song,resizeMode:"contain",style:S.repCardIcon})),
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
 const [artistTypeFilter,setArtistTypeFilter]=useState("");
 const [medleyTypeFilter,setMedleyTypeFilter]=useState("");
 const [folderType,setFolderType]=useState("");
 const [folderId,setFolderId]=useState("");
 const [transpose,setTranspose]=useState(0);
 const [capo,setCapo]=useState("none");
 const [readerFont,setReaderFont]=useState(16);
 const [capoExpanded,setCapoExpanded]=useState(false);
 const [likedIds,setLikedIds]=useState([]);
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
 const likedRef=useRef([]);
 const likedWriteRef=useRef(Promise.resolve());
 const model=useMemo(()=>buildCatalog(copy?.data||{}),[copy]);
 const active=detail?.type==="song"?model.songs.find(s=>s.id===detail.id):null;
 const focusedArtist=detail?.type==="artist"?model.artistMap.get(detail.id):null;
 const focusedAlbum=detail?.type==="album"?model.albumMap.get(detail.id):null;
 const focusedMedley=detail?.type==="medley"?model.medleys.find(x=>x.id===detail.id):null;
 const focusedRepertoire=detail?.type==="repertoire"?model.repertoires.find(x=>x.id===detail.id):null;
 const likedSet=useMemo(()=>new Set(likedIds),[likedIds]);
 const eligible=useMemo(()=>model.songs.filter(s=>{
  if(onlyLiked&&!likedSet.has(String(s.id)))return false;
  if(typeFilter&&s.song_type!==typeFilter)return false;
  if(categoryId&&!s._categories.some(c=>model.descendants(categoryId).has(c.id)))return false;
  const term=normalize(query.trim());
  if(!term)return true;
  return matchesSearch([s.title,s.tone,s.lyrics,names(s._artists),names(s._categories)],term);
 }),[model,typeFilter,categoryId,query,onlyLiked,likedSet]);
 function goTab(next,options={}){setSettingsOpen(false);setImmersive(false);detailHistoryRef.current=[];setTab(next);setDetail(null);setCountLimit(80);setFolderType("");setFolderId("");setQuery(options.search||"");setTypeFilter("");setArtistTypeFilter("");setMedleyTypeFilter("");setCategoryId("");setSectionSearchOpen(Boolean(options.search));setOnlyLiked(Boolean(options.liked));}
 function openDetail(next){if(detail)detailHistoryRef.current.push(detail);setDetail(next);}
 function rememberRead(next){setLastRead(next);setMetadata("last_read",JSON.stringify(next)).catch(()=>{});}
 function toggleLike(songId){
  const prev=likedRef.current;
  const next=toggleFavorite(prev,songId);
  likedRef.current=next;setLikedIds(next);
  const payload=JSON.stringify(next);
  const write=likedWriteRef.current.catch(()=>{}).then(()=>setMetadata(FAVORITES_KEY,payload));
  likedWriteRef.current=write;
  write.catch(e=>{
   if(JSON.stringify(likedRef.current)===payload){likedRef.current=prev;setLikedIds(prev)}
   Alert.alert("No se guardó Me gusta",(e?.message||"Revisa el almacenamiento del teléfono.")+" No se modificó el catálogo.");
  });
 }
 function selectSong(song){openDetail({type:"song",id:song.id,from:tab});rememberRead({type:"song",id:song.id});setTranspose(0);setCapo("none");setCapoExpanded(false);}
 function selectMedley(medley){openDetail({type:"medley",id:medley.id,from:tab});rememberRead({type:"medley",id:medley.id});setTranspose(0);}
 function selectRepertoire(rep){openDetail({type:"repertoire",id:rep.id,from:tab});setTranspose(0);}
 function back(){
  if(immersiveActive){setImmersive(false);return true;}
  if(settingsOpen){setSettingsOpen(false);return true;}
  if(detail){setDetail(detailHistoryRef.current.pop()||null);return true;}
  if(tab==="Solicitar"){goTab(previousTabRef.current==="Solicitar"?"Inicio":previousTabRef.current);return true;}
  if(tab==="Categorías"&&folderId){
   const parent=model.categoryMap.get(folderId)?.parent_id;
   setFolderId(parent&&model.categoryMap.has(parent)?parent:"");return true;
  }
  if(tab==="Categorías"&&folderType){setFolderType("");return true;}
  if(tab!=="Inicio"){goTab("Inicio");return true;}
  return false;
 }
 useEffect(()=>{
  if(Platform.OS!=="android")return;
  const subscription=BackHandler.addEventListener("hardwareBackPress",back);
  return()=>subscription.remove();
 },[detail,tab,folderId,folderType,model,immersiveActive,settingsOpen]);
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
    const [snapshot,pref,n,last,likedRaw]=await Promise.all([
     getCatalog(),getMetadata("wifi_only","true"),networkState(),getMetadata("last_read",""),
     getMetadata(FAVORITES_KEY,"[]")
    ]);
    if(!enabled)return;
    lastRef.current=snapshot.syncedAt;prefRef.current=pref!=="false";
    setCopy(snapshot);setWifiOnly(pref!=="false");setNetwork(n);
    likedRef.current=parseFavorites(likedRaw);setLikedIds(likedRef.current);
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
  const links=[
   ["Cancionero","Todos los cantos","song","Canciones"],
   ["Repertorios","Misa y ensayos","repertoires","Repertorios"],
   ["Artistas","Conoce sus cantos","artists","Artistas"],
   ["Categorías","Organiza por tema","categories","Categorías"],
   ["Popurrís","Varios cantos","medleys","Popurrís"],
   ["Álbumes","Colecciones de cantos","albums","Álbumes"]
  ];
  const tile=([name,subtitle,icon,destination])=>h(Pressable,{
   key:name,onPress:()=>goTab(destination),accessibilityRole:"button",
   accessibilityLabel:name+". "+subtitle,style:S.homeTile},
   h(View,{style:S.homeTileIcon},h(Image,{source:HOME_IMAGES[icon],style:S.homeTileImage,resizeMode:"contain"})),
   h(View,{style:{flex:1,minWidth:0}},
    h(Text,{style:S.homeTileName,numberOfLines:1,adjustsFontSizeToFit:true,minimumFontScale:.72},name),
    h(Text,{style:S.homeTileSubtitle,numberOfLines:2},subtitle)),
   label("›",S.homeTileArrow));
  const term=normalize(homeSearch.trim());
  const found=term?model.songs.filter(song=>matchesSearch([song.title,song.lyrics,names(song._artists),names(song._categories)],term)).slice(0,6):[];
  return h(View,{style:S.homeContainer},
   h(View,{style:S.homeBrand},
    h(Image,{source:HOME_IMAGES.waves,style:S.homeWaves,resizeMode:"stretch"}),
    h(Image,{source:HOME_IMAGES.logo,style:S.homeLogo,resizeMode:"contain",accessibilityLabel:"Paloma original de SHALOM"}),
    label("SHALOM",S.homeBrandName),
    label("—  CORO Y ALABANZA  —",S.homeBrandSub)),
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
   h(View,{style:S.homeGrid},...links.map(tile)),
   h(Pressable,{onPress:()=>goTab("Repertorios"),accessibilityRole:"button",
    accessibilityLabel:"Ver repertorios de misa y ensayo",style:S.homeFeature},
    h(Image,{source:HOME_IMAGES.banner,style:S.homeFeatureBackground,resizeMode:"stretch"}),
    h(View,{style:S.homeFeatureText},
     label("Repertorios de",S.homeFeatureKicker),
     label("Misa y Ensayo",S.homeFeatureTitle),
     h(View,{style:S.homeFeatureButton},label("Ver repertorios   ›",S.homeFeatureLink)))),
   !copy?.syncedAt?h(Pressable,{style:S.homeNeedsSync,onPress:()=>setSettingsOpen(true),accessibilityRole:"button"},
    label("↓ Descargar cancionero sin conexión  ›",S.homeSyncText)):null,
   busy?label("Sincronizando… "+progress,S.info):null,error?label(error,S.error):null);
 }
 function renderSongs(){
  const typeChoices=SONG_TYPES.map(([key,name])=>[key,name,null]);
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Canciones",subtitle:"Busca letras, acordes, tonos o palabras",icon:"song"}),
   !copy?.syncedAt?h(Card,null,
    label("Primero descarga el cancionero",S.listTitle),
    label("La biblioteca aún no está guardada en el teléfono.",S.info),
    h(Btn,{text:busy?"Descargando…":"Descargar mis cantos",onPress:manualSync,disabled:busy}),
    busy?h(ActivityIndicator,{color:C.green}):null,
    error?label(error,S.error):null):null,
   h(SectionFilterBar,{options:[["all","Todas","song"],["liked","♥ Mis Me gusta ("+likedIds.length+")",null]],
    value:onlyLiked?"liked":"all",compact:true,
    onChange:val=>{setOnlyLiked(val==="liked");setCountLimit(80)}}),
   h(SectionFilterBar,{options:typeChoices,value:typeFilter,
    onChange:val=>{setTypeFilter(val);setCountLimit(80)}}),
   sectionSearchOpen?h(SectionSearch,{value:query,
    onChangeText:v=>{setQuery(v);setCountLimit(80)},placeholder:"Buscar nombre, letra o artista…"}):null,
   onlyLiked?label("Tus Me gusta se guardan solo en este teléfono.",S.sectionSupporting):null,
   categoryId?h(View,{style:S.rowWrap},
    label("Filtro: "+model.categoryPath(model.categoryMap.get(categoryId)),S.info),
    h(Btn,{text:"Quitar filtro",small:true,secondary:true,onPress:()=>setCategoryId("")})):null,
   label(eligible.length+" "+(eligible.length===1?"resultado":"resultados"),S.sectionResults),
   h(View,{style:S.repCards},
    ...eligible.slice(0,countLimit).map(song=>h(SectionListCard,{key:song.id,
     title:song.title||"Sin título",
     subtitle:[names(song._artists),song.tone?"Tono "+song.tone:""].filter(Boolean).join(" · ")||type(song.song_type),
     meta:likedSet.has(String(song.id))?"♥ En mis Me gusta":null,
     icon:"song",onPress:()=>selectSong(song)})),
    eligible.length>countLimit?h(Btn,{text:"Mostrar más cantos",secondary:true,onPress:()=>setCountLimit(v=>v+80)}):null,
    !eligible.length?h(SectionEmpty,{message:copy?.syncedAt?
     "No hay cantos que coincidan con estos filtros.":"Descarga la biblioteca desde Ajustes para ver los cantos."}):null)
  );
 }
 function renderArtists(){
  const filtered=model.artists.filter(a=>
   (!artistTypeFilter||normalize(type(a.artist_type))===artistTypeFilter)
   &&matchesSearch([a.name,a.description,a.artist_type],query));
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Artistas",subtitle:"Descubre ministerios, coros y músicos",icon:"artists"}),
   h(SectionFilterBar,{options:SONG_TYPES.map(([code,name])=>[code,name,null]),
    value:artistTypeFilter,onChange:val=>{setArtistTypeFilter(val);setCountLimit(80)}}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:v=>{setQuery(v);setCountLimit(80)},
    placeholder:"Buscar artista o ministerio…"}):null,
   label(filtered.length+" "+(filtered.length===1?"artista":"artistas"),S.sectionResults),
   h(View,{style:S.repCards},
    ...filtered.slice(0,countLimit).map(a=>{
     const count=model.songsForArtist(a.id).length;
     return h(SectionListCard,{key:a.id,title:a.name||"Artista",
      subtitle:type(a.artist_type)+" · "+count+" "+(count===1?"canto":"cantos"),
      icon:"artists",onPress:()=>openDetail({type:"artist",id:a.id})});
    }),
    filtered.length>countLimit?h(Btn,{text:"Mostrar más artistas",secondary:true,onPress:()=>setCountLimit(v=>v+80)}):null,
    !filtered.length?h(SectionEmpty,{message:"No hay artistas que coincidan con tu búsqueda."}):null)
  );
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
    !folderType&&!term?...rootTypes.map(code=>h(SectionListCard,{key:code,
     title:typeNames[code],subtitle:countFolders(code)+" "+(countFolders(code)===1?"carpeta":"carpetas"),
     icon:"categories",onPress:()=>{setFolderType(code);setFolderId("");setQuery("")}})):null,
    !folderType&&term?...allMatches.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:(typeNames[normalize(c.song_type)]||"General")+" · "+
      model.songsForCategory(c.id).length+" cantos",icon:"categories",
     onPress:()=>{setFolderType(normalize(c.song_type)||"general");setFolderId(c.id);setQuery("")}})):null,
    folderType?...visibleChildren.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:model.songsForCategory(c.id).length+" cantos · "+
      model.children(c.id).length+" subcarpetas",icon:"categories",
     onPress:()=>{setFolderId(c.id);setQuery("")}})):null,
    current?h(View,{style:S.categorySongHeading},
     label("Cantos de "+current.name,S.categorySongTitle),
     label(visibleSongs.length+" cantos",S.sectionSupporting)):null,
    current?...visibleSongs.map(song=>h(SectionListCard,{key:song.id,title:song.title,
     subtitle:names(song._artists)||type(song.song_type),meta:song.tone?"Tono "+song.tone:null,
     icon:"song",onPress:()=>selectSong(song)})):null,
    ((folderType&&!visibleChildren.length&&!current)||
     (term&&!allMatches.length&&!folderType)||
     (current&&!visibleChildren.length&&!visibleSongs.length))
     ?h(SectionEmpty,{message:"No se encontraron categorías o cantos en esta sección."}):null)
  );
 }
 function renderMore(){
  const cards=[
   ["Categorías","Explora por tema o celebración","categories",()=>goTab("Categorías")],
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
     label("Listas organizadas de cantos",S.repSubtitle))),
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
      h(View,{style:S.repCardIconWrap},
       h(Image,{source:HOME_IMAGES[iconFor(code)],resizeMode:"contain",style:S.repCardIcon})),
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
 function renderRepertoireDetail(rep){
  const items=Array.isArray(rep.items)?rep.items:[];
  return h(View,null,
   h(View,{style:S.readerActions},
    Platform.OS==="android"?h(Btn,{text:immersiveActive?"Salir de pantalla completa":"⛶ Pantalla completa",small:true,secondary:!immersiveActive,onPress:()=>setImmersive(v=>!v)}):null),
   label(rep.kind==="misa"?"REPERTORIO DE MISA":"REPERTORIO DE ENSAYO",S.eyebrow),
   label(rep.title,S.readerTitle),
   label([rep.event_date,rep.location,items.length+" cantos"].filter(Boolean).join(" · "),S.info),
   rep.notes?label(rep.notes,S.description):null,
   h(Card,null,label("Transposición de todos los cantos",S.listTitle),
    h(View,{style:S.transpose},
     h(Btn,{text:"− Semitono",small:true,secondary:true,onPress:()=>setTranspose(n=>Math.max(-11,n-1))}),
     label(transpose===0?"Original":(transpose>0?"+":"")+transpose+" semitonos",S.smallMuted),
     h(Btn,{text:"+ Semitono",small:true,secondary:true,onPress:()=>setTranspose(n=>Math.min(11,n+1))}),
     h(Btn,{text:"Restablecer",small:true,secondary:true,onPress:()=>setTranspose(0)}))),
   ...items.map((item,i)=>{
    const song=model.songs.find(s=>String(s.id)===String(item.song_id));
    const lines=parseSong(song?.lyrics||"Canto no disponible.",transpose);
    return h(Card,{key:i,style:{marginTop:12}},
     label((i+1)+". "+(item.moment||"Canto")+" — "+(song?.title||"Canto no disponible"),S.listTitle),
     song?.tone?label("Tono "+song.tone,S.rowMeta):null,
     item.notes?label(item.notes,S.info):null,
     h(ScrollView,{horizontal:true,nestedScrollEnabled:true,style:S.lyricsArea,contentContainerStyle:{padding:12,minWidth:"100%"}},
      h(View,null,...lines.map((r,j)=>{
       if(r.kind==="space")return h(View,{key:j,style:{height:14}});
       if(r.kind==="section")return h(Text,{key:j,style:S.verse},r.text);
       if(r.kind==="chords")return h(View,{key:j,style:{marginBottom:4}},
        h(Text,{style:S.chordText},r.chordLine||" "),
        h(Text,{style:S.lyricText},r.lyricLine||" "));
       return h(Text,{key:j,style:r.kind==="chordsOnly"?S.chordText:S.lyricText},r.text||" ");
      }))),
     song?h(Btn,{text:"Ver canto individual",small:true,secondary:true,onPress:()=>selectSong(song)}):null);
   }));
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
  return h(View,null,
   h(View,{style:S.readerActions},
    Platform.OS==="android"?h(Btn,{text:immersiveActive?"Salir de pantalla completa":"⛶ Pantalla completa",small:true,secondary:!immersiveActive,onPress:()=>setImmersive(v=>!v)}):null),
   label(type(medley.song_type).toUpperCase(),S.eyebrow),
   label(medley.title,S.readerTitle),
   label(parts.length+" fragmentos"+(medley.base_tone?" · Tono "+medley.base_tone:""),S.info),
   medley.description?label(medley.description,S.description):null,
   h(Card,null,
     label("Transposición de todo el popurrí",S.listTitle),
     h(View,{style:S.transpose},
       h(Btn,{text:"− Semitono",small:true,secondary:true,onPress:()=>setTranspose(n=>Math.max(-11,n-1))}),
       label(transpose===0?"Original":(transpose>0?"+":"")+transpose+" semitonos",S.smallMuted),
       h(Btn,{text:"+ Semitono",small:true,secondary:true,onPress:()=>setTranspose(n=>Math.min(11,n+1))}),
       h(Btn,{text:"Restablecer",small:true,secondary:true,onPress:()=>setTranspose(0)})),
   ),
   ...parts.map((part,index)=>{
    const original=model.songs.find(song=>String(song.id)===String(part.song_id));
    const delta=transpose+Number(part.shift||0);
    const capoPosition=Number(part.capo_position||original?.capo_position||0);
    const capoKey=String(part.capo_key||original?.capo_key||"").trim();
    const capoVersions=(original?._capos||[]).filter(v=>Number(v.capo_position)>0);
    const lines=parseSong(part.lyrics||"",delta);
    return h(Card,{key:part.id||index},
     h(View,{style:{flexDirection:"row",alignItems:"center",gap:9}},
      h(View,{style:S.entityIcon},label(String(index+1),S.entityEmoji)),
      h(View,{style:{flex:1}},
       label(part.title||part.song_title||"Canto "+(index+1),S.listTitle),
       label([part.tone?"Tono "+part.tone:"",part.shift?"Ajuste "+part.shift+" semitonos":""].filter(Boolean).join(" · "),S.rowMeta),
       capoPosition>0?label("🎸 Capo registrado: traste "+capoPosition+(capoKey?" · Figuras en "+capoKey:""),S.capoNote):null,
       capoVersions.length?label("Otras versiones con capo: "+capoVersions.map(v=>"traste "+v.capo_position+(v.capo_key?" ("+v.capo_key+")":"")).join(" · "),S.smallMuted):null)),
     h(ScrollView,{horizontal:true,nestedScrollEnabled:true,style:S.lyricsArea,
       contentContainerStyle:{padding:12,minWidth:"100%"}},
      h(View,null,...lines.map((r,i)=>{
       if(r.kind==="space")return h(View,{key:i,style:{height:14}});
       if(r.kind==="section")return h(Text,{key:i,style:S.verse},r.text);
       if(r.kind==="chords")return h(View,{key:i,style:{marginBottom:4}},
         h(Text,{style:S.chordText},r.chordLine||" "),
         h(Text,{style:S.lyricText},r.lyricLine||" "));
       return h(Text,{key:i,style:r.kind==="chordsOnly"?S.chordText:S.lyricText},r.text||" ");
      }))),
     original?h(View,{style:S.rowWrap},
      h(Btn,{text:"Ver canto original",small:true,secondary:true,onPress:()=>selectSong(original)}),
      ...[...(original._links||[]).map(x=>({title:x.title||"Video",url:x.url})),
        {title:"Tutorial guitarra",url:original.tutorial_guitar},
        {title:"Tutorial piano",url:original.tutorial_piano}]
        .filter(x=>safeWebUrl(x.url)).slice(0,3)
        .map((x,i)=>h(Btn,{key:i,text:"▶ "+x.title,small:true,secondary:true,onPress:()=>openWeb(x.url)}))
      ):null);
   })
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
 function showSongToneMenu(){
  Alert.alert("Transponer acordes","El cambio se aplica solo a tu lectura de este canto.",[
   {text:"− Semitono",onPress:()=>setTranspose(v=>Math.max(-11,v-1))},
   {text:"Tono original",onPress:()=>{setTranspose(0);setCapo("none")}},
   {text:"+ Semitono",onPress:()=>setTranspose(v=>Math.min(11,v+1))}
  ]);
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
 function printSong(song){
  if(!network.online)return Alert.alert("Requiere conexión","Para imprimir, abre el canto en SHALOM web cuando tengas internet.");
  Alert.alert("Imprimir canto","Se abrirá la versión web. Allí utiliza su opción Imprimir.",[
   {text:"Cancelar",style:"cancel"},
   {text:"Abrir SHALOM web",onPress:()=>openWeb(songPermalink(song))}
  ]);
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
  const isChorus=txt=>/\bcoro\b|estribillo|refr[aá]n/i.test(txt||"");
  const section=(name,i)=>{
   const chorus=isChorus(name);
   return h(View,{key:"section-"+i,style:S.songSectionRow},
    h(View,{style:[S.songSectionPill,chorus&&S.songChorusPill]},
     label(name,[S.songSectionText,chorus&&S.songChorusText])),
    h(View,{style:S.songSectionRule}));
  };
  const chordStyle=[S.songChord,{fontSize:readerFont,lineHeight:readerFont+5}];
  const lyricStyle=[S.songLyric,{fontSize:readerFont,lineHeight:readerFont+7}];
  const parsed=parseSong(song.lyrics||"Sin letra guardada.",transpose+capoOffset);
  return h(View,{style:S.songReader},
   h(View,{style:S.songMetaRow},
    h(View,{style:S.songMetaIcon},
     h(Image,{source:HOME_IMAGES.song,resizeMode:"contain",style:S.songMetaIconImage})),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.songHeading},song.title||"Sin título"),
     label(names(song._artists)||"SHALOM",S.songArtist),
     h(View,{style:S.songTypeBadge},label(type(song.song_type),S.songTypeText))),
    h(Pressable,{onPress:()=>toggleLike(song.id),accessibilityRole:"button",
     accessibilityLabel:liked?"Quitar Me gusta":"Marcar Me gusta",
     accessibilityState:{selected:liked},style:S.songLikeButton},
     h(Text,{style:[S.songHeart,liked&&S.songHeartActive]},liked?"♥":"♡"))),
   h(View,{style:S.songControls},
    h(Pressable,{style:S.songToneControl,onPress:showSongToneMenu,
     accessibilityRole:"button",accessibilityLabel:"Cambiar tono. Tono "+toned},
     label("♫  Tono: "+toned+"  ▾",S.songControlText)),
    h(Pressable,{style:S.songToneControl,onPress:()=>{
      if(choices.length>1)setCapoExpanded(v=>!v);
      else Alert.alert("Capo","No hay variantes de capo registradas para este canto.");
     },accessibilityRole:"button",accessibilityLabel:"Seleccionar capo"},
     label("Capo: "+(chosen.id==="none"?"—":chosen.position)+"  ▾",S.songControlText)),
    h(View,{style:S.songFontControl},
     h(Pressable,{onPress:()=>setReaderFont(v=>Math.max(13,v-1)),accessibilityRole:"button",
      accessibilityLabel:"Reducir tamaño de letra",style:S.songFontButton},label("A−",S.songFontText)),
     h(Pressable,{onPress:()=>setReaderFont(v=>Math.min(22,v+1)),accessibilityRole:"button",
      accessibilityLabel:"Aumentar tamaño de letra",style:S.songFontButton},label("A+",S.songFontText)))),
   capoExpanded&&choices.length>1?h(View,{style:S.songCapoVariants},
    ...choices.map(item=>h(Chip,{key:String(item.id),text:item.label,
     active:item.id===capo,onPress:()=>{setCapo(item.id);setCapoExpanded(false)}}))):null,
   chosen.id!=="none"?label("Capo "+chosen.position+(chosen.key?" · Figuras en "+chosen.key:""),S.songCapoNote):null,
   h(ScrollView,{horizontal:true,nestedScrollEnabled:true,showsHorizontalScrollIndicator:true,
    style:S.songScoreScroll,contentContainerStyle:S.songScoreContent},
    h(View,{style:{minWidth:"100%"}},
     ...parsed.map((row,i)=>{
      if(row.kind==="space")return h(View,{key:i,style:{height:readerFont*.8}});
      if(row.kind==="section")return section(row.text,i);
      if(row.kind==="chords")return h(View,{key:i,style:S.songPair},
       h(Text,{style:chordStyle,selectable:true},row.chordLine||" "),
       h(Text,{style:lyricStyle,selectable:true},row.lyricLine||" "));
      return h(Text,{key:i,style:row.kind==="chordsOnly"?chordStyle:lyricStyle,selectable:true},row.text||" ");
     })))
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
  :tab==="Solicitar"?renderRequest():tab==="Más"?renderMore():renderHome();
 return h(SafeAreaView,{style:[S.root,{paddingTop:immersiveActive?0:topInset}],edges:["bottom","left","right"]},
  h(StatusBar,{barStyle:"light-content",backgroundColor:C.bg,hidden:immersiveActive,animated:true}),
  !immersiveActive&&detail?.type==="song"&&!settingsOpen?h(View,{style:S.songTopBar},
   h(Pressable,{style:S.songBackButton,onPress:()=>back(),accessibilityRole:"button",accessibilityLabel:"Volver a las canciones"},
    label("‹",S.songBackSymbol)),
   h(View,{style:S.songTopBrand},
    h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.songTopLogo}),
    label("SHALOM",S.songTopName)),
   h(Pressable,{style:S.songTopMore,onPress:()=>Alert.alert("Opciones de lectura","Elige una acción para este canto.",[
     {text:"Pantalla completa",onPress:()=>setImmersive(true)},
     {text:"Tono original",onPress:()=>{setTranspose(0);setCapo("none")}},
     {text:"Cancelar",style:"cancel"}]),accessibilityRole:"button",accessibilityLabel:"Opciones de lectura"},
     label("⋮",S.songTopMoreText))):
  !immersiveActive&&!detail&&!settingsOpen&&["Repertorios","Canciones","Artistas","Categorías","Popurrís","Álbumes","Más"].includes(tab)?h(View,{style:S.repTopBar},
   h(Pressable,{style:S.repTopBack,onPress:()=>goTab("Inicio"),accessibilityRole:"button",accessibilityLabel:"Volver a Inicio"},
    label("←",S.repTopBackSymbol)),
   h(View,{style:S.repTopBrand},
    h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repTopLogo}),
    h(View,{style:{flex:1,minWidth:0}},
     label("SHALOM",S.repTopName),
     label("Coro y Alabanza",S.repTopSub))),
   tab!=="Más"?h(Pressable,{style:S.repTopAction,onPress:()=>{
     if(tab==="Repertorios"){setRepertoireSearchOpen(v=>!v)}
     else{setSectionSearchOpen(v=>!v)}
     setQuery("");
    },accessibilityRole:"button",accessibilityLabel:(tab==="Repertorios"?repertoireSearchOpen:sectionSearchOpen)?"Ocultar búsqueda":"Buscar en "+tab},
    h(Image,{source:HOME_IMAGES.search,resizeMode:"contain",style:S.repTopActionIcon})):h(View,{style:S.repTopAction}),
   h(Pressable,{style:S.repTopAction,onPress:()=>tab==="Más"?setSettingsOpen(true):goTab("Más"),
    accessibilityRole:"button",accessibilityLabel:tab==="Más"?"Abrir configuración":"Más opciones"},
    tab==="Más"?label("⚙",S.sectionHeaderGear):
     h(Image,{source:HOME_IMAGES.more,resizeMode:"contain",style:S.repTopActionIcon}))):
  !immersiveActive&&tab==="Inicio"&&!detail&&!settingsOpen?h(View,{style:S.homeTopBar},
   h(Pressable,{onPress:()=>goTab("Más"),accessibilityRole:"button",accessibilityLabel:"Abrir menú",style:S.homeTopButton},
    h(Image,{source:HOME_IMAGES.menu,style:S.homeTopIcon,resizeMode:"contain"})),
   h(Pressable,{onPress:()=>setSettingsOpen(true),accessibilityRole:"button",accessibilityLabel:"Estado y ajustes del cancionero",style:S.homeTopButton},
    h(Image,{source:HOME_IMAGES.bell,style:S.homeTopIcon,resizeMode:"contain"}),
    h(View,{style:S.homeBellDot}))):
  !immersiveActive&&settingsOpen?h(AppSectionHeader,{section:"Configuración",onBack:()=>setSettingsOpen(false)}):
  !immersiveActive&&detail&&detail.type!=="song"?h(AppDetailHeader,{
   section:detail.type==="artist"?"Artista":detail.type==="album"?"Álbum":
    detail.type==="medley"?"Popurrí":detail.type==="repertoire"?"Repertorio":"Detalle",
   onBack:back
  }):
  !immersiveActive?h(AppSectionHeader,{
   section:tab==="Solicitar"?"Solicitudes":tab,
   onSettings:()=>setSettingsOpen(true)
  }):null,
  !loaded?h(View,{style:{flex:1,justifyContent:"center"}},h(ActivityIndicator,{color:C.green})):
  h(ScrollView,{key:(detail?.type||tab)+(detail?.id||""),style:{flex:1},contentContainerStyle:S.page,
   keyboardShouldPersistTaps:"handled"},
   settingsOpen?renderSettings():page,h(View,{style:{height:27}})),
  !immersiveActive&&!settingsOpen&&detail?.type==="song"&&active?h(View,{style:S.songActionBar},
   ...[
    ["↕","Transponer",showSongToneMenu],
    ["▤","Imprimir",()=>printSong(active)],
    ["↗","Compartir",()=>shareSong(active)],
    ["▶","YouTube",()=>openSongVideo(active)]
   ].map(([symbol,name,onPress])=>h(Pressable,{key:name,style:S.songActionItem,
    onPress,accessibilityRole:"button",accessibilityLabel:name},
    label(symbol,S.songActionIcon),label(name,S.songActionLabel)))):null,
  !immersiveActive&&!settingsOpen&&detail?.type!=="song"?h(View,{style:[S.nav,tab==="Inicio"&&!detail&&S.homeNav]},
   ...tabs.map(([name,icon])=>{
    const selected=isSelectedTab(tab,name)&&!detail;
    const homeIcon=HOME_IMAGES[icon];
    return h(Pressable,{key:name,accessibilityRole:"tab",accessibilityState:{selected},
     onPress:()=>goTab(name),style:[S.navItem,selected&&S.navSelected]},
     homeIcon?h(Image,{source:homeIcon,resizeMode:"contain",style:[S.homeNavIcon,{tintColor:selected?C.green:C.text}]}):
      label(icon,[S.navIcon,selected&&{color:C.green}]),
     label(name,[S.navText,selected&&{color:C.green}]));})) : null
 );
}
function App(){return h(SafeAreaProvider,null,h(AppScreen));}
const S=StyleSheet.create({
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
 repPage:{paddingTop:13,minHeight:380},
 repHeading:{flexDirection:"row",alignItems:"center",gap:13,marginBottom:24},
 repHeadingIcon:{width:62,height:62,tintColor:C.green},
 repTitle:{fontSize:30,fontWeight:"900",lineHeight:38,color:C.text},
 repSubtitle:{fontSize:13,color:C.muted,lineHeight:19},
 repFilters:{flexDirection:"row",alignItems:"center",gap:8,paddingBottom:8,marginBottom:16},
 repFilterChip:{minHeight:48,borderRadius:99,borderWidth:1,borderColor:"#4f6870",backgroundColor:"#13272d",paddingHorizontal:16,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},
 repFilterActive:{backgroundColor:C.green,borderColor:C.green},
 repFilterIcon:{width:21,height:21},
 repFilterText:{fontSize:13,fontWeight:"800",color:C.text},
 repFilterTextActive:{color:"#05271d"},
 repSearchInput:{backgroundColor:C.sub,borderColor:C.border,borderWidth:1,borderRadius:14,paddingHorizontal:14,minHeight:46,color:C.text,fontSize:14,marginBottom:16},
 repCards:{gap:13},
 sectionFiltersCompact:{marginBottom:4},
 sectionResults:{fontSize:12,color:C.muted,marginBottom:12,marginTop:3},
 sectionSupporting:{fontSize:12,lineHeight:17,color:C.muted,marginBottom:10},
 categoryPath:{marginBottom:14,gap:4},
 categoryBack:{alignSelf:"flex-start",paddingVertical:9,paddingHorizontal:12,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.sub},
 categoryBackText:{fontSize:13,color:C.pale,fontWeight:"800"},
 categoryPathText:{fontSize:11,color:C.muted,lineHeight:17},
 categorySongHeading:{marginTop:12,marginBottom:3,gap:4},
 categorySongTitle:{fontSize:18,fontWeight:"850",color:C.text},
 repCard:{minHeight:104,backgroundColor:"#20313b",borderColor:"#334b51",borderWidth:1,borderRadius:18,flexDirection:"row",alignItems:"center",gap:13,paddingVertical:14,paddingHorizontal:13},
 repCardIconWrap:{height:68,width:68,borderRadius:15,backgroundColor:"#14664a",alignItems:"center",justifyContent:"center"},
 repCardIcon:{height:43,width:43,tintColor:"#61ffb3"},
 repCardTitle:{fontSize:18,fontWeight:"850",lineHeight:23,color:C.text},
 repCardCount:{fontSize:15,color:C.muted,marginTop:6},
 repCardMeta:{fontSize:11,color:C.muted,marginTop:4},
 repArrow:{fontSize:31,color:C.text,marginHorizontal:1},
 repEmptyCard:{minHeight:164,alignItems:"center",justifyContent:"center",backgroundColor:C.panel,borderRadius:17,borderWidth:1,borderColor:C.border,padding:20},
 repEmptyLogo:{width:85,height:48,opacity:.55},
 repEmptyText:{fontSize:13,lineHeight:20,color:C.muted,textAlign:"center",marginTop:10},
 repSuggest:{width:57,height:57,borderRadius:16,backgroundColor:C.green,alignSelf:"flex-end",alignItems:"center",justifyContent:"center",marginTop:20,marginRight:2},
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
 homeGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:12,marginBottom:24},
 homeTile:{width:"48.6%",minHeight:91,backgroundColor:C.panel,borderWidth:1,borderColor:"#405761",borderRadius:17,paddingHorizontal:7,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:5},
 homeTileIcon:{height:39,width:36,backgroundColor:"#08704f",borderRadius:11,justifyContent:"center",alignItems:"center"},
 homeTileImage:{height:26,width:26,tintColor:"#effff8"},
 homeTileName:{fontSize:13.3,fontWeight:"800",color:C.text},
 homeTileSubtitle:{fontSize:10.1,lineHeight:13.5,color:C.muted,marginTop:3},
 homeTileArrow:{fontSize:19,color:C.text,marginRight:1},
 homeFeature:{borderColor:C.green,borderWidth:1,borderRadius:21,minHeight:116,overflow:"hidden",justifyContent:"center"},
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
 songReader:{paddingBottom:18},
 songMetaRow:{flexDirection:"row",alignItems:"center",gap:10,borderBottomWidth:1,borderColor:C.border,paddingBottom:13,marginBottom:15},
 songMetaIcon:{width:50,height:64,borderRadius:12,backgroundColor:"#1c3938",alignItems:"center",justifyContent:"center"},
 songMetaIconImage:{width:34,height:34,tintColor:C.green},
 songHeading:{fontSize:21,fontWeight:"900",color:C.text,lineHeight:27},
 songArtist:{fontSize:15,color:C.muted,marginTop:4,marginBottom:6},
 songTypeBadge:{backgroundColor:"#195447",borderRadius:99,paddingHorizontal:10,paddingVertical:3,alignSelf:"flex-start"},
 songTypeText:{color:C.pale,fontSize:12,fontWeight:"850"},
 songLikeButton:{width:50,minHeight:57,alignItems:"center",justifyContent:"center"},
 songHeart:{fontSize:43,color:C.text,lineHeight:49,fontWeight:"400"},
 songHeartActive:{color:C.green},
 songControls:{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:12,borderBottomWidth:1,borderColor:C.border,justifyContent:"space-between"},
 songToneControl:{flex:1,minHeight:43,borderRadius:23,borderWidth:1,borderColor:"#577179",backgroundColor:C.sub,alignItems:"center",justifyContent:"center",paddingHorizontal:3},
 songControlText:{fontSize:12,color:C.text,fontWeight:"750",textAlign:"center"},
 songFontControl:{flex:1.1,flexDirection:"row",minHeight:43,borderRadius:23,borderWidth:1,borderColor:"#577179",backgroundColor:C.sub,alignItems:"center",justifyContent:"space-evenly"},
 songFontButton:{flex:1,alignItems:"center",justifyContent:"center",minHeight:42},
 songFontText:{fontSize:19,fontWeight:"850",color:C.text},
 songCapoVariants:{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:10},
 songCapoNote:{fontSize:11,color:C.pale,marginTop:8},
 songScoreScroll:{backgroundColor:C.bg,marginTop:15,marginBottom:10},
 songScoreContent:{paddingVertical:9,paddingHorizontal:5,minWidth:"100%"},
 songSectionRow:{flexDirection:"row",alignItems:"center",gap:9,marginTop:16,marginBottom:10,minWidth:150},
 songSectionPill:{borderWidth:1.5,borderColor:C.green,borderRadius:9,paddingVertical:3,paddingHorizontal:9,backgroundColor:"#113329"},
 songChorusPill:{backgroundColor:C.green},
 songSectionText:{fontSize:16,color:C.pale,fontWeight:"900"},
 songChorusText:{color:"#05211b"},
 songSectionRule:{height:1,backgroundColor:"#2c544b",flex:1,minWidth:18},
 songPair:{marginBottom:6},
 songChord:{fontFamily:MONO,color:C.green,fontWeight:"800",includeFontPadding:false},
 songLyric:{fontFamily:MONO,color:C.text,includeFontPadding:false},
 songActionBar:{backgroundColor:"#12212a",flexDirection:"row",justifyContent:"space-around",minHeight:70,borderTopWidth:1,borderColor:"#4a6267",paddingVertical:7},
 songActionItem:{flex:1,alignItems:"center",justifyContent:"center",minHeight:56},
 songActionIcon:{fontSize:24,color:C.text,lineHeight:30,fontWeight:"800"},
 songActionLabel:{fontSize:11,color:C.text,fontWeight:"800",marginTop:3},
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
 newCard:{width:172,minHeight:104,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:14,padding:12,justifyContent:"center",gap:4},
 eyebrow:{fontSize:10,letterSpacing:1.2,color:C.green,fontWeight:"850",marginBottom:5},
 heroTitle:{fontSize:19,lineHeight:25,fontWeight:"900",color:C.text,marginBottom:4},
 title:{fontSize:20,color:C.text,fontWeight:"850",marginBottom:6},
 sectionHeading:{marginTop:13,marginBottom:8},
 info:{fontSize:13,lineHeight:20,color:C.muted,marginBottom:9},smallMuted:{fontSize:11,color:C.muted,lineHeight:16},
 empty:{fontSize:14,color:C.muted,marginVertical:14,lineHeight:21},
 description:{fontSize:14,color:C.text,lineHeight:22,marginVertical:12},
 error:{fontSize:13,color:C.error,marginVertical:10,lineHeight:19},
 card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:15,padding:14,marginVertical:11},
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
 list:{gap:8},listRow:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:13,padding:13,marginVertical:4,flexDirection:"row",alignItems:"center",gap:9},
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