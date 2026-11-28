const palette=require("./palette");
const React=require("react");
const {useMemo,useState,useEffect}=React;
const {View,Text,StyleSheet,useWindowDimensions}=require("react-native");
const {WebView}=require("react-native-webview");
const {scoreHtml,estimateScoreHeight}=require("./web-score-html");
const scoreAssets=require("./score-reader-assets");
const {clampReaderFont}=require("./score-zoom");
const LegacyScore=require("./aligned-score-legacy-ui");
const h=React.createElement;

// Se renderiza solo el contenido de los cantos en un motor Chromium local.
// El contenido no procede de una URL: sigue disponible sin internet.
// En Android, RN Text aplica tratamientos de espacios/fuentes distintos de
// los de la vista del editor web, incluso con 'monospace' y espaciado cero.
function AlignedScore({rows=[],fontSize=15,variant="default",onFontSizeChange,autoFit=false,onAutoFont}){
 const {height:windowHeight,width:windowWidth}=useWindowDimensions();
 const container=React.useRef(null);
 const [budget,setBudget]=useState(null);
 const safeFont=clampReaderFont(fontSize);
 const serialized=JSON.stringify(rows);
 const fitHeight=autoFit?budget:0;
 const html=useMemo(()=>fitHeight?scoreHtml(rows,15,scoreAssets,{fitHeight}):scoreHtml(rows,safeFont,scoreAssets),[serialized,safeFont,fitHeight]);
 useEffect(()=>{setBudget(null);},[variant,windowHeight,windowWidth,autoFit]);
 function measureAvailable(){
  if(!autoFit||budget!==null)return;
  container.current?.measureInWindow((_x,y,_w,h)=>{
   if(!Number.isFinite(y)||!h)return;
   // Reserve the lower navigation and safe-area margin. Never clip a long section.
   setBudget(Math.max(100,Math.floor(windowHeight-Math.max(0,y)-88)));
  });
 }
 // Native height events must not construct a new document source.
 const source=useMemo(()=>({html}),[html]);
 const [height,setHeight]=useState(()=>estimateScoreHeight(rows,safeFont));
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  setHeight(estimateScoreHeight(rows,safeFont));
  setFailed(false);
 },[serialized,safeFont]);
 const onHeight=e=>{
  let value;
  try{value=JSON.parse(e.nativeEvent.data);}catch(_){return;}
  // La WebView avisa solo al terminar el pellizco: no se reinicia en cada movimiento.
  if(value?.type==="score-fit"){
   if(autoFit&&Number.isFinite(value.fontSize))onAutoFont?.(clampReaderFont(value.fontSize));
   return;
  }
  if(value?.type==="score-zoom"){
   if(Number.isFinite(value.fontSize)&&onFontSizeChange){
    const next=clampReaderFont(value.fontSize);
    if(autoFit||Math.abs(next-safeFont)>=0.05)onFontSizeChange(next);
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
 return h(View,{style:S.container,ref:container,collapsable:false,onLayout:measureAvailable},
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
 container:{width:"100%",backgroundColor:palette.bg,flex:0},
 web:{width:"100%",flex:0,backgroundColor:palette.bg},
 fallback:{fontSize:11,color:palette.muted,paddingVertical:6}
});
module.exports=AlignedScore;
