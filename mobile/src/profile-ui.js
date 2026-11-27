const palette=require("./palette");
const React=require("react");
const {useState,useEffect}=React;
const {View,Text,Image,TextInput,Pressable,Alert,StyleSheet}=require("react-native");
const {LinearGradient}=require("expo-linear-gradient");
const {CoverArt,PRESETS}=require("./personal-cover-ui");
const {photoUri,chooseCover}=require("./collection-covers");
const {BANNER_ACTIONS}=require("./profile-core");
const h=React.createElement;
const GREEN=palette.green,FG=palette.text,MUTED=palette.muted;
const ACTION_LABEL={explorar:"Explorar cantos",repertorios:"Ver repertorios",recientes:"Continuar leyendo",favoritos:"Mis me gusta",popurris:"Mis popurrís"};
const txt=(s,style)=>h(Text,{style},String(s==null?"":s));
const btn=(s,fn,outline=false,disabled=false)=>h(Pressable,{onPress:fn,disabled,
 accessibilityRole:"button",accessibilityLabel:s,
 style:[S.button,outline&&S.outline,disabled&&{opacity:.4}]},
 txt(s,[S.buttonText,outline&&S.outlineText]));
function ProfileScreen({profile,onChange,likedSongs,personal,openSong,onLiked,onCollections,onSongs,onRepertoires,
 editNonce=0,onEditRequestConsumed,registerBack,onOpenPersonal,onSettings,onBackup,onRequest,onMore}){
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
 // El botón "Editar perfil" envía una orden de un solo uso.
 // Si no se consume, al remontar Perfil se abre de nuevo en edición.
 useEffect(()=>{
  if(editNonce<=0)return;
  setDraft(profile);
  setEditing(true);
  onEditRequestConsumed?.();
 },[editNonce]);
 const change=(key,value)=>setDraft(v=>({...v,[key]:value}));
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
   h(LinearGradient,{colors:["transparent",palette.bg],style:S.heroGradient}),
   h(View,{style:S.profileIdentity},avatar(data,106),
    h(View,{style:{flex:1,minWidth:0}},txt(data.name,S.name),
     txt(data.subtitle,S.subtitle))),
   edit?h(Pressable,{style:S.editBubble,onPress:()=>pick("cover"),accessibilityRole:"button",
    accessibilityLabel:"Cambiar portada del perfil"},txt("✎",S.editBubbleText)):null);
 }
 function toolRow(symbol,name,description,onPress){
  return h(Pressable,{key:name,onPress,accessibilityRole:"button",accessibilityLabel:name,
   style:S.toolRow},
   h(View,{style:S.toolIcon},txt(symbol,S.toolSymbol)),
   h(View,{style:{flex:1,minWidth:0}},txt(name,S.toolName),txt(description,S.toolDescription)),
   txt("›",S.toolChevron));
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
   btn("Cancelar",()=>{setDraft(profile);setEditing(false);},true)));
 return h(View,{style:S.page},
  txt("Mi perfil",S.title),
  h(View,{style:S.simpleIdentity},
   avatar(profile,64),
   h(View,{style:{flex:1,minWidth:0}},
    txt(profile.name||"Mi perfil",S.simpleName),
    txt(profile.name==="Mi perfil"?"Nombre y foto personal":profile.subtitle||"Coro y Alabanza",S.simpleSubtitle)),
   h(Pressable,{onPress:()=>{setDraft(profile);setEditing(true);},
    accessibilityRole:"button",accessibilityLabel:"Editar perfil",style:S.simpleEdit},
    txt("✎",S.simpleEditIcon))),
  h(View,{style:S.simpleDivider}),
  h(View,{style:S.toolList},
   toolRow("♡","Mis me gusta","Tus canciones favoritas",()=>onSongs(true)),
   toolRow("⚙","Configuración","Sincronización y Wi-Fi",onSettings),
   toolRow("♢","Respaldo y restauración","Guardar tus datos personales",onBackup),
   toolRow("◌","Solicitar canto","Enviar sugerencias o correcciones",onRequest),
   toolRow("ⓘ","Acerca de y donaciones","Información y enlaces de SHALOM",onMore)),
  h(View,{style:S.simpleDivider}),
  txt("Misas, repertorios, popurrís y composiciones: entra a Mis creaciones en la barra inferior.",S.simpleFootnote));


}
const S=StyleSheet.create({
 page:{gap:13,paddingBottom:18,paddingTop:4},
 profileStats:{flexDirection:"row",backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:18,paddingVertical:14},
 profileStat:{flex:1,alignItems:"center",gap:4},
 profileStatIcon:{color:GREEN,fontSize:23,fontWeight:"800"},
 profileStatCount:{color:FG,fontSize:22,fontWeight:"900"},
 profileStatLabel:{color:MUTED,fontSize:10.5},
 profileShortcuts:{flexDirection:"row",gap:10},
 profileShortcut:{flex:1,minHeight:110,padding:12,borderRadius:15,backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,justifyContent:"center",gap:5},
 profileShortcutIcon:{fontSize:24,color:GREEN},
 profileShortcutTitle:{fontSize:15,color:FG,fontWeight:"850"},
 profileShortcutSub:{fontSize:11,color:MUTED,lineHeight:16},
 simpleIdentity:{flexDirection:"row",alignItems:"center",gap:14,paddingVertical:10,minHeight:82},
 simpleName:{fontSize:19,color:FG,fontWeight:"850"},
 simpleSubtitle:{fontSize:13,color:MUTED,marginTop:5},
 simpleEdit:{height:44,width:44,alignItems:"center",justifyContent:"center",borderRadius:22},
 simpleEditIcon:{fontSize:23,color:FG},
 simpleDivider:{height:1,backgroundColor:palette.border,marginVertical:10},
 simpleFootnote:{fontSize:11.5,lineHeight:17,color:MUTED,marginTop:6},
 title:{fontSize:28,fontWeight:"900",color:FG,lineHeight:36},
 caption:{fontSize:12,color:MUTED,lineHeight:18},
 hero:{borderRadius:17,overflow:"hidden",height:232,backgroundColor:palette.panel},
 heroGradient:{position:"absolute",left:0,right:0,bottom:0,height:173},
 profileIdentity:{position:"absolute",left:12,right:10,bottom:12,flexDirection:"row",alignItems:"center",gap:12},
 avatar:{borderWidth:3,borderColor:palette.green,backgroundColor:palette.panel,justifyContent:"center",alignItems:"center",overflow:"hidden"},
 avatarInitial:{color:"#fff",fontWeight:"900"},
 name:{color:FG,fontSize:26,fontWeight:"900"},
 subtitle:{color:palette.text,fontSize:14,marginTop:3},
 editBubble:{position:"absolute",top:10,right:10,borderRadius:99,width:40,height:40,
  backgroundColor:palette.panel,alignItems:"center",justifyContent:"center"},
 editBubbleText:{fontSize:23,color:"#fff"},
 metrics:{flexDirection:"row",borderWidth:1,borderColor:palette.border,borderRadius:17,backgroundColor:palette.panel,
  overflow:"hidden",minHeight:80,justifyContent:"space-around",alignItems:"center"},
 metric:{flex:1,alignItems:"center",justifyContent:"center",paddingVertical:10},
 metricIcon:{fontSize:18,color:GREEN,fontWeight:"800"},
 metricNum:{color:FG,fontSize:20,fontWeight:"900"},
 metricCaption:{fontSize:10,color:palette.muted,textAlign:"center",marginTop:3},
 shortcuts:{flexDirection:"row",justifyContent:"space-between",gap:6},
 sectionHeader:{gap:2,marginTop:10},
 quickGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:8},
 shortcut:{width:"48.5%",minHeight:84,padding:12,flexDirection:"row",gap:9,alignItems:"center",
  borderRadius:13,borderWidth:1,borderColor:palette.border,backgroundColor:palette.panel},
 shortcutIcon:{width:31,height:37,alignItems:"center",justifyContent:"center"},
 shortcutSymbol:{color:GREEN,fontSize:26,fontWeight:"800"},
 shortcutLabel:{fontSize:13,color:"#fff",fontWeight:"850"},
 shortcutDescription:{fontSize:10,color:MUTED,marginTop:3},
 shortcutArrow:{color:GREEN,fontSize:24,fontWeight:"600"},
 toolList:{gap:0,borderTopWidth:1,borderColor:palette.border},
 toolRow:{minHeight:70,paddingVertical:12,flexDirection:"row",gap:12,alignItems:"center"},
 toolIcon:{width:30,height:34,alignItems:"center",justifyContent:"center"},
 toolSymbol:{fontSize:21,fontWeight:"600",color:MUTED},
 toolName:{fontSize:15,color:FG,fontWeight:"750"},
 toolDescription:{fontSize:12,color:MUTED,marginTop:4,lineHeight:17},
 toolChevron:{fontSize:23,color:MUTED},
 receiveButton:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,
  borderRadius:14,padding:12,flexDirection:"row",alignItems:"center",gap:11,minHeight:72},
 receiveIcon:{color:GREEN,fontSize:25},
 receiveTitle:{color:FG,fontSize:14,fontWeight:"850"},
 personalItem:{flexDirection:"row",alignItems:"center",gap:10,padding:12,
  borderBottomWidth:1,borderBottomColor:palette.border,minHeight:69},
 personalIcon:{width:40,height:40,alignItems:"center",justifyContent:"center",
  borderRadius:10,backgroundColor:palette.panel},
 personalIconText:{color:GREEN,fontSize:22},
 simpleEmpty:{padding:12,gap:9},
 bottomActions:{gap:8,marginTop:8},
 sectionHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:9,marginTop:10},
 sectionTitle:{fontSize:20,color:FG,fontWeight:"900",flex:1},
 more:{color:GREEN,fontSize:13,fontWeight:"850"},
 songItem:{flexDirection:"row",alignItems:"center",gap:10,padding:8,borderRadius:13,
  borderWidth:1,borderColor:palette.border,backgroundColor:palette.panel,minHeight:75},
 songTitle:{fontSize:14.5,color:FG,fontWeight:"850"},
 songDesc:{fontSize:12,color:MUTED,marginTop:4},
 heart:{fontSize:26,color:GREEN,paddingHorizontal:6},
 editHeading:{gap:2},
 rowActions:{flexDirection:"row",flexWrap:"wrap",gap:9},
 button:{minHeight:43,backgroundColor:GREEN,borderRadius:12,paddingHorizontal:14,
  alignItems:"center",justifyContent:"center"},
 buttonText:{fontSize:12,fontWeight:"850",color:palette.bg},
 outline:{backgroundColor:palette.panel,borderColor:palette.border,borderWidth:1},
 outlineText:{color:FG},
 formTitle:{fontSize:13,fontWeight:"750",color:FG,marginTop:5},
 input:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:12,
  minHeight:47,paddingHorizontal:12,fontSize:14,color:FG},
 divider:{height:1,backgroundColor:palette.border,marginVertical:7},
 presetRow:{flexDirection:"row",flexWrap:"wrap",gap:7},
 presetChip:{paddingHorizontal:9,paddingVertical:8,borderWidth:1,borderRadius:99,borderColor:palette.border,backgroundColor:palette.panel},
 presetChipActive:{backgroundColor:palette.panel,borderColor:GREEN},
 presetText:{color:FG,fontSize:11,fontWeight:"700"},
 infoBox:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.panel,padding:13,borderRadius:12,gap:9}
});
module.exports={ProfileScreen,ACTION_LABEL};
