const React=require("react");
const {useState}=React;
const {Modal,View,Text,TextInput,Pressable,ScrollView,StyleSheet,KeyboardAvoidingView,Platform,Alert}=require("react-native");
const {InitialCover}=require("./visual-ui");
const {entriesOf,NAMES}=require("./song-actions-core");
const h=React.createElement;
const T={bg:"#0e1219",panel:"#1a2730",surface:"#233139",line:"#394d52",text:"#f4f7f7",muted:"#b4c5c9",green:"#27c98b"};
function SongActionsSheet({song,liked=false,offline=false,store,onDismiss,onLike,onShare,onPrint,onDownload,onAdd,onFullScreen,onResetTone,onOpenLink,onOpenSongPage,onVideo,onStudio,motionEnabled=false,bottomInset=0}){
 const [phase,setPhase]=useState("menu");
 const [kind,setKind]=useState(null);
 const [name,setName]=useState("");
 const [folderId,setFolderId]=useState("");
 const [busy,setBusy]=useState(false);
 if(!song)return null;
 const lbl=(value,style)=>h(Text,{style},String(value??""));
 const close=()=>{if(busy)return;onDismiss()};
 const back=()=>{
  if(busy)return;
  if(phase==="create"){setPhase("targets");return}
  if(phase==="targets"||phase==="reading"||phase==="links"){setPhase("menu");return}
  close();
 };
 const button=(icon,title,action,subtitle=null,disabled=false,keyValue=title)=>
  h(Pressable,{key:keyValue,onPress:action,disabled:busy||disabled,style:({pressed})=>[S.action,pressed&&S.actionPressed,(busy||disabled)&&S.disabled],
   accessibilityRole:"button",accessibilityLabel:title,accessibilityState:{disabled:busy||disabled}},
   lbl(icon,S.actionIcon),
   h(View,{style:{flex:1}},lbl(title,S.actionTitle),
    subtitle?lbl(subtitle,S.actionSub):null),lbl("›",S.chevron));
 const go=next=>{setKind(next);setPhase("targets");setName("");setFolderId(store.collections[0]?.id||"")};
 async function run(fn,closeFirst=false){
  if(busy)return;
  setBusy(true);
  if(closeFirst)onDismiss();
  try{await fn();if(!closeFirst)onDismiss()}
  catch(err){Alert.alert("No se pudo completar",err?.message||"Inténtalo otra vez.")}
  finally{setBusy(false)}
 }
 async function save(choice){
  if(busy)return;
  setBusy(true);
  try {
   const outcome=await onAdd(kind,choice);
   onDismiss();
   if(outcome?.already)Alert.alert("Ya está agregado","Este canto ya figura en esa composición.");
  }catch(e){Alert.alert("No se pudo agregar",e.message||"Revisa tu colección.");}
  finally{setBusy(false)}
 }
 const rawLinks=[
  ...(Array.isArray(song._links)?song._links:[]).map((item,index)=>({
   title:String(item?.title||item?.label||"Enlace "+(index+1)),url:item?.url})),
  {title:"Tutorial guitarra",url:song.tutorial_guitar},
  {title:"Tutorial piano",url:song.tutorial_piano},
  {title:"YouTube",url:song.youtube_url},
  {title:"Video",url:song.video_url}
 ];
 const seenLinks=new Set();
 const links=rawLinks.filter(item=>{
  if(typeof item.url!=="string"||!item.url.trim())return false;
  const normalized=item.url.trim();
  if(seenLinks.has(normalized))return false;
  seenLinks.add(normalized);return true;
 });
 const youtubeAvailable=links.some(item=>/youtube\.com|youtu\.be/i.test(item.url));
 const targets=kind?entriesOf(store,kind):[];
 const selectedFolder=store.collections.some(c=>c.id===folderId)?folderId:"";
 return h(Modal,{visible:true,transparent:true,animationType:motionEnabled?"slide":"none",onRequestClose:back,statusBarTranslucent:true,
  accessibilityViewIsModal:true},
  h(KeyboardAvoidingView,{style:S.root,behavior:Platform.OS==="ios"?"padding":undefined},
   h(Pressable,{style:S.dismissLayer,onPress:back,accessibilityRole:"button",accessibilityLabel:"Cerrar opciones"}),
   h(View,{style:[S.sheet,{paddingBottom:Math.max(20,bottomInset+12)}],accessibilityViewIsModal:true},
    h(View,{style:S.handle}),
    h(View,{style:S.songHead},
     h(InitialCover,{title:song.title,size:49}),
     h(View,{style:{flex:1}},
      h(Text,{numberOfLines:2,style:S.songName},song.title||"Canto SHALOM"),
      lbl((song._artists||[]).map(a=>a.name).filter(Boolean).join(" · ")||"SHALOM",S.artist)),
     h(Pressable,{onPress:back,accessibilityRole:"button",accessibilityLabel:"Volver",
      style:S.xButton},lbl("×",S.xText))),
    h(View,{style:S.rule}),
    phase==="menu"?h(ScrollView,{keyboardShouldPersistTaps:"handled",showsVerticalScrollIndicator:false,
      contentContainerStyle:S.menu},
     button(liked?"♥":"♡",liked?"Quitar de Mis me gusta":"Agregar a Mis me gusta",
      ()=>run(onLike)),
     button("▣","Agregar a repertorio",()=>go("repertorio"),"Repertorio personal · en este teléfono"),
     button("♧","Agregar a misa",()=>go("misa"),"Elige una misa personal"),
     button("♫","Agregar a popurrí",()=>go("popurri"),"Combina este canto con otros"),
     h(View,{style:S.rule}),
     song._studio&&onStudio?button("♫","Practicar con guitarra",()=>run(onStudio,true),"Rasgueos y acompañamiento sin conexión"):null,
     button("↗","Ver enlaces y tutoriales",()=>setPhase("links"),
      links.length+" enlace(s) registrado(s)"),
     youtubeAvailable?button("▶","Abrir YouTube",()=>run(onVideo,true)):null,
     button("↗","Compartir canción",()=>run(onShare,true)),
     button("▤","Imprimir letra y acordes",()=>run(onPrint,true),"Impresión nativa desde el teléfono"),
     button("↓","Descargar sin conexión",()=>run(onDownload,true),
      offline?"Este canto ya está disponible sin conexión":"Actualizar biblioteca local"),
     h(View,{style:S.rule}),
     button("⛶","Opciones de lectura",()=>setPhase("reading"),"Pantalla completa y tono original")
    ):phase==="reading"?h(View,{style:S.menu},
     lbl("Opciones de lectura",S.sectionTitle),
     button("⛶","Pantalla completa",()=>run(onFullScreen)),
     button("↺","Restablecer tono original",()=>run(onResetTone)),
     h(Pressable,{onPress:back,style:S.createButton,accessibilityRole:"button"},
      lbl("← Volver al panel",S.createLabel))
    ):phase==="links"?h(ScrollView,{keyboardShouldPersistTaps:"handled",
      showsVerticalScrollIndicator:false,contentContainerStyle:S.menu},
     lbl("Enlaces de este canto",S.sectionTitle),
     ...links.map((link,index)=>button("↗",link.title,
      ()=>run(()=>onOpenLink(link.url),true),link.url,false,"link-"+index)),
     button("↗","Ver canto en la página SHALOM",()=>run(onOpenSongPage,true),
      "Abrir el canto desde el sitio oficial"),
     !links.length?lbl("Este canto aún no tiene tutoriales registrados.",S.hint):null,
     h(Pressable,{onPress:back,style:S.createButton,accessibilityRole:"button"},
      lbl("← Volver a las opciones",S.createLabel))
    ):phase==="targets"?h(ScrollView,{keyboardShouldPersistTaps:"handled",showsVerticalScrollIndicator:false,
      contentContainerStyle:S.menu},
     lbl("Agregar a "+NAMES[kind],S.sectionTitle),
     lbl("Elige una composición guardada o crea una nueva. No se modifica Supabase.",S.hint),
     ...targets.map(item=>button("♫",item.title,
      ()=>save({folderId:item.folderId,entryId:item.entryId}),
      item.folderName+" · "+item.count+" fragmentos",item.count>=30)),
     h(Pressable,{style:S.createButton,onPress:()=>{setPhase("create");setName("");},
      accessibilityRole:"button",accessibilityLabel:"Crear nuevo "+NAMES[kind]},
      lbl("+  Crear "+NAMES[kind]+" personal",S.createLabel))
    ):h(ScrollView,{keyboardShouldPersistTaps:"handled",contentContainerStyle:S.menu},
     lbl("Nueva "+NAMES[kind],S.sectionTitle),
     lbl("Escribe un nombre. Se guardará solo en tu teléfono.",S.hint),
     h(TextInput,{style:S.input,value:name,onChangeText:setName,maxLength:120,
      autoFocus:true,placeholder:"Ej. Cantos para el domingo",placeholderTextColor:T.muted,
      accessibilityLabel:"Nombre de la composición"}),
     store.collections.length?h(View,{style:S.folderArea},
      lbl("Guardar dentro de",S.hint),
      ...store.collections.map(c=>h(Pressable,{key:c.id,style:S.folderRow,
       onPress:()=>setFolderId(c.id),accessibilityRole:"radio",
       accessibilityState:{checked:selectedFolder===c.id}},
       lbl(selectedFolder===c.id?"◉":"○",S.folderCircle),lbl(c.name,S.folderLabel)))) :
      lbl("Se creará automáticamente la carpeta «Mis colecciones».",S.hint),
     h(Pressable,{style:[S.createButton,!name.trim()&&S.disabled],disabled:!name.trim()||busy,
      onPress:()=>save({folderId:selectedFolder||undefined,title:name.trim()}),accessibilityRole:"button"},
      lbl("Crear y agregar canto",S.createLabel)))
   ))
 );
}
const S=StyleSheet.create({
 root:{flex:1,justifyContent:"flex-end"},
 dismissLayer:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,0.58)"},
 sheet:{backgroundColor:T.bg,borderTopLeftRadius:24,borderTopRightRadius:24,borderTopWidth:1,
  borderColor:"#41685b",paddingTop:10,paddingHorizontal:17,paddingBottom:20,maxHeight:"86%"},
 handle:{width:40,height:5,borderRadius:5,backgroundColor:"#50656a",alignSelf:"center",marginBottom:16},
 songHead:{flexDirection:"row",alignItems:"center",gap:11,paddingBottom:14},
 songName:{fontSize:16,fontWeight:"850",color:T.text,lineHeight:22},
 artist:{fontSize:12,color:T.muted,marginTop:4},
 xButton:{width:44,height:44,justifyContent:"center",alignItems:"center",borderRadius:20,backgroundColor:T.surface},
 xText:{fontSize:25,color:T.text,lineHeight:30},
 rule:{height:1,backgroundColor:T.line,marginVertical:5},
 menu:{paddingTop:8,paddingBottom:16,gap:4},
 action:{flexDirection:"row",alignItems:"center",gap:13,minHeight:54,paddingVertical:8,paddingHorizontal:8,
  borderRadius:12},
 actionPressed:{backgroundColor:T.surface},
 actionIcon:{fontSize:25,fontWeight:"550",color:T.text,width:30,textAlign:"center"},
 actionTitle:{fontSize:14,fontWeight:"750",color:T.text},
 actionSub:{fontSize:11,color:T.muted,marginTop:3},
 chevron:{fontSize:23,color:"#698780"},
 sectionTitle:{fontSize:18,fontWeight:"850",color:T.text,marginTop:5,marginBottom:4},
 hint:{fontSize:12,color:T.muted,lineHeight:18,marginBottom:8},
 createButton:{backgroundColor:"#145a43",padding:14,alignItems:"center",justifyContent:"center",borderRadius:13,
  borderWidth:1,borderColor:T.green,minHeight:47,marginTop:10},
 createLabel:{fontSize:14,fontWeight:"850",color:"#c7ffe5"},
 input:{backgroundColor:T.surface,borderRadius:12,borderWidth:1,borderColor:T.line,minHeight:49,
  fontSize:14,color:T.text,paddingHorizontal:13,marginBottom:6},
 disabled:{opacity:.42},
 folderArea:{gap:5,marginTop:6},
 folderRow:{flexDirection:"row",alignItems:"center",minHeight:44,paddingHorizontal:9,gap:10},
 folderCircle:{fontSize:21,color:T.green},
 folderLabel:{fontSize:13,color:T.text,flex:1}
});
module.exports=SongActionsSheet;