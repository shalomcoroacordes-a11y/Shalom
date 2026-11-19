const React=require("react");
const {useState,useEffect}=React;
const {View,Text,Image,TextInput,Pressable,Alert,StyleSheet}=require("react-native");
const {LinearGradient}=require("expo-linear-gradient");
const {CoverArt,PRESETS}=require("./personal-cover-ui");
const {photoUri,chooseCover}=require("./collection-covers");
const {BANNER_ACTIONS}=require("./profile-core");
const {InitialCover}=require("./visual-ui");
const h=React.createElement;
const GREEN="#27c98b",FG="#f4f7f7",MUTED="#b0c0c7";
const ACTION_LABEL={explorar:"Explorar cantos",repertorios:"Ver repertorios",recientes:"Continuar leyendo",favoritos:"Mis me gusta",popurris:"Mis popurrís"};
const txt=(s,style)=>h(Text,{style},String(s==null?"":s));
const btn=(s,fn,outline=false,disabled=false)=>h(Pressable,{onPress:fn,disabled,
 accessibilityRole:"button",accessibilityLabel:s,
 style:[S.button,outline&&S.outline,disabled&&{opacity:.4}]},
 txt(s,[S.buttonText,outline&&S.outlineText]));
function ProfileScreen({profile,onChange,likedSongs,personal,openSong,onLiked,onCollections,onSongs,onRepertoires,
 editNonce=0,registerBack}){
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState(profile);
 const [loadingImage,setLoadingImage]=useState(false);
 useEffect(()=>{
  if(!registerBack)return;
  return registerBack(()=>{
   if(editing){setEditing(false);return true;}
   return false;
  });
 },[registerBack,editing]);
 useEffect(()=>{if(editNonce>0){setDraft(profile);setEditing(true)}},[editNonce]);
 const change=(key,value)=>setDraft(v=>({...v,[key]:value}));
 const collections=personal?.collections||[];
 const popurris=collections.reduce((n,c)=>n+c.entries.filter(e=>e.kind==="popurri").length,0);
 const misas=collections.reduce((n,c)=>n+c.entries.filter(e=>e.kind==="misa").length,0);
 const counts=[["♥",likedSongs.length,"Mis me gusta"],["♫",popurris,"Popurrís"],
  ["♧",misas,"Misas"],["▣",collections.length,"Colecciones"]];
 const actions=[["♥","Mis me gusta","guitar",()=>onSongs(true)],
  ["♫","Mis popurrís","choir",()=>onCollections("popurri")],
  ["♧","Mis misas","sunrise",()=>onCollections("misa")],
  ["▣","Colecciones","dove",()=>onCollections(null)]];
 async function pick(which){
  if(loadingImage)return;
  setLoadingImage(true);
  try{
   const options=which==="avatar"?{aspect:[1,1],width:480}:
    {aspect:[16,9],width:1280};
   const image=await chooseCover(options);
   if(image)change(which,image);
  }catch(e){Alert.alert("No se pudo seleccionar la imagen",e?.message||"Inténtalo de nuevo.");}
  finally{setLoadingImage(false);}
 }
 function save(){
  if(!draft.name.trim())return Alert.alert("Falta el nombre","Escribe un nombre para tu perfil.");
  onChange({...draft,name:draft.name.trim(),subtitle:draft.subtitle.trim()||"Coro y Alabanza",
   bannerTitle:draft.bannerTitle.trim()||"Cantos para acercarte a Dios"});
  setEditing(false);
 }
 const avatar=(data,size=108)=>{
  const uri=photoUri(data.avatar);
  return h(View,{style:[S.avatar,{width:size,height:size,borderRadius:size/2}]},
   uri?h(Image,{source:{uri},style:{width:"100%",height:"100%",borderRadius:size/2}}):
   txt((data.name||"S").trim().slice(0,1).toUpperCase(),[S.avatarInitial,{fontSize:size*.43}]));
 };
 function profileHeader(data,edit=false){
  return h(View,{style:S.hero},
   h(CoverArt,{preset:"sunrise",photo:data.cover,color:GREEN,height:190}),
   h(LinearGradient,{colors:["transparent","#0e1219"],style:S.heroGradient}),
   h(View,{style:S.profileIdentity},avatar(data,106),
    h(View,{style:{flex:1,minWidth:0}},txt(data.name,S.name),
     txt(data.subtitle,S.subtitle))),
   edit?h(Pressable,{style:S.editBubble,onPress:()=>pick("cover"),accessibilityRole:"button",
    accessibilityLabel:"Cambiar portada del perfil"},txt("✎",S.editBubbleText)):null);
 }
 const section=(title,more)=>h(View,{style:S.sectionHead},txt(title,S.sectionTitle),
  more?h(Pressable,{onPress:more,accessibilityRole:"button",accessibilityLabel:"Ver todo "+title},
   txt("Ver todo  ›",S.more)):null);
 function shortcut([symbol,name,preset,onPress]){
  return h(Pressable,{key:name,onPress,style:S.shortcut,accessibilityRole:"button",accessibilityLabel:name},
   h(CoverArt,{preset,color:GREEN,height:130}),
   h(LinearGradient,{style:S.shortcutFade,colors:["transparent","rgba(0,0,0,.86)"]}),
   h(View,{style:S.shortcutInner},txt(symbol,S.shortcutSymbol),
    h(Text,{style:S.shortcutLabel,numberOfLines:2},name)));
 }
 if(editing)return h(View,{style:S.page},
  h(View,{style:S.editHeading},
   txt("Editar perfil",S.title),
   txt("Personaliza tu perfil y el destacado de Inicio. Todo permanece en este celular.",S.caption)),
  profileHeader(draft,true),
  h(View,{style:S.rowActions},
   btn(loadingImage?"Preparando…":"Cambiar foto",()=>pick("avatar"),false,loadingImage),
   btn("Cambiar portada",()=>pick("cover"),true,loadingImage)),
  txt("Nombre visible",S.formTitle),
  h(TextInput,{value:draft.name,onChangeText:v=>change("name",v),style:S.input,maxLength:45,
    placeholder:"Tu nombre",placeholderTextColor:MUTED}),
  txt("Descripción",S.formTitle),
  h(TextInput,{value:draft.subtitle,onChangeText:v=>change("subtitle",v),style:S.input,maxLength:75,
    placeholder:"Coro y Alabanza",placeholderTextColor:MUTED}),
  h(View,{style:S.divider}),
  txt("Banner destacado de Inicio",S.sectionTitle),
  txt("También puedes elegir una imagen diferente para la pantalla de Inicio.",S.caption),
  h(CoverArt,{preset:draft.bannerPreset,photo:draft.banner||draft.cover,color:GREEN,height:154}),
  h(View,{style:S.rowActions},
   btn("Elegir foto del banner",()=>pick("banner"),false,loadingImage),
   btn("Usar portada del perfil",()=>change("banner",null),true)),
  txt("O elige un fondo prediseñado",S.formTitle),
  h(View,{style:S.presetRow},...["dove","sunrise","guitar","adoration","flowers"].map(key=>
   h(Pressable,{key,onPress:()=>{change("bannerPreset",key);change("banner",null);},
     accessibilityRole:"button",accessibilityLabel:"Banner "+PRESETS[key].label,
     style:[S.presetChip,key===draft.bannerPreset&&S.presetChipActive]},
    txt(PRESETS[key].label,S.presetText)))),
  txt("Título del destacado",S.formTitle),
  h(TextInput,{value:draft.bannerTitle,onChangeText:v=>change("bannerTitle",v),style:S.input,
   maxLength:88,placeholder:"Cantos para acercarte a Dios",placeholderTextColor:MUTED}),
  txt("Acción del botón de Inicio",S.formTitle),
  h(View,{style:S.presetRow},...BANNER_ACTIONS.map(k=>h(Pressable,{
   key:k,onPress:()=>change("bannerAction",k),accessibilityRole:"button",
   style:[S.presetChip,draft.bannerAction===k&&S.presetChipActive]},
   txt(ACTION_LABEL[k],S.presetText)))),
  h(View,{style:S.infoBox},txt("🔒  La foto, la portada y el banner se guardan de forma privada en tu teléfono. No se suben a Supabase.",S.caption)),
  h(View,{style:S.rowActions},btn("Guardar cambios",save),
   btn("Cancelar",()=>setEditing(false),true)));
 return h(View,{style:S.page},
  txt("Mi perfil",S.title),
  profileHeader(profile),
  h(View,{style:S.metrics},...counts.map(([symbol,n,name])=>
   h(View,{key:name,style:S.metric},
    txt(symbol,S.metricIcon),txt(n,S.metricNum),txt(name,S.metricCaption)))),
  h(View,{style:S.shortcuts},...actions.map(shortcut)),
  section("♡  Mis me gusta",()=>onSongs(true)),
  txt("Tus cantos favoritos, guardados solo en este dispositivo.",S.caption),
  ...likedSongs.slice(0,5).map(song=>h(Pressable,{
   key:song.id,onPress:()=>openSong(song),style:S.songItem,accessibilityRole:"button",
   accessibilityLabel:"Abrir "+song.title},
   h(InitialCover,{title:song.title,size:59}),
   h(View,{style:{flex:1,minWidth:0}},
    h(Text,{style:S.songTitle,numberOfLines:2},song.title),
    txt((song._artists||[]).map(a=>a.name).filter(Boolean).join(" · ")||"Canto SHALOM",S.songDesc)),
   h(Pressable,{onPress:e=>{e?.stopPropagation?.();onLiked(song.id);},
    accessibilityRole:"button",accessibilityLabel:"Quitar de Mis me gusta"},
    txt("♥",S.heart)))),
  !likedSongs.length?h(View,{style:S.infoBox},
   txt("Todavía no hay cantos en Mis me gusta. Marca el corazón en cualquier canto para verlo aquí.",S.caption),
   btn("Explorar cantos",()=>onSongs(false),true)):null,
  section("Mis colecciones",()=>onCollections(null)),
  txt("Misas y popurrís personales, sin cambiar los repertorios oficiales.",S.caption),
  ...collections.slice(0,3).map(c=>h(Pressable,{key:c.id,onPress:()=>onCollections(null),
   style:S.songItem,accessibilityRole:"button"},
   h(View,{style:{width:72,height:62,overflow:"hidden",borderRadius:10}},
    h(CoverArt,{preset:c.coverPreset,photo:c.coverPhoto,color:c.color,height:62})),
   h(View,{style:{flex:1}},txt(c.name,S.songTitle),
    txt(c.entries.length+" composiciones",S.songDesc)),txt("›",S.more))),
  !collections.length?btn("+ Crear colección",()=>onCollections(null),true):null,
  btn("Ver repertorios oficiales",onRepertoires,true));
}
const S=StyleSheet.create({
 page:{gap:12,paddingBottom:25,paddingTop:6},
 title:{fontSize:28,fontWeight:"900",color:FG,lineHeight:36},
 caption:{fontSize:12,color:MUTED,lineHeight:18},
 hero:{borderRadius:17,overflow:"hidden",height:269,backgroundColor:"#073b32"},
 heroGradient:{position:"absolute",left:0,right:0,bottom:0,height:173},
 profileIdentity:{position:"absolute",left:12,right:10,bottom:12,flexDirection:"row",alignItems:"center",gap:12},
 avatar:{borderWidth:3,borderColor:"#a9ffe3",backgroundColor:"#14533f",justifyContent:"center",alignItems:"center",overflow:"hidden"},
 avatarInitial:{color:"#fff",fontWeight:"900"},
 name:{color:FG,fontSize:26,fontWeight:"900"},
 subtitle:{color:"#f1f4f4",fontSize:14,marginTop:3},
 editBubble:{position:"absolute",top:10,right:10,borderRadius:99,width:40,height:40,
  backgroundColor:"#0c6c50",alignItems:"center",justifyContent:"center"},
 editBubbleText:{fontSize:23,color:"#fff"},
 metrics:{flexDirection:"row",borderWidth:1,borderColor:"#35584f",borderRadius:17,backgroundColor:"#17312c",
  overflow:"hidden",minHeight:80,justifyContent:"space-around",alignItems:"center"},
 metric:{flex:1,alignItems:"center",justifyContent:"center",paddingVertical:10},
 metricIcon:{fontSize:18,color:GREEN,fontWeight:"800"},
 metricNum:{color:FG,fontSize:20,fontWeight:"900"},
 metricCaption:{fontSize:10,color:"#c3d9d3",textAlign:"center",marginTop:3},
 shortcuts:{flexDirection:"row",justifyContent:"space-between",gap:6},
 shortcut:{flex:1,overflow:"hidden",borderRadius:13,borderWidth:1,borderColor:"#3a6155"},
 shortcutFade:{position:"absolute",bottom:0,left:0,right:0,height:105},
 shortcutInner:{position:"absolute",bottom:9,left:2,right:2,alignItems:"center",gap:4},
 shortcutSymbol:{color:"#fff",fontSize:25,fontWeight:"900"},
 shortcutLabel:{fontSize:11,color:"#fff",fontWeight:"850",textAlign:"center"},
 sectionHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:9,marginTop:10},
 sectionTitle:{fontSize:20,color:FG,fontWeight:"900",flex:1},
 more:{color:GREEN,fontSize:13,fontWeight:"850"},
 songItem:{flexDirection:"row",alignItems:"center",gap:10,padding:8,borderRadius:13,
  borderWidth:1,borderColor:"#385056",backgroundColor:"#1a2c33",minHeight:75},
 songTitle:{fontSize:14.5,color:FG,fontWeight:"850"},
 songDesc:{fontSize:12,color:MUTED,marginTop:4},
 heart:{fontSize:26,color:GREEN,paddingHorizontal:6},
 editHeading:{gap:2},
 rowActions:{flexDirection:"row",flexWrap:"wrap",gap:9},
 button:{minHeight:43,backgroundColor:GREEN,borderRadius:12,paddingHorizontal:14,
  alignItems:"center",justifyContent:"center"},
 buttonText:{fontSize:12,fontWeight:"850",color:"#052418"},
 outline:{backgroundColor:"#19312d",borderColor:"#366c5e",borderWidth:1},
 outlineText:{color:FG},
 formTitle:{fontSize:13,fontWeight:"750",color:FG,marginTop:5},
 input:{backgroundColor:"#223038",borderWidth:1,borderColor:"#39555b",borderRadius:12,
  minHeight:47,paddingHorizontal:12,fontSize:14,color:FG},
 divider:{height:1,backgroundColor:"#36514b",marginVertical:7},
 presetRow:{flexDirection:"row",flexWrap:"wrap",gap:7},
 presetChip:{paddingHorizontal:9,paddingVertical:8,borderWidth:1,borderRadius:99,borderColor:"#426157",backgroundColor:"#182d2d"},
 presetChipActive:{backgroundColor:"#076449",borderColor:GREEN},
 presetText:{color:FG,fontSize:11,fontWeight:"700"},
 infoBox:{borderWidth:1,borderColor:"#35574d",backgroundColor:"#16342c",padding:13,borderRadius:12,gap:9}
});
module.exports={ProfileScreen,ACTION_LABEL};
