const React=require("react");
const {useState}=React;
const {View,Text,ScrollView,Platform,StyleSheet}=require("react-native");
const {anchoredTokens,columnCount,initialCellWidth,measuredCellWidth}=require("./chord-grid");
const h=React.createElement;
const MONO=Platform.OS==="ios"?"Menlo":"monospace";
const SAMPLE="000000000000";
const C={green:"#27c98b",pale:"#b5ffe0",text:"#f4f7f7"};
// Una única muestra obtiene el ancho REAL de un carácter monospace del
// dispositivo; acordes y letra se anclan a la misma coordenada de cuadrícula.
function AlignedScore({rows=[],fontSize=18,variant="default"}){
 const [measurement,setMeasurement]=useState(null);
 const cell=measurement?.size===fontSize?measurement.cell:initialCellWidth(fontSize);
 const width=Math.ceil(columnCount(rows)*cell+20);
 const characterStyle={fontFamily:MONO,fontSize,lineHeight:fontSize+7,
  fontWeight:"normal",letterSpacing:0,includeFontPadding:false};
 const handleMeasure=event=>{
  const w=event?.nativeEvent?.layout?.width;
  const calculated=measuredCellWidth(w,SAMPLE.length,fontSize);
  setMeasurement(prev=>prev?.size===fontSize&&Math.abs(prev.cell-calculated)<.03?
   prev:{size:fontSize,cell:calculated});
 };
 const line=(value,color,key)=>h(View,{key,style:[S.line,{height:fontSize+8,width}]},
  ...anchoredTokens(value).map((token,i)=>h(Text,{
   key:key+"-"+i,
   numberOfLines:1,allowFontScaling:false,selectable:true,
   style:[characterStyle,S.token,{color,left:5+token.column*cell}]},token.text)));
 return h(ScrollView,{horizontal:true,nestedScrollEnabled:true,showsHorizontalScrollIndicator:true,
  keyboardShouldPersistTaps:"handled",style:S.scroll,
  contentContainerStyle:{paddingVertical:3,paddingHorizontal:3}},
  h(View,{style:[S.score,{width}]},
   h(Text,{onLayout:handleMeasure,allowFontScaling:false,numberOfLines:1,
    style:[characterStyle,S.ruler],accessibilityElementsHidden:true,
    importantForAccessibility:"no-hide-descendants"},SAMPLE),
   ...rows.map((row,i)=>{
    const key=variant+"-"+i;
    if(row.kind==="space")return h(View,{key,style:{height:fontSize*1.15}});
    if(row.kind==="section"){
     const chorus=/coro|estribillo|refr[aá]n/i.test(row.text||"");
     return h(View,{key,style:S.section,
      accessibilityLabel:"Sección: "+row.text},
      h(Text,{style:[S.sectionTitle,chorus&&S.sectionChorus]},row.text),
      h(View,{style:S.rule}));
    }
    if(row.kind==="chords")return h(View,{key,style:{marginBottom:7}},
     line(row.chordLine||" ",C.green,key+"-chord"),
     line(row.lyricLine||" ",C.text,key+"-lyric"));
    return line(row.text||" ",row.kind==="chordsOnly"?C.green:C.text,key);
   })));
}
const S=StyleSheet.create({
 scroll:{marginTop:0,marginBottom:3},
 score:{position:"relative",paddingTop:5,paddingBottom:14,alignItems:"flex-start"},
 ruler:{position:"absolute",left:0,top:0,opacity:0,
  backgroundColor:"transparent",color:"transparent",alignSelf:"flex-start"},
 line:{position:"relative"},
 token:{position:"absolute",top:0,padding:0,margin:0,textAlign:"left"},
 section:{width:290,flexDirection:"row",alignItems:"center",gap:9,
  marginTop:14,marginBottom:10,paddingLeft:4},
 sectionTitle:{fontSize:14,color:C.green,fontWeight:"850"},
 sectionChorus:{color:C.pale},
 rule:{height:1,backgroundColor:"#386259",flex:1,opacity:.65}
});
module.exports=AlignedScore;
