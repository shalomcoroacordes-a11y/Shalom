"use strict";
const React=require("react");
const {Modal,View,Text,Pressable,AppState,Alert}=require("react-native");
const {SafeAreaView}=require("react-native-safe-area-context");
const {WebView}=require("react-native-webview");
const makeHtml=require("./studio-bundle");
const h=React.createElement;
function StudioScreen({payload,onClose,onSaveDraft,onPublish}){
 const web=React.useRef(null),busy=React.useRef(false),alive=React.useRef(true),loaded=React.useRef(false);
 const source=React.useMemo(()=>({html:makeHtml(payload),baseUrl:"about:blank"}),[payload]);
 React.useEffect(()=>{alive.current=true;const sub=AppState.addEventListener("change",s=>{if(s!=="active")web.current?.injectJavaScript('document.getElementById("pause")?.click();true;')});return()=>{alive.current=false;sub.remove()}},[]);
 const reply=(ok,message)=>{if(alive.current)web.current?.injectJavaScript("window.__shalomStudioReceive("+JSON.stringify({type:"shalom-studio-result",ok,message})+");true;")};
 async function receive(event){
  let data;try{data=JSON.parse(event.nativeEvent.data)}catch{return}
  if(data?.type==="shalom-studio-close"){if(!busy.current)onClose();return;}
  if(payload.mode!=="admin"||busy.current||!data?.arrangement||data.arrangement.v!==1||JSON.stringify(data.arrangement).length>64000)return;
  const handler=data.type==="shalom-studio-draft"?onSaveDraft:data.type==="shalom-studio-publish"?onPublish:null;
  if(!handler)return;
  busy.current=true;try{await handler(data.arrangement);reply(true,data.type==="shalom-studio-draft"?"Borrador guardado en este dispositivo.":"✓ Acompañamiento guardado y publicado.")}catch(e){reply(false,e.message||"No se pudo guardar.")}finally{busy.current=false}
 }
 function close(){if(busy.current){Alert.alert("SHALOM Studio","Espera a que termine el guardado.");return;}if(!loaded.current||!web.current){onClose();return;}web.current.injectJavaScript('if(typeof window.__shalomStudioBack!=="function"||window.__shalomStudioBack()){window.ReactNativeWebView.postMessage(JSON.stringify({type:"shalom-studio-close"}));}true;')}
 return h(Modal,{visible:true,animationType:"slide",onRequestClose:close,accessibilityViewIsModal:true},
  h(SafeAreaView,{style:{flex:1,backgroundColor:"#131c18"},edges:["top","bottom","left","right"]},
   h(View,{style:{flexDirection:"row",alignItems:"center",padding:12,borderBottomWidth:1,borderColor:"#34463b"}},
    h(Pressable,{onPress:close,accessibilityRole:"button",accessibilityLabel:"Regresar al canto",style:{padding:8}},h(Text,{style:{color:"#a8d9b5",fontSize:17}},"‹ Regresar")),
    h(Text,{style:{color:"#edf3ee",fontWeight:"700",marginLeft:12}},"SHALOM Studio")),
   h(WebView,{ref:web,source,style:{flex:1,backgroundColor:"#131c18"},originWhitelist:["*"],onShouldStartLoadWithRequest:r=>r.url==="about:blank"||r.url.startsWith("data:text/html"),onMessage:receive,onLoadEnd:()=>{loaded.current=true},onLoadStart:()=>{loaded.current=false},javaScriptEnabled:true,domStorageEnabled:false,allowFileAccess:false,allowUniversalAccessFromFileURLs:false,allowFileAccessFromFileURLs:false,mixedContentMode:"never",setSupportMultipleWindows:false,mediaPlaybackRequiresUserAction:true,onError:()=>Alert.alert("Studio","No se pudo iniciar la vista de práctica.")})
  ));
}
module.exports=StudioScreen;
