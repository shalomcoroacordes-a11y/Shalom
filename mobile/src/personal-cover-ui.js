const palette=require("./palette");
const React=require("react");
const {View,Text,Pressable,Image,StyleSheet}=require("react-native");
const {LinearGradient}=require("expo-linear-gradient");
const {COLORS,COVER_PRESETS}=require("./personal-collections");
const {photoUri}=require("./collection-covers");
const h=React.createElement;
const PRESETS={
 dove:{label:"Paloma SHALOM",colors:["#168B70","#094A46","#0A2337"],symbol:"🕊",image:require("../assets/home-logo.png")},
 sunrise:{label:"Amanecer",colors:["#F3BA70","#AE643C","#443447"],symbol:"✝",image:require("../assets/home-mass.png")},
 guitar:{label:"Guitarra",colors:["#9D986E","#32746B","#1B3854"],symbol:"♫",image:require("../assets/home-song.png")},
 adoration:{label:"Adoración",colors:["#DDBA73","#754C3E","#29213B"],symbol:"✦",image:require("../assets/home-mass.png")},
 book:{label:"La Palabra",colors:["#67A9C0","#35648E","#263453"],symbol:"✧",image:require("../assets/home-categories.png")},
 flowers:{label:"Esperanza",colors:["#83B08F","#5C816A","#244D48"],symbol:"❀",image:require("../assets/home-repertoires.png")},
 choir:{label:"Nuestro coro",colors:["#E7A16F","#BC5B7B","#52306D"],symbol:"♪",image:require("../assets/home-artists.png")},
 music:{label:"Notas musicales",colors:["#8F71C2","#49377D","#24355D"],symbol:"♬",image:require("../assets/home-medleys.png")}
};
function CoverArt({preset="dove",photo=null,color=palette.green,height=140,compact=false}){
 const options=PRESETS[preset]||PRESETS.dove;
 const uri=photoUri(photo);
 return h(View,{style:[S.art,{height,backgroundColor:options.colors[1]}]},
  h(LinearGradient,{colors:options.colors,locations:[0,.47,1],start:{x:0,y:0},end:{x:1,y:1},style:S.fill}),
  uri?h(Image,{source:{uri},resizeMode:"cover",style:S.fill}):
   h(View,{style:S.artContents},
    h(View,{style:[S.halo,{backgroundColor:"rgba(255,255,255,0.12)",width:compact?55:105,height:compact?55:105,borderRadius:100}]}),
    h(Image,{source:options.image,resizeMode:"contain",
     style:{width:compact?40:82,height:compact?40:82,tintColor:"#FFF8E9",opacity:.94}}),
    options.symbol==="🕊"?null:h(Text,{style:[S.decoration,{fontSize:compact?18:29}]},options.symbol)),
  h(LinearGradient,{colors:["transparent","rgba(0,0,0,0.35)"],style:S.shade}),
  h(View,{style:[S.roundIcon,{backgroundColor:color,width:compact?24:33,height:compact?24:33,bottom:compact?5:9,left:compact?6:10}]},
   options.symbol==="🕊"?h(Image,{source:PRESETS.dove.image,resizeMode:"contain",style:{width:compact?16:23,height:compact?16:23,tintColor:"#ffffff"}}):
   h(Text,{style:{color:"#ffffff",fontSize:compact?13:19,fontWeight:"900"}},options.symbol)));
}
function ColorChoices({value,onChange}){
 return h(View,{style:S.palette},...COLORS.map(c=>h(Pressable,{
  key:c,onPress:()=>onChange(c),accessibilityRole:"button",accessibilityLabel:"Elegir color "+c,
  accessibilityState:{selected:c===value},style:[S.swatch,{backgroundColor:c},c===value&&S.selectedSwatch]},
  c===value?h(Text,{style:S.check},"✓"):null)));
}
function CoverPicker({preset,photo,color,onPreset,onColor,onChoosePhoto,onClearPhoto,busy=false}){
 return h(View,{style:S.picker},
  h(Text,{style:S.heading},"Personaliza tu portada"),
  h(Text,{style:S.subtitle},"Selecciona una portada prediseñada o una fotografía de tu galería."),
  h(View,{style:S.preview},h(CoverArt,{preset,photo,color,height:150})),
  h(View,{style:S.actions},
   h(Pressable,{style:S.photoButton,onPress:onChoosePhoto,disabled:busy,accessibilityRole:"button"},
    h(Text,{style:S.photoButtonText},busy?"Preparando foto…":"▧  Elegir de mi galería")),
   photo?h(Pressable,{onPress:onClearPhoto,style:S.minorButton,accessibilityRole:"button"},
    h(Text,{style:S.minorText},"Quitar foto")):null),
  h(Text,{style:S.sectionTitle},"Portadas prediseñadas"),
  h(View,{style:S.presetGrid},...COVER_PRESETS.map(key=>h(Pressable,{
   key,onPress:()=>onPreset(key),style:[S.presetCard,preset===key&&!photo&&S.presetActive],
   accessibilityRole:"button",accessibilityLabel:"Portada "+PRESETS[key].label,
   accessibilityState:{selected:preset===key&&!photo}},
   h(CoverArt,{preset:key,color,height:72,compact:true}),
   h(Text,{style:S.presetName,numberOfLines:1},PRESETS[key].label)))),
  h(Text,{style:S.sectionTitle},"Paleta de colores"),
  h(ColorChoices,{value:color,onChange:onColor}),
  h(Text,{style:S.hint},"Tu foto y tus colores solo se guardan en este teléfono. No se envían a Supabase."));
}
const S=StyleSheet.create({
 fill:{position:"absolute",top:0,bottom:0,left:0,right:0,width:"100%",height:"100%"},
 art:{overflow:"hidden",borderRadius:13,position:"relative",justifyContent:"center"},
 artContents:{alignItems:"center",justifyContent:"center",flex:1},
 halo:{position:"absolute",right:"13%",top:"-13%"},
 decoration:{position:"absolute",right:18,bottom:16,color:"rgba(255,255,255,.45)"},
 shade:{position:"absolute",left:0,right:0,bottom:0,height:"43%"},
 roundIcon:{position:"absolute",alignItems:"center",justifyContent:"center",borderRadius:30,borderWidth:1,borderColor:"rgba(255,255,255,0.6)"},
 picker:{gap:9},
 preview:{borderRadius:14,overflow:"hidden"},
 heading:{fontSize:17,fontWeight:"900",color:palette.text},
 subtitle:{fontSize:12,color:palette.muted,lineHeight:18},
 sectionTitle:{fontSize:13,fontWeight:"800",color:palette.text,marginTop:7},
 actions:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:9},
 photoButton:{backgroundColor:palette.green,borderRadius:12,paddingVertical:11,paddingHorizontal:13,minHeight:42,justifyContent:"center"},
 photoButtonText:{color:palette.bg,fontWeight:"850",fontSize:12},
 minorButton:{paddingHorizontal:8,paddingVertical:10},
 minorText:{color:palette.green,fontWeight:"750",fontSize:12},
 presetGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:9},
 presetCard:{width:"23.3%",borderWidth:1,borderColor:palette.border,borderRadius:12,overflow:"hidden",backgroundColor:palette.panel},
 presetActive:{borderWidth:2,borderColor:palette.green},
 presetName:{fontSize:9,color:palette.text,textAlign:"center",paddingHorizontal:2,paddingVertical:6},
 palette:{flexDirection:"row",flexWrap:"wrap",gap:11,marginVertical:5},
 swatch:{width:36,height:36,borderRadius:99,alignItems:"center",justifyContent:"center"},
 selectedSwatch:{borderWidth:3,borderColor:"#ffffff"},
 check:{color:"#fff",fontWeight:"900",fontSize:19},
 hint:{fontSize:11,color:palette.muted,lineHeight:16}
});
module.exports={CoverArt,CoverPicker,ColorChoices,PRESETS};
