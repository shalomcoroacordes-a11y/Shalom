const React=require("react");
const {useEffect,useMemo,useState,useRef,useCallback}=React;
const {View,Text,TextInput,Pressable,FlatList,ScrollView,SafeAreaView,StatusBar,StyleSheet,Switch,Alert,AppState,Platform}=require("react-native");
const NetInfo=require("@react-native-community/netinfo").default;
const {getCatalog,getMetadata,setMetadata}=require("./src/database");
const {syncAll,networkState}=require("./src/sync");
const {parseSong}=require("./src/chords");
const h=React.createElement;

const C={bg:"#0d1217",panel:"#18212b",inset:"#232e3a",border:"#34424d",text:"#f2f7f6",muted:"#a8bac2",green:"#27c98b",pale:"#a8ffdb",error:"#ffb7b7"};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const names=rows=>(rows||[]).map(x=>x?.name||x?.title).filter(Boolean).join(" · ");
const TYPES={catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto"};
const MONO=Platform.OS==="ios"?"Menlo":"monospace";
const mk=(style,text)=>h(Text,{style},String(text||""));
function Button({label,onPress,secondary=false,disabled=false}) {
 return h(Pressable,{onPress,disabled,style:[S.button,secondary&&S.secondary,disabled&&S.disabled]},
  h(Text,{style:[S.buttonText,secondary&&S.secondaryText]},label));
}
function rowItem(item,click){
 return h(Pressable,{onPress:click,style:S.songItem},
  h(View,{style:{flex:1}},mk(S.songTitle,item.title||"Canto sin título"),
    mk(S.songInfo,[names(item._artists),item.tone?"Tono "+item.tone:""].filter(Boolean).join(" · "))),
  mk(S.openArrow,"›"));
}
function inflate(data){
 const artists=new Map((data.artists||[]).map(x=>[x.id,x]));
 const categories=new Map((data.categories||[]).map(x=>[x.id,x]));
 const albums=new Map((data.albums||[]).map(x=>[x.id,x]));
 const relations={song_artists:{},song_categories:{},album_songs:{},song_links:{},song_capo_versions:{}};
 for(const name of Object.keys(relations)){
  for(const link of data[name]||[]) {
   if(!relations[name][link.song_id])relations[name][link.song_id]=[];
   relations[name][link.song_id].push(link);
  }
 }
 const songs=(data.songs||[]).map(song=>({...song,
  _artists:(relations.song_artists[song.id]||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(r=>artists.get(r.artist_id)).filter(Boolean),
  _categories:(relations.song_categories[song.id]||[]).map(r=>categories.get(r.category_id)).filter(Boolean),
  _albums:(relations.album_songs[song.id]||[]).map(r=>albums.get(r.album_id)).filter(Boolean),
  _links:(relations.song_links[song.id]||[]),
  _capos:(relations.song_capo_versions[song.id]||[])
 })).sort((a,b)=>(a.title||"").localeCompare(b.title||"","es"));
 function catPath(cat){
  if(!cat)return "";
  const path=[],seen=new Set();let item=cat;
  while(item&&!seen.has(item.id)){seen.add(item.id);path.unshift(item.name);item=categories.get(item.parent_id)}
  let ancestor=cat;while(ancestor?.parent_id&&categories.has(ancestor.parent_id))ancestor=categories.get(ancestor.parent_id);
  return [(TYPES[ancestor?.song_type]||"General"),...path].join(" › ");
 }
 return {songs,artists:[...artists.values()].sort((a,b)=>(a.name||"").localeCompare(b.name||"","es")),
  categories:[...categories.values()].sort((a,b)=>catPath(a).localeCompare(catPath(b),"es")),
  categoryMap:categories,catPath};
}
function makeCategoryDescendants(id,map){
 const result=new Set([id]);let changed=true;
 while(changed){changed=false;for(const cat of map.values())if(cat.parent_id&&result.has(cat.parent_id)&&!result.has(cat.id)){result.add(cat.id);changed=true}}
 return result;
}

function App() {
 const [saved,setSaved]=useState(null);
 const [wifiOnly,setWifiOnly]=useState(true);
 const [online,setOnline]=useState(false);
 const [wifi,setWifi]=useState(false);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [type,setType]=useState("");
 const [categoryId,setCategoryId]=useState("");
 const [artistId,setArtistId]=useState("");
 const [chooser,setChooser]=useState("");
 const [chooserSearch,setChooserSearch]=useState("");
 const [activeId,setActiveId]=useState("");
 const [shift,setShift]=useState(0);
 const [maxResults,setMaxResults]=useState(100);
 const inFlight=useRef(false),wifiRef=useRef(true),syncedRef=useRef(null);
 const model=useMemo(()=>inflate(saved?.data||{}),[saved]);
 const active=model.songs.find(x=>x.id===activeId);
 const catIds=useMemo(()=>categoryId?makeCategoryDescendants(categoryId,model.categoryMap):null,[categoryId,model]);
 const filtered=useMemo(()=>model.songs.filter(song=>{
  if(type&&song.song_type!==type)return false;
  if(artistId&&!song._artists.some(a=>a.id===artistId))return false;
  if(catIds&&!song._categories.some(c=>catIds.has(c.id)))return false;
  const q=norm(search.trim());
  return !q||norm([song.title,song.lyrics,song.tone,...song._artists.map(a=>a.name),...song._categories.map(c=>c.name)].join(" ")).includes(q);
 }),[model,search,type,artistId,catIds]);

 const syncNow=useCallback(async (forceCellular=false)=>{
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError("");
  try{
   const result=await syncAll({wifiOnly:wifiRef.current,manual:forceCellular,
    onProgress:info=>setProgress("Descargando "+info.index+"/"+info.total+" · "+info.table.replaceAll("_"," "))});
   if(result.skipped){setProgress(result.reason);return;}
   const copy=await getCatalog();
   syncedRef.current=copy.syncedAt;
   setSaved(copy);setProgress(copy.data.songs.length+" cantos guardados en la aplicación.");
  }catch(e){
   setError(e.message||"No se pudo descargar el cancionero.");
   setProgress("La copia anterior sigue guardada en el teléfono.");
  }finally{inFlight.current=false;setBusy(false)}
 },[]);
 const tryAutomatic=useCallback(async()=>{
  if(inFlight.current)return;
  const last=syncedRef.current?new Date(syncedRef.current).valueOf():0;
  if(Date.now()-last<20*60*1000)return;
  try{
   const net=await networkState();
   if(!net.online||(wifiRef.current&&!net.wifi))return;
   await syncNow(false);
  }catch(_) {/* La lectura local debe seguir disponible. */}
 },[syncNow]);
 const requestManual=async()=>{
  const net=await networkState();
  setOnline(net.online);setWifi(net.wifi);
  if(!net.online){Alert.alert("Sin internet","Los cantos ya descargados siguen disponibles.");return;}
  if(wifiOnly&&!net.wifi){
   Alert.alert("No se detecta Wi-Fi","La descarga utilizaría otra conexión. ¿Quieres continuar?",
    [{text:"Cancelar",style:"cancel"},{text:"Descargar",onPress:()=>syncNow(true)}]);return;
  }
  syncNow(true);
 };
 useEffect(()=>{
  let mounted=true;
  (async()=>{
   try{
    const [copy,pref,net]=await Promise.all([getCatalog(),getMetadata("wifi_only","true"),networkState()]);
    if(!mounted)return;
    syncedRef.current=copy.syncedAt;wifiRef.current=pref!=="false";
    setWifiOnly(pref!=="false");setOnline(net.online);setWifi(net.wifi);setSaved(copy);
    if(copy.syncedAt)tryAutomatic();
   }catch(e){if(mounted)setError(e.message||"No se pudo abrir la base local.")}
  })();
  const unsub=NetInfo.addEventListener(s=>{
   if(!mounted)return;
   const active=Boolean(s.isConnected&&s.isInternetReachable!==false);
   setOnline(active);setWifi(s.type==="wifi");
   if(active&&s.type==="wifi")tryAutomatic();
  });
  const listener=AppState.addEventListener("change",mode=>{if(mode==="active")tryAutomatic()});
  return()=>{mounted=false;unsub();listener.remove()};
 },[tryAutomatic]);
 const changeWifi=async value=>{
  wifiRef.current=value;setWifiOnly(value);
  await setMetadata("wifi_only",value?"true":"false");
  if(!value)tryAutomatic();
 };
 function openSong(id){setActiveId(id);setShift(0)}
 function resetBrowse(){setActiveId("");setShift(0)}
 const header=h(View,{style:S.header},mk(S.brand,"🕊️ SHALOM"),
  mk([S.connection,{color:online?C.pale:"#ffca9b"}],online?(wifi?"Wi-Fi":"Conectado"):"Sin conexión"));
 const lastText=saved?.syncedAt?new Date(saved.syncedAt).toLocaleString("es-MX"):"Aún no se ha descargado";
 const counts={songs:saved?.data?.songs?.length||0,artists:saved?.data?.artists?.length||0,categories:saved?.data?.categories?.length||0};

 const reader=active&&h(ScrollView,{style:{flex:1},contentContainerStyle:S.page,keyboardShouldPersistTaps:"handled"},
  h(Button,{label:"← Volver a mis cantos",onPress:resetBrowse,secondary:true}),
  mk(S.eyebrow,TYPES[active.song_type]||"Canto"),
  mk(S.readerTitle,active.title||"Canto"),
  mk(S.songInfo,[names(active._artists),active.tone?"Tono "+active.tone:"",...active._categories.map(c=>model.catPath(c))].filter(Boolean).join(" · ")),
  h(View,{style:S.transposeBar},
   h(Button,{label:"−",onPress:()=>setShift(v=>Math.max(-11,v-1)),secondary:true}),
   mk(S.info,shift===0?"Tono original":(shift>0?"+":"")+shift+" semitonos"),
   h(Button,{label:"+",onPress:()=>setShift(v=>Math.min(11,v+1)),secondary:true}),
   h(Button,{label:"Restablecer",onPress:()=>setShift(0),secondary:true})),
  h(ScrollView,{horizontal:true,style:S.lyricsScroll,contentContainerStyle:S.lyricsPadding},
   h(View,null,...parseSong(active.lyrics||"Sin letra.",shift).map((r,i)=>{
    if(r.kind==="space")return h(View,{key:i,style:{height:17}});
    if(r.kind==="section")return h(Text,{key:i,style:S.section},r.text);
    if(r.kind==="chords")return h(View,{key:i,style:{marginBottom:4}},
      h(Text,{style:S.chords},r.chordLine||" "),h(Text,{style:S.lyricLine},r.lyricLine||" "));
    return h(Text,{key:i,style:r.kind==="chordsOnly"?S.chords:S.lyricLine},r.text||" ");
   }))),
  active._albums.length>0&&mk(S.info,"Álbumes: "+names(active._albums)),
  active._capos.length>0&&mk(S.info,"Versiones con capo: "+active._capos.map(v=>v.label||("Capo "+v.capo_position+" · "+v.capo_key)).join(" · ")),
  active._links.length>0&&mk(S.info,"Recursos externos: se guardan sus referencias; los videos requieren internet.")
 );

 const pickerRows=chooser==="category"?model.categories:model.artists;
 const pickerEntries=pickerRows.filter(x=>norm(chooser==="category"?model.catPath(x):x.name).includes(norm(chooserSearch)));
 const picker=h(ModalLike,{open:Boolean(chooser),close:()=>setChooser("")},
  mk(S.title,chooser==="category"?"Elige una categoría":"Elige un artista"),
  h(TextInput,{value:chooserSearch,onChangeText:setChooserSearch,placeholder:"Buscar...",placeholderTextColor:C.muted,style:S.input}),
  h(FlatList,{data:pickerEntries,keyExtractor:r=>r.id,
   renderItem:({item})=>h(Pressable,{style:S.pickerRow,onPress:()=>{
    if(chooser==="category")setCategoryId(item.id);else setArtistId(item.id);
    setChooser("");setChooserSearch("");
   }},mk(S.pickLabel,chooser==="category"?model.catPath(item):item.name)),
   ListEmptyComponent:mk(S.info,"No hay resultados.")}),
  h(Button,{label:"Quitar filtro",secondary:true,onPress:()=>{
   if(chooser==="category")setCategoryId("");else setArtistId("");
   setChooser("");setChooserSearch("");
  }})
 );

 const dashboard=h(FlatList,{data:filtered.slice(0,maxResults),style:{flex:1},contentContainerStyle:S.page,
  keyboardShouldPersistTaps:"handled",keyExtractor:x=>x.id,
  ListHeaderComponent:h(View,null,
    mk(S.eyebrow,"Cancionero sin internet"),
    mk(S.largeTitle,"Tus cantos, siempre contigo."),
    mk(S.info,"SHALOM guarda letras y acordes en una base de datos SQLite dentro de la aplicación."),
    h(View,{style:S.card},
     mk(S.title,"Mi biblioteca descargada"),
     mk(S.info,"Última actualización: "+lastText),
     h(View,{style:S.countRow},
      h(Count,{n:counts.songs,label:"Cantos"}),h(Count,{n:counts.artists,label:"Artistas"}),h(Count,{n:counts.categories,label:"Categorías"})),
     h(View,{style:S.switchRow},
      h(View,{style:{flex:1}},mk(S.normal,"Actualizar automáticamente por Wi-Fi"),
       mk(S.smallMuted,"Al abrir la app o volver a conectarte. No se garantiza con la app cerrada.")),
      h(Switch,{value:wifiOnly,onValueChange:changeWifi,trackColor:{false:C.border,true:"#188960"},thumbColor:C.pale})),
     h(Button,{label:busy?"Descargando…":saved?.syncedAt?"Actualizar cancionero":"Descargar cancionero completo",disabled:busy,onPress:requestManual}),
     busy&&h(ActivityIndicatorLike),
     Boolean(progress)&&mk(S.info,progress),Boolean(error)&&mk(S.error,error)
    ),
    mk(S.title,"Buscar canciones"),
    h(TextInput,{value:search,onChangeText:v=>{setSearch(v);setMaxResults(100)},
      style:S.input,placeholder:"Título, artista, frase de la letra...",placeholderTextColor:C.muted}),
    h(View,{style:S.chips},...[
     ["","Todos"],["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"]
    ].map(([val,label])=>h(Pressable,{key:val,onPress:()=>setType(val),
       style:[S.chip,type===val&&S.chipActive]},mk([S.chipText,type===val&&{color:C.bg}],label)))),
    h(View,{style:S.filterRow},
     h(Button,{label:categoryId?"📁 "+model.catPath(model.categoryMap.get(categoryId)):"📁 Categorías",onPress:()=>setChooser("category"),secondary:true}),
     h(Button,{label:artistId?"🎶 "+(model.artists.find(x=>x.id===artistId)?.name||"Artista"):"🎶 Artistas",onPress:()=>setChooser("artist"),secondary:true})),
    mk(S.info,filtered.length+" resultados"+(filtered.length>maxResults?" · se muestran los primeros "+maxResults:""))
   ),
  renderItem:({item})=>rowItem(item,()=>openSong(item.id)),
  ItemSeparatorComponent:()=>h(View,{style:{height:9}}),
  ListEmptyComponent:mk(S.info,saved?.syncedAt?"No se encontraron cantos.":"Pulsa Descargar para conservar todos los cantos."),
  ListFooterComponent:filtered.length>maxResults?h(Button,{label:"Mostrar más",secondary:true,onPress:()=>setMaxResults(v=>v+100)}):h(View,{style:{height:28}})
 });

 return h(SafeAreaView,{style:S.root},
  h(StatusBar,{barStyle:"light-content",backgroundColor:C.bg}),
  header,
  active?reader:dashboard,
  picker
 );
}
function Count({n,label}){return h(View,{style:S.count},mk(S.countNumber,String(n)),mk(S.smallMuted,label))}
const {Modal,ActivityIndicator}=require("react-native");
function ModalLike({open,close,children}) {
 return h(Modal,{visible:open,animationType:"slide",onRequestClose:close,transparent:true},
  h(View,{style:S.modalShade},h(View,{style:S.modalBody},
   h(View,{style:S.modalTop},mk(S.eyebrow,"Filtrar canciones"),h(Button,{label:"Cerrar ✕",secondary:true,onPress:close})),
   ...React.Children.toArray(children)
  )));
}
function ActivityIndicatorLike(){return h(ActivityIndicator,{color:C.green,style:{paddingTop:12}})}
const S=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},header:{paddingHorizontal:17,paddingVertical:14,borderBottomWidth:1,borderColor:C.border,backgroundColor:C.panel,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 brand:{fontSize:20,fontWeight:"900",color:C.green},connection:{fontSize:12,fontWeight:"700"},
 page:{paddingHorizontal:15,paddingTop:20,paddingBottom:35},
 eyebrow:{color:C.green,fontSize:11,letterSpacing:2,textTransform:"uppercase",fontWeight:"900",marginBottom:9},
 largeTitle:{fontSize:28,lineHeight:35,fontWeight:"900",color:C.text,marginBottom:8},
 title:{color:C.text,fontSize:19,fontWeight:"800",marginBottom:9},readerTitle:{color:C.text,fontSize:25,fontWeight:"900",marginBottom:10},
 normal:{fontSize:14,color:C.text,fontWeight:"750"},info:{color:C.muted,fontSize:13,lineHeight:20,marginTop:6,marginBottom:12},error:{color:C.error,fontSize:13,marginTop:10},
 card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:18,padding:15,marginVertical:17},
 countRow:{flexDirection:"row",gap:8,marginVertical:14},count:{flex:1,backgroundColor:C.inset,padding:12,borderRadius:12},
 countNumber:{fontSize:22,fontWeight:"900",color:C.green},smallMuted:{fontSize:11,color:C.muted,lineHeight:16},
 switchRow:{flexDirection:"row",gap:9,alignItems:"center",marginVertical:16},
 button:{backgroundColor:C.green,alignItems:"center",justifyContent:"center",borderRadius:11,paddingVertical:12,paddingHorizontal:13,minHeight:44},
 secondary:{backgroundColor:C.inset,borderWidth:1,borderColor:C.border},
 disabled:{opacity:.55},buttonText:{fontWeight:"850",color:C.bg,fontSize:13},secondaryText:{color:C.text},
 input:{backgroundColor:C.inset,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.text,paddingHorizontal:13,paddingVertical:12,marginBottom:13,fontSize:15},
 chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:13},
 chip:{backgroundColor:C.inset,borderColor:C.border,borderWidth:1,borderRadius:40,paddingVertical:8,paddingHorizontal:13},
 chipActive:{backgroundColor:C.green,borderColor:C.green},chipText:{color:C.text,fontWeight:"700",fontSize:13},
 filterRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:14},
 songItem:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,paddingHorizontal:15,paddingVertical:14,borderRadius:13,flexDirection:"row",alignItems:"center"},
 songTitle:{color:C.text,fontWeight:"800",fontSize:15},songInfo:{fontSize:12,color:C.muted,marginTop:6,lineHeight:18},openArrow:{color:C.green,fontSize:29,fontWeight:"500",marginLeft:10},
 transposeBar:{flexDirection:"row",alignItems:"center",gap:8,flexWrap:"wrap",marginVertical:19},
 lyricsScroll:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,marginVertical:7},
 lyricsPadding:{padding:13,minWidth:"100%"},chords:{fontFamily:MONO,fontSize:14,color:C.green,fontWeight:"700",lineHeight:18},lyricLine:{fontFamily:MONO,fontSize:14,color:C.text,lineHeight:19},
 section:{fontFamily:MONO,fontSize:14,color:C.green,fontWeight:"900",marginTop:14,marginBottom:8},
 modalShade:{flex:1,justifyContent:"flex-end",backgroundColor:"#000b"},modalBody:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderTopLeftRadius:22,borderTopRightRadius:22,padding:17,maxHeight:"80%",minHeight:"55%"},
 modalTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},
 pickerRow:{borderBottomWidth:1,borderColor:C.border,paddingVertical:13,paddingHorizontal:6},
 pickLabel:{fontSize:15,color:C.text}
});
module.exports=App;
