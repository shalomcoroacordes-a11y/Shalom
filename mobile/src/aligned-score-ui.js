const React=require("react");
const {useMemo,useState,useEffect}=React;
const {View,Text,StyleSheet}=require("react-native");
const {WebView}=require("react-native-webview");
const {scoreHtml,estimateScoreHeight}=require("./web-score-html");
const LegacyScore=require("./aligned-score-legacy-ui");
const h=React.createElement;

// Se renderiza solo el contenido de los cantos en un motor Chromium local.
// El contenido no procede de una URL: sigue disponible sin internet.
// En Android, RN Text aplica tratamientos de espacios/fuentes distintos de
// los de la vista del editor web, incluso con 'monospace' y espaciado cero.
function AlignedScore({rows=[],fontSize=15,variant="default"}){
 const safeFont=Number.isFinite(fontSize)?fontSize:15;
 const serialized=JSON.stringify(rows);
 const html=useMemo(()=>scoreHtml(rows,safeFont),[serialized,safeFont]);
 const [height,setHeight]=useState(()=>estimateScoreHeight(rows,safeFont));
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  setHeight(estimateScoreHeight(rows,safeFont));
  setFailed(false);
 },[serialized,safeFont]);
 const onHeight=e=>{
  let value;
  try{value=JSON.parse(e.nativeEvent.data);}catch(_){return;}
  if(value?.type!=="score-height"||!Number.isFinite(value.height))return;
  const next=Math.ceil(value.height);
  if(next<20||next>150000)return;
  setHeight(previous=>Math.abs(previous-next)<2?previous:next);
 };
 if(failed)return h(View,null,
  h(Text,{style:S.fallback},"Este teléfono está usando el lector alternativo."),
  h(LegacyScore,{rows,fontSize:safeFont,variant}));
 return h(View,{style:S.container},
  h(WebView,{
   // El contenido está generado localmente y la política CSP impide enlaces,
   // peticiones remotas o scripts externos. No carga el sitio de SHALOM.
   source:{html},
   originWhitelist:["*"],
   javaScriptEnabled:true,
   domStorageEnabled:false,
   allowFileAccess:false,
   mixedContentMode:"never",
   setSupportMultipleWindows:false,
   javaScriptCanOpenWindowsAutomatically:false,
   scrollEnabled:false,
   bounces:false,
   overScrollMode:"never",
   androidLayerType:"hardware",
   showsHorizontalScrollIndicator:false,
   showsVerticalScrollIndicator:false,
   onMessage:onHeight,
   onError:()=>setFailed(true),
   onContentProcessDidTerminate:()=>setFailed(true),
   style:[S.web,{height}],
   containerStyle:{height,flex:0},
   accessibilityLabel:"Letra y acordes de SHALOM"
  }));
}
const S=StyleSheet.create({
 container:{width:"100%",backgroundColor:"#172538",flex:0},
 web:{width:"100%",flex:0,backgroundColor:"#172538"},
 fallback:{fontSize:11,color:"#b1d9c9",paddingVertical:6}
});
module.exports=AlignedScore;
