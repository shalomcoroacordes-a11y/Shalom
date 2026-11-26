const React=require("react");
const {View,Text,ScrollView,Platform,StyleSheet}=require("react-native");
const {columnCount}=require("./chord-grid");
const h=React.createElement;
const MONO=Platform.OS==="ios"?"Menlo":"monospace";
const C={green:"#27c98b",pale:"#b5ffe0",text:"#f4f7f7"};

// La web SHALOM renderiza CADA línea completa con white-space: pre y una
// única fuente monoespaciada. Android 0.4.4 dividía la letra por palabras y
// las posicionaba usando una medida distinta al ancho real de sus glifos:
// el resultado fue "Ahí    en    la    Eucaristía" y acordes aún movidos.
// No separar las palabras ni convertir espacios a NBSP. React Native retiene
// los espacios literales de un Text completo sin transiciones entre Text.
function AlignedScore({rows=[],fontSize=16,variant="default"}){
 const size=Number.isFinite(fontSize)&&fontSize>0?fontSize:16;
 const lineHeight=Math.ceil(size*1.22);
 // Anchura conservadora del espacio scrollable: NO se usa para colocar acordes.
 // Todos los caracteres usan la medida real de la misma fuente del SO.
 const width=Math.ceil(columnCount(rows)*size*.72+24);
 const monoStyle={fontFamily:MONO,fontSize:size,lineHeight,fontWeight:"400",
  letterSpacing:0,includeFontPadding:false,textAlign:"left"};
 const fullLine=(value,color,key)=>h(Text,{
  key,numberOfLines:1,ellipsizeMode:"clip",allowFontScaling:false,
  selectable:true,textBreakStrategy:"simple",
  style:[S.line,monoStyle,{color,width,minWidth:width}]},String(value??""));
 return h(ScrollView,{
  horizontal:true,scrollEnabled:true,nestedScrollEnabled:true,
  showsHorizontalScrollIndicator:true,
  keyboardShouldPersistTaps:"handled",style:S.scroll,
  contentContainerStyle:S.scrollContent},
  h(View,{style:[S.score,{width,minWidth:width}]},
   ...rows.map((row,i)=>{
    const key=variant+"-"+i;
    if(row.kind==="cue")return h(Text,{key,style:{color:C.pale,fontSize:size*.85,fontStyle:"italic",maxWidth:width,marginVertical:3}},row.text);
    if(row.kind==="space")return h(View,{key,style:{height:size*1.45}});
    if(row.kind==="section"){
     const chorus=/coro|estribillo|refr[aá]n/i.test(row.text||"");
     return h(View,{key,style:S.section,
      accessibilityLabel:"Sección: "+row.text},
      h(Text,{style:[S.sectionTitle,chorus&&S.sectionChorus]},row.text),
      h(View,{style:S.rule}));
    }
    if(row.kind==="chords")return h(View,{key,style:S.pair},
     fullLine(row.chordLine||" ",C.green,key+"-chord"),
     fullLine(row.lyricLine||" ",C.text,key+"-lyric"));
    return fullLine(row.text||" ",row.kind==="chordsOnly"?C.green:C.text,key);
   })));
}
const S=StyleSheet.create({
 scroll:{marginTop:0,marginBottom:3},
 scrollContent:{paddingVertical:3,paddingHorizontal:3},
 score:{paddingTop:5,paddingBottom:14,alignItems:"flex-start"},
 // Exactamente un renglón del editor en cada Text, sin fraccionarlo por tokens.
 line:{margin:0,padding:0,paddingVertical:0,textAlign:"left"},
 pair:{marginBottom:3,alignItems:"flex-start"},
 section:{width:260,flexDirection:"row",alignItems:"center",gap:9,
  marginTop:10,marginBottom:4,paddingLeft:2},
 sectionTitle:{fontSize:14,color:C.green,fontWeight:"850"},
 sectionChorus:{color:C.pale},
 rule:{height:1,backgroundColor:"#386259",flex:1,opacity:.65}
});
module.exports=AlignedScore;
