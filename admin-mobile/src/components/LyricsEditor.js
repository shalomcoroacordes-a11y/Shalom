"use strict";
const React=require("react");
const {useRef,useState}=React;
const {View,Text,TextInput,ScrollView,Pressable,Modal,KeyboardAvoidingView,Platform,useWindowDimensions}=require("react-native");
const {SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const {S,C}=require("../styles");
const {parseSong}=require("../chords");
const {WebView}=require("react-native-webview");
const {scoreHtml}=require("../web-score-html");
const scoreAssets=require("../score-reader-assets");
const h=React.createElement;
const SECTIONS=["Intro","Verso 1","Pre-coro","Coro","Puente","Intermedio","Final"];
function text(t,style){return h(Text,{style},t);}
function tool(t,fn){return h(Pressable,{key:t,style:S.lyricTool,onPress:fn,accessibilityRole:"button"},text(t,{color:C.text,fontSize:12,fontWeight:"700"}));}
function Preview({value,font}){
 const html=React.useMemo(()=>scoreHtml(parseSong(value,0,true),font,scoreAssets),[value,font]);
 const source=React.useMemo(()=>({html}),[html]);
 return h(WebView,{source,originWhitelist:["*"],javaScriptEnabled:true,domStorageEnabled:false,
  allowFileAccess:false,mixedContentMode:"never",setSupportMultipleWindows:false,
  javaScriptCanOpenWindowsAutomatically:false,style:{flex:1,backgroundColor:C.bg},
  accessibilityLabel:"Vista previa de letra y acordes"});
}
function LyricsEditor({value,onChange}){
 const {height}=useWindowDimensions(),insets=useSafeAreaInsets();
 const [full,setFull]=useState(false),[preview,setPreview]=useState(false),[font,setFont]=useState(15);
 const selection=useRef({start:0,end:0});
 const content=String(value||"");
 function insertSection(name){
  const position=Math.max(0,Math.min(selection.current.start,content.length));
  const block="\n["+name+"]\n";
  onChange(content.slice(0,position)+block+content.slice(position));
  selection.current={start:position+block.length,end:position+block.length};
 }
 function editor(isFull){
  return h(TextInput,{
   value:content,
   onChangeText:onChange,
   onSelectionChange:e=>{selection.current=e.nativeEvent.selection;},
   multiline:true,
   autoCorrect:false,
   autoCapitalize:"sentences",
   scrollEnabled:true,
   textAlignVertical:"top",
   accessibilityLabel:"Editor de letra y acordes",
   placeholder:"[Intro]\nG        D\nLetra del canto...\n\n[Coro]\nEm       C\nAcordes arriba de cada frase",
   placeholderTextColor:C.muted,
   style:[S.lyricInput,{fontSize:font,fontFamily:"monospace",lineHeight:Math.round(font*1.65)},isFull?
    {flex:1,minHeight:0,marginTop:8,marginBottom:8}:
    {minHeight:Math.max(360,Math.round(height*.52)),height:Math.max(360,Math.round(height*.52))}]
  });
 }
 function toolbar(){return h(ScrollView,{horizontal:true,keyboardShouldPersistTaps:"always",showsHorizontalScrollIndicator:false,contentContainerStyle:{gap:7,paddingVertical:6}},
  SECTIONS.map(s=>tool("＋ "+s,()=>insertSection(s))));}
 function header(){return h(View,{style:S.apart},
  h(View,{style:{flex:1,gap:3}},text("Letra y acordes",S.section),text("Cada acorde queda sobre la palabra usando espacios.",S.note)),
  tool("⤢  Ampliar",()=>{setFull(true);setPreview(false);}));
 }
 return h(View,{style:{gap:10}},header(),toolbar(),editor(false),
  h(View,{style:{flexDirection:"row",gap:8,justifyContent:"space-between",alignItems:"center"}},
   text(content.split("\n").length+" líneas",{...S.caption}),
   h(View,{style:{flexDirection:"row",gap:7}},tool("A−",()=>setFont(n=>Math.max(13,n-1))),tool("A+",()=>setFont(n=>Math.min(21,n+1))))),
  h(Modal,{visible:full,animationType:"slide",presentationStyle:"fullScreen",onRequestClose:()=>setFull(false),statusBarTranslucent:false,navigationBarTranslucent:false},
   h(SafeAreaView,{style:{flex:1,backgroundColor:C.bg},edges:["top","bottom"]},
    h(KeyboardAvoidingView,{style:{flex:1},behavior:Platform.OS==="ios"?"padding":undefined},
     h(View,{style:{paddingHorizontal:16,paddingTop:12,paddingBottom:8,gap:9,flex:1}},
      h(View,{style:S.apart},
       h(View,{style:{gap:3,flex:1}},text("Editor de canto",S.section),text("Espacio amplio para trabajar con letra y acordes",S.caption)),
       tool("✓ Listo",()=>setFull(false))),
      h(View,{style:{flexDirection:"row",gap:8}},tool(preview?"✎ Editar":"◉ Vista previa",()=>setPreview(p=>!p)),
       tool("A−",()=>setFont(n=>Math.max(13,n-1))),tool("A+",()=>setFont(n=>Math.min(21,n+1)))),
      toolbar(),
      preview?h(View,{style:{flex:1}},h(Preview,{value:content,font})):editor(true),
      h(View,{style:{paddingBottom:Math.max(8,insets.bottom)}},text("Los cambios permanecen en este borrador hasta que lo guardes.",S.note))
     )))
  )
 );
}
module.exports=LyricsEditor;
