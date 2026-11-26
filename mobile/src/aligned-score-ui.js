const React=require("react");
const {useMemo,useState,useEffect}=React;
const {View,Text,StyleSheet}=require("react-native");
const {WebView}=require("react-native-webview");
const {scoreHtml,estimateScoreHeight}=require("./web-score-html");
const {clampReaderFont}=require("./score-zoom");
const LegacyScore=require("./aligned-score-legacy-ui");
const h=React.createElement;

// Se renderiza solo el contenido de los cantos en un motor Chromium local.
// El contenido no procede de una URL: sigue disponible sin internet.
// En Android, RN Text aplica tratamientos de espacios/fuentes distintos de
// los de la vista del editor web, incluso con 'monospace' y espaciado cero.
function AlignedScore({rows=[],fontSize=15,variant="default",onFontSizeChange,fitMode="manual",fitHeight=0,onFitFont}){
 const safeFont=clampReaderFont(fontSize);
 const serialized=JSON.stringify(rows);
 const html=useMemo(()=>fitMode==="manual"?scoreHtml(rows,safeFont):scoreHtml(rows,safeFont,{mode:fitMode,height:fitHeight}),[serialized,safeFont,fitMode,fitHeight]);
 // Native height events must not construct a new document source.
 const source=useMemo(()=>({html}),[html]);
 const [height,setHeight]=useState(()=>estimateScoreHeight(rows,safeFont));
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  setHeight(estimateScoreHeight(rows,safeFont));
  setFailed(false);
 },[serialized,safeFont,fitMode,fitHeight]);
 const onHeight=e=>{
  let value;
  try{value=JSON.parse(e.nativeEvent.data);}catch(_){return;}
  // La WebView avisa solo al terminar el pellizco: no se reinicia en cada movimiento.
  if(value?.type==="score-fit"){
   if(Number.isFinite(value.fontSize)&&onFitFont)onFitFont(clampReaderFont(value.fontSize));
   return;
  }
  if(value?.type==="score-zoom"){
   if(Number.isFinite(value.fontSize)&&onFontSizeChange){
    const next=clampReaderFont(value.fontSize);
    if(fitMode!=="manual"||Math.abs(next-safeFont)>=0.05)onFontSizeChange(next);
   }
   return;
  }
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
   source,
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
 // La WebView se funde con el fondo del lector: la letra ya no va dentro de una caja.
 container:{width:"100%",backgroundColor:"#0e1219",flex:0},
 web:{width:"100%",flex:0,backgroundColor:"#0e1219"},
 fallback:{fontSize:11,color:"#b1d9c9",paddingVertical:6}
});
module.exports=AlignedScore;
