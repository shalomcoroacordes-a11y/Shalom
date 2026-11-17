const React=require("react");
const {useEffect,useMemo,useState,useRef,useCallback}=React;
const {
 View,Text,TextInput,Pressable,ScrollView,StatusBar,StyleSheet,
 Switch,Alert,AppState,BackHandler,Platform,Linking,Image,ActivityIndicator
}=require("react-native");
const NetInfo=require("@react-native-community/netinfo").default;
const {SafeAreaProvider,SafeAreaView}=require("react-native-safe-area-context");
const {getCatalog,getMetadata,setMetadata}=require("./src/database");
const {syncAll,networkState}=require("./src/sync");
const {parseSong}=require("./src/chords");
const {buildCatalog,normalize,names,typeLabel,safeWebUrl}=require("./src/catalog");
const {sendRequest,TYPES}=require("./src/requests");
const h=React.createElement;
const C={bg:"#0e1219",panel:"#19222d",sub:"#232d39",border:"#354650",
 text:"#f4f7f7",muted:"#b0c0c7",green:"#27c98b",pale:"#b5ffe0",error:"#ffc4bf",gold:"#ffce53"};
const MONO=Platform.OS==="ios"?"Menlo":"monospace";
const tabs=[["Inicio","⌂"],["Canciones","♫"],["Repertorios","☷"],["Artistas","♩"],["Categorías","▦"],["Más","•••"]];
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
 return h(Pressable,{onPress,disabled,accessibilityRole:"button",
   style:[S.button,secondary&&S.secondary,small&&S.smallBtn,disabled&&{opacity:.5}]},
  label(text,[S.buttonText,secondary&&S.secondaryText,small&&S.smallBtnText]));
}
function Card({children,style}){return h(View,{style:[S.card,style]},children)}
function Chip({text,active=false,onPress}){
 return h(Pressable,{onPress,accessibilityRole:"button",style:[S.chip,active&&S.chipActive]},
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
function App() {
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
 const [folderType,setFolderType]=useState("");
 const [folderId,setFolderId]=useState("");
 const [transpose,setTranspose]=useState(0);
 const [capo,setCapo]=useState("none");
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
 const previousTabRef=useRef("Inicio");
 const detailHistoryRef=useRef([]);
 const model=useMemo(()=>buildCatalog(copy?.data||{}),[copy]);
 const active=detail?.type==="song"?model.songs.find(s=>s.id===detail.id):null;
 const focusedArtist=detail?.type==="artist"?model.artistMap.get(detail.id):null;
 const focusedAlbum=detail?.type==="album"?model.albumMap.get(detail.id):null;
 const focusedMedley=detail?.type==="medley"?model.medleys.find(x=>x.id===detail.id):null;
 const focusedRepertoire=detail?.type==="repertoire"?model.repertoires.find(x=>x.id===detail.id):null;
 const eligible=useMemo(()=>model.songs.filter(s=>{
  if(typeFilter&&s.song_type!==typeFilter)return false;
  if(categoryId&&!s._categories.some(c=>model.descendants(categoryId).has(c.id)))return false;
  const term=normalize(query.trim());
  if(!term)return true;
  return normalize([s.title,s.tone,s.lyrics,names(s._artists),names(s._categories)].join(" ")).includes(term);
 }),[model,typeFilter,categoryId,query]);
 function goTab(next){setSettingsOpen(false);setImmersive(false);detailHistoryRef.current=[];setTab(next);setDetail(null);setCountLimit(80);setFolderType("");setFolderId("");setQuery("");setTypeFilter("");setCategoryId("");}
 function openDetail(next){if(detail)detailHistoryRef.current.push(detail);setDetail(next);}
 function rememberRead(next){setLastRead(next);setMetadata("last_read",JSON.stringify(next)).catch(()=>{});}
 function selectSong(song){openDetail({type:"song",id:song.id,from:tab});rememberRead({type:"song",id:song.id});setTranspose(0);setCapo("none");}
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
  inFlight.current=true;setBusy(true);setError("");setProgress("Comprobando conexión…");
  try{
   const result=await syncAll({wifiOnly:prefRef.current,manual,onProgress:p=>
    setProgress("Descargando "+p.index+"/"+p.total+" · "+p.table.replace(/_/g," "))});
   if(result.skipped){setProgress(result.reason);return}
   const saved=await getCatalog();
   lastRef.current=saved.syncedAt;setCopy(saved);
   setProgress(saved.data.songs.length+" cantos y sus carpetas guardados en el teléfono.");
  }catch(e){
   setError(e.message||"No se pudo descargar el cancionero.");
   setProgress("Si había una copia anterior, se conserva.");
  }finally{inFlight.current=false;setBusy(false)}
 },[]);
 const tryAuto=useCallback(async()=>{
  if(inFlight.current)return;
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
    const [snapshot,pref,n,last]=await Promise.all([
     getCatalog(),getMetadata("wifi_only","true"),networkState(),getMetadata("last_read","")
    ]);
    if(!enabled)return;
    lastRef.current=snapshot.syncedAt;prefRef.current=pref!=="false";
    setCopy(snapshot);setWifiOnly(pref!=="false");setNetwork(n);if(last){try{setLastRead(JSON.parse(last))}catch(_){}}setLoaded(true);
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
   h(View,{style:{height:12}}),
   h(Btn,{text:"← Regresar a Inicio",secondary:true,onPress:()=>setSettingsOpen(false)})
  );
 }
 function renderHome(){
  const recentDate=item=>Date.parse(item.updated_at||item.created_at||"")||Date.parse(item.created_at||"")||0;
  const newest=[...model.songs].sort((a,b)=>recentDate(b)-recentDate(a)).slice(0,6);
   const lastSong=lastRead?.type==="song"?model.songs.find(x=>String(x.id)===String(lastRead.id)):null;
  const lastMedley=lastRead?.type==="medley"?model.medleys.find(x=>String(x.id)===String(lastRead.id)):null;
  return h(View,null,
   h(View,{style:S.hero},
    label("CANCIONERO PARA EL CORO",S.eyebrow),
    label("Tus cantos, siempre contigo.",S.heroTitle),
    label("Letras y acordes para ensayar y compartir.",S.info),
    h(View,{style:S.rowWrap},
     h(Btn,{text:"♫ Canciones",small:true,onPress:()=>goTab("Canciones")}),
     h(Btn,{text:"♬ Popurrís",small:true,secondary:true,onPress:()=>goTab("Popurrís")}),
     h(Btn,{text:"+ Solicitar",small:true,secondary:true,onPress:()=>requestForm("song")}))
   ),
   h(Pressable,{style:S.syncCompact,onPress:()=>setSettingsOpen(true),accessibilityRole:"button"},
    h(View,{style:{flex:1}},
     label(copy?.syncedAt?"✓ Biblioteca actualizada":"↓ Biblioteca pendiente",S.listTitle),
     label(model.songs.length+" cantos · "+model.artists.length+" artistas · "+model.categories.length+" categorías",S.rowMeta)),
    label("⚙ ›",S.rowArrow)),
   busy?label("Sincronizando… "+progress,S.info):null,
   error?label(error,S.error):null,
   title("Mi próxima misa"),
   (()=>{const today=new Date().toISOString().slice(0,10);
    const next=model.repertoires.filter(r=>r.kind==="misa"&&r.event_date&&r.event_date>=today)[0];
    const undated=model.repertoires.find(r=>r.kind==="misa"&&!r.event_date);
    const chosen=next||undated;
    return chosen?h(Pressable,{style:S.listRow,onPress:()=>selectRepertoire(chosen)},
      h(View,{style:{flex:1}},label(chosen.title,S.listTitle),
       label([chosen.event_date||"Sin fecha",chosen.location,(chosen.items||[]).length+" cantos"].filter(Boolean).join(" · "),S.rowMeta)),
      label("›",S.rowArrow))
      :h(Card,null,label("No hay una próxima misa publicada con fecha futura.",S.info),
       label("Consulta todos los repertorios o asigna una fecha desde el administrador.",S.smallMuted));
   })(),
   h(Btn,{text:"Ver todos los repertorios ("+model.repertoires.length+")",secondary:true,onPress:()=>goTab("Repertorios")}),
   lastSong||lastMedley?title("Continuar donde me quedé"):null,
   lastSong?h(SongRow,{song:lastSong,onPress:()=>selectSong(lastSong)}):null,
   lastMedley?h(Pressable,{style:S.listRow,onPress:()=>selectMedley(lastMedley)},
    h(View,{style:{flex:1}},label(lastMedley.title,S.listTitle),label("Retomar popurrí",S.rowMeta)),label("›",S.rowArrow)):null,
   title("Buscar canto rápidamente"),
   h(TextInput,{style:S.input,value:homeSearch,onChangeText:setHomeSearch,
    placeholder:"Buscar por nombre, letra o artista…",placeholderTextColor:C.muted,
    accessibilityLabel:"Buscar canto en Inicio"}),
   homeSearch.trim()?(()=>{
    const q=normalize(homeSearch.trim());
    const found=model.songs.filter(song=>normalize([song.title,song.lyrics,names(song._artists)].join(" ")).includes(q)).slice(0,6);
    return h(View,{style:S.list},
     ...found.map(song=>h(SongRow,{key:song.id,song,onPress:()=>selectSong(song)})),
     !found.length?label("No se encontraron cantos.",S.empty):null,
     h(Btn,{text:"Buscar en todas las canciones",secondary:true,onPress:()=>{goTab("Canciones");setQuery(homeSearch)}}));
   })():null,
   title("Canciones recientes","Últimos cantos agregados o actualizados"),
   newest.length?h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,style:{marginBottom:6},
    contentContainerStyle:{gap:10,paddingVertical:3}},
    ...newest.map(song=>h(Pressable,{key:song.id,style:S.newCard,onPress:()=>selectSong(song),accessibilityRole:"button"},
     label("♫",S.entityEmoji),label(song.title,S.listTitle),
     label([names(song._artists),song.tone?"Tono "+song.tone:""].filter(Boolean).join(" · ")||"Canto",S.rowMeta)))):label("Aún no hay novedades descargadas.",S.empty),

  );
 }
 function renderSongs(){
  return h(View,null,title("Canciones","Buscar letras, acordes, tonos o palabras"),
   !copy?.syncedAt?h(Card,null,
     label("Primero descarga el cancionero",S.listTitle),
     label("La app todavía no tiene cantos guardados. Con Wi-Fi, pulsa Descargar para recibirlos desde SHALOM.",S.info),
     h(Btn,{text:busy?"Descargando…":"Descargar mis cantos",onPress:manualSync,disabled:busy}),
     busy?h(ActivityIndicator,{color:C.green,style:{marginTop:10}}):null,
     Boolean(error)?label(error,S.error):null,
     Boolean(progress)?label(progress,S.info):null):null,
   inputField("Buscar canto",query,v=>{setQuery(v);setCountLimit(80)},{placeholder:"Nombre, letra o artista…"}),
   h(View,{style:S.chips},
    ...[["","Todas"],["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"]]
     .map(([val,text])=>h(Chip,{key:val,text,active:typeFilter===val,onPress:()=>{
      setTypeFilter(val);setCountLimit(80)
     }}))),
   categoryId?h(View,{style:S.rowWrap},label("Filtro: "+model.categoryPath(model.categoryMap.get(categoryId)),S.info),
    h(Btn,{text:"Quitar filtro",small:true,secondary:true,onPress:()=>setCategoryId("")})):null,
   label(eligible.length+" resultados",S.smallMuted),
   !copy?.syncedAt?label("Aún no se ha descargado la biblioteca. No significa que las canciones hayan desaparecido de Supabase.",S.info):previewSongs(eligible));
 }
 function renderArtists(){
  const list=model.artists.filter(a=>normalize([a.name,a.description,a.artist_type].join(" ")).includes(normalize(query)));
  return h(View,null,title("Artistas","Descubre ministerios, coros y músicos"),
    inputField("Buscar artista",query,setQuery,{placeholder:"Nombre del artista…"}),
    ...list.slice(0,countLimit).map(a=>h(EntityRow,{key:a.id,item:a,kind:"artist",
     description:type(a.artist_type)+" · "+model.songsForArtist(a.id).length+" cantos",
     onPress:()=>openDetail({type:"artist",id:a.id})})),
    list.length>countLimit?h(Btn,{text:"Mostrar más artistas",secondary:true,onPress:()=>setCountLimit(n=>n+80)}):null,
    !list.length?label("No hay artistas que coincidan.",S.empty):null);
 }
 function renderCategories(){
  const current=model.categoryMap.get(folderId);
  if(!folderType)return h(View,null,title("Categorías","Elige una sección para navegar por carpetas"),
   ...[["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"],["general","General"]]
    .map(([code,name])=>h(Pressable,{key:code,style:S.listRow,onPress:()=>setFolderType(code)},
     label("📁 "+name,S.listTitle),label("›",S.rowArrow))));
  let roots=model.children("",folderType);
  const children=current?model.children(current.id):roots;
  const subs=current?model.songsForCategory(current.id):[];
  return h(View,null,
   h(View,{style:S.breadcrumb},
    h(Btn,{text:"‹ Categorías",small:true,secondary:true,onPress:()=>{setFolderType("");setFolderId("")}}),
    h(Btn,{text:type(folderType),small:true,secondary:true,onPress:()=>setFolderId("")}),
    ...(current?model.ancestors(current).map(c=>h(Btn,{key:c.id,text:c.name,small:true,secondary:c.id!==current.id,
      onPress:()=>setFolderId(c.id)})):[])),
   title(current?.name||type(folderType),
    current?.description||"Abre una carpeta para encontrar sus cantos"),
   ...children.map(c=>h(EntityRow,{key:c.id,item:c,kind:"folder",
    description:model.songsForCategory(c.id).length+" cantos · "+model.children(c.id).length+" subcarpetas",
    onPress:()=>setFolderId(c.id)})),
   current?title("Cantos en esta carpeta",subs.length+" cantos incluyendo subcarpetas"):null,
   current?previewSongs(subs):null,
   !children.length&&!current?label("Todavía no hay carpetas en esta sección.",S.empty):null
  );
 }
 function renderMore(){
  return h(View,null,title("Más opciones","Otras secciones de SHALOM"),
   h(Pressable,{style:S.listRow,onPress:()=>goTab("Popurrís")},
    h(View,{style:{flex:1}},label("♬ Popurrís",S.listTitle),
     label("Varios cantos unidos en una lectura · "+model.medleys.length+" disponibles",S.rowMeta)),
    label("›",S.rowArrow)),
   h(Pressable,{style:S.listRow,onPress:()=>goTab("Álbumes")},
    h(View,{style:{flex:1}},label("▣ Álbumes",S.listTitle),
     label("Colecciones musicales · "+model.albums.length+" disponibles",S.rowMeta)),
    label("›",S.rowArrow)),
   h(Pressable,{style:S.listRow,onPress:()=>requestForm("song")},
    h(View,{style:{flex:1}},label("+ Solicitar canto o corrección",S.listTitle),
     label("Enviar una solicitud al administrador",S.rowMeta)),
    label("›",S.rowArrow)));
 }
 function renderRepertoires(){
  const list=model.repertoires.filter(r=>normalize([r.title,r.kind,r.location,r.notes,r.event_date].join(" ")).includes(normalize(query)));
  return h(View,null,title("Repertorios","Misas y ensayos preparados desde SHALOM"),
   inputField("Buscar repertorio",query,setQuery,{placeholder:"Misa, ensayo, fecha o lugar…"}),
   ...list.map(rep=>h(Pressable,{key:rep.id,style:S.listRow,onPress:()=>selectRepertoire(rep)},
    h(View,{style:{flex:1}},label(rep.title,S.listTitle),
     label([(rep.kind==="misa"?"Misa":"Ensayo"),rep.event_date,rep.location,(rep.items||[]).length+" cantos"].filter(Boolean).join(" · "),S.rowMeta)),
    label("›",S.rowArrow))),
   !list.length?label("No hay repertorios publicados en la biblioteca descargada. Actualiza desde Ajustes.",S.empty):null);
 }
 function renderRepertoireDetail(rep){
  const items=Array.isArray(rep.items)?rep.items:[];
  return h(View,null,
   h(View,{style:S.readerActions},
    h(Btn,{text:"← Volver a repertorios",secondary:true,onPress:()=>{setImmersive(false);back()}}),
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
  const list=model.medleys.filter(m=>normalize([m.title,m.description,m.song_type].join(" ")).includes(normalize(query)));
  return h(View,null,
   title("Popurrís","Varios cantos unidos en una sola lectura, con acordes y secciones"),
   inputField("Buscar popurrí",query,setQuery,{placeholder:"Nombre o celebración…"}),
   ...list.map(m=>h(Pressable,{key:m.id,style:S.listRow,accessibilityRole:"button",onPress:()=>selectMedley(m)},
     h(View,{style:S.entityIcon},label("♬",S.entityEmoji)),
     h(View,{style:{flex:1}},label(m.title,S.listTitle),
       label((m.parts||[]).length+" fragmentos · "+type(m.song_type),S.rowMeta)),
     label("›",S.rowArrow))),
   !list.length?label(copy?.syncedAt?"Todavía no hay popurrís publicados o no coinciden con la búsqueda.":"Descarga o actualiza el cancionero desde Inicio para consultar los popurrís sin internet.",S.empty):null
  );
 }
 function renderMedleyDetail(medley){
  const parts=Array.isArray(medley.parts)?medley.parts:[];
  return h(View,null,
   h(View,{style:S.readerActions},
    h(Btn,{text:"← Volver a Popurrís",secondary:true,onPress:()=>{setImmersive(false);back()}}),
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
  return h(View,null,title("Álbumes","Colecciones de canciones y artistas"),
   ...model.albums.map(a=>h(EntityRow,{key:a.id,item:a,kind:"album",
    description:(a.description||"")+" · "+model.songsForAlbum(a.id).length+" cantos",
    onPress:()=>openDetail({type:"album",id:a.id})})),
   !model.albums.length?label("Todavía no hay álbumes publicados. En cuanto se agreguen en el administrador aparecerán aquí después de sincronizar.",S.empty):null);
 }
 function renderArtistDetail(a){
  const songs=model.songsForArtist(a.id);
  const urls=[["YouTube",a.youtube_url],["Spotify",a.spotify_url],
   ["Instagram",a.instagram_url],["Facebook",a.facebook_url]].filter(x=>safeWebUrl(x[1]));
  return h(View,null,
   h(Btn,{text:"← Volver a artistas",secondary:true,onPress:back}),
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
   h(Btn,{text:"← Volver a álbumes",secondary:true,onPress:back}),
   label("ÁLBUM",S.eyebrow),label(a.title,S.readerTitle),
   a.description?label(a.description,S.description):null,
   owner?h(Btn,{text:"Artista: "+owner.name,secondary:true,onPress:()=>openDetail({type:"artist",id:owner.id})}):null,
   title("Cantos",songs.length+" canciones"),previewSongs(songs)
  );
 }
 function renderSongDetail(song){
  const choices=[{id:"none",label:"Sin capo",position:0,key:""}];
  if(song.capo_position>0)choices.push({id:"main",label:"Capo "+song.capo_position,
    position:song.capo_position,key:song.capo_key||""});
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
  const resources=[...(song._links||[]).map(link=>[link.title||link.platform||"Abrir enlace",link.url]),
   ["Tutorial de guitarra",song.tutorial_guitar],["Tutorial de piano",song.tutorial_piano]]
   .filter(x=>safeWebUrl(x[1]));
  return h(View,null,
   h(View,{style:S.readerActions},
    h(Btn,{text:"← Volver",secondary:true,onPress:()=>{setImmersive(false);back()}}),
    Platform.OS==="android"?h(Btn,{text:immersiveActive?"Salir de pantalla completa":"⛶ Pantalla completa",small:true,secondary:!immersiveActive,onPress:()=>setImmersive(v=>!v)}):null),
   label(type(song.song_type).toUpperCase(),S.eyebrow),
   label(song.title||"Sin título",S.readerTitle),
   label([names(song._artists),song.tone?"Tono "+song.tone:"",song.difficulty].filter(Boolean).join(" · "),S.info),
   h(View,{style:S.chips},
    ...song._categories.map(c=>h(Chip,{key:c.id,text:c.name,onPress:()=>{
     detailHistoryRef.current=[];setDetail(null);setTab("Categorías");setFolderType(c.song_type);setFolderId(c.id)
    }}))),
   h(Card,{style:{marginTop:12}},
    label("Tono y acordes",S.listTitle),
    h(View,{style:S.transpose},
     h(Btn,{text:"− Semitono",small:true,secondary:true,onPress:()=>setTranspose(v=>Math.max(-11,v-1))}),
     label(transpose===0?"Tono original":(transpose>0?"+":"")+transpose+" semitonos",S.smallMuted),
     h(Btn,{text:"+ Semitono",small:true,secondary:true,onPress:()=>setTranspose(v=>Math.min(11,v+1))}),
     h(Btn,{text:"Original",small:true,secondary:true,onPress:()=>{setTranspose(0);setCapo("none")}})),
    choices.length>1?label("Versiones con capo registradas",S.fieldTitle):null,
    choices.length>1?h(View,{style:S.chips},...choices.map(choice=>h(Chip,{key:choice.id,
     text:choice.label,active:capo===choice.id,onPress:()=>setCapo(choice.id)}))):null,
    chosen.id!=="none"?label("Capo "+chosen.position+(chosen.key?" · Figuras en "+chosen.key:""),S.smallMuted):null
   ),
   h(ScrollView,{horizontal:true,nestedScrollEnabled:true,style:S.lyricsArea,
    contentContainerStyle:{padding:14,minWidth:"100%"}},
    h(View,null,...parseSong(song.lyrics||"Sin letra guardada.",transpose+capoOffset).map((r,i)=>{
     if(r.kind==="space")return h(View,{key:i,style:{height:16}});
     if(r.kind==="section")return h(Text,{key:i,style:S.verse},r.text);
     if(r.kind==="chords")return h(View,{key:i,style:{marginBottom:5}},
       h(Text,{style:S.chordText},r.chordLine||" "),
       h(Text,{style:S.lyricText},r.lyricLine||" "));
     return h(Text,{key:i,style:r.kind==="chordsOnly"?S.chordText:S.lyricText},r.text||" ");
    }))),
   resources.length?title("Videos y tutoriales","Los enlaces se abren con internet"):null,
   ...resources.map(([txt,url],index)=>h(Btn,{key:index,text:"▶ "+txt+" ↗",secondary:true,onPress:()=>{
    if(!network.online)Alert.alert("Necesitas internet","Conéctate para abrir videos o enlaces externos.");
    else openWeb(url);
   }})),
   title("¿Algo está mal en el canto?"),
   h(View,{style:S.rowWrap},
    h(Btn,{text:"Reportar letra",secondary:true,onPress:()=>requestForm("lyrics",song)}),
    h(Btn,{text:"Corregir acordes o tono",secondary:true,onPress:()=>requestForm("chords",song)})),
   model.albums.filter(a=>song._albums.some(x=>x.id===a.id)).length?title("Álbumes"):null,
   ...song._albums.map(a=>h(EntityRow,{key:a.id,item:a,kind:"album",
     description:"Ver canciones",onPress:()=>openDetail({type:"album",id:a.id})}))
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
 return h(SafeAreaProvider,null,h(SafeAreaView,{style:S.root,edges:immersiveActive?["bottom","left","right"]:["top","bottom","left","right"]},
  h(StatusBar,{barStyle:"light-content",backgroundColor:C.bg,hidden:immersiveActive,animated:true}),
  !immersiveActive?h(View,{style:S.header},label("🕊️ SHALOM",S.logo),
   h(Pressable,{onPress:()=>setSettingsOpen(v=>!v),style:S.headerAction},label(settingsOpen?"Cerrar":"⚙ Ajustes",S.headerActionText)),
   label(network.online?(network.wifi?"Wi-Fi":"Online"):"Offline",[S.net,network.online?{color:C.pale}:{color:C.gold}])):null,
  !loaded?h(View,{style:{flex:1,justifyContent:"center"}},h(ActivityIndicator,{color:C.green})):
  h(ScrollView,{key:(detail?.type||tab)+(detail?.id||""),style:{flex:1},contentContainerStyle:S.page,
   keyboardShouldPersistTaps:"handled"},
   settingsOpen?renderSettings():page,h(View,{style:{height:27}})),
  !immersiveActive&&!settingsOpen?h(View,{style:S.nav},
   ...tabs.map(([name,icon])=>h(Pressable,{key:name,accessibilityRole:"tab",accessibilityState:{selected:(tab===name||(name==="Más"&&["Popurrís","Álbumes"].includes(tab)))&&!detail},
     onPress:()=>goTab(name),style:[S.navItem,(tab===name||(name==="Más"&&["Popurrís","Álbumes"].includes(tab)))&&!detail&&S.navSelected]},
    label(icon,[S.navIcon,(tab===name||(name==="Más"&&["Popurrís","Álbumes"].includes(tab)))&&!detail&&{color:C.green}]),
    label(name,[S.navText,(tab===name||(name==="Más"&&["Popurrís","Álbumes"].includes(tab)))&&!detail&&{color:C.green}])))) : null
 ));
}
const S=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},header:{backgroundColor:C.panel,paddingHorizontal:13,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:9,borderBottomWidth:1,borderColor:C.border,minHeight:56},
 logo:{fontSize:19,fontWeight:"900",color:C.green,flex:1},headerAction:{borderWidth:1,borderColor:C.green,borderRadius:99,padding:7},
 headerActionText:{color:C.pale,fontSize:11,fontWeight:"750"},net:{fontSize:11,fontWeight:"750"},
 page:{paddingHorizontal:14,paddingTop:19,paddingBottom:20},
 readerActions:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:8},
 capoNote:{fontSize:12,color:C.pale,fontWeight:"800",marginTop:7},
 hero:{padding:13,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:16,marginBottom:10},
 syncCompact:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:13,padding:13,flexDirection:"row",alignItems:"center",marginBottom:9},
 newCard:{width:190,minHeight:125,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:14,padding:13,justifyContent:"center",gap:6},
 eyebrow:{fontSize:11,letterSpacing:1.5,color:C.green,fontWeight:"850",marginBottom:10},
 heroTitle:{fontSize:22,lineHeight:28,fontWeight:"900",color:C.text,marginBottom:7},
 title:{fontSize:20,color:C.text,fontWeight:"850",marginBottom:6},
 sectionHeading:{marginTop:17,marginBottom:11},
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
 navIcon:{fontSize:22,color:C.muted,lineHeight:24},navText:{fontSize:9,fontWeight:"800",color:C.muted,marginTop:4}
});
module.exports=App;