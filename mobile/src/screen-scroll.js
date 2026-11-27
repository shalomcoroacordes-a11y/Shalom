// Session-only scroll positions for catalog lists. Readers retain their own behavior.
const React=require("react");
const {Animated,AccessibilityInfo}=require("react-native");
const h=React.createElement;
const catalogTabs=new Set(["Inicio","Canciones","Artistas","Categorías","Álbumes","Popurrís","Repertorios","Explorar"]);
function scrollRouteKey({tab,detail,settingsOpen,songLibraryOpen,folderId,folderType}){
 if(settingsOpen)return null;
 if(detail)return ["artist","album"].includes(detail.type)
  ?JSON.stringify(["detail",tab,detail.type,String(detail.id)]):null;
 if(!catalogTabs.has(tab))return null;
 return JSON.stringify(["list",tab,tab==="Canciones"?Boolean(songLibraryOpen):null,
  tab==="Categorías"?[folderType||"",folderId||""]:null]);
}
function createScrollSession(memory,route){
 const stored=memory.get(route);
 let pending=Number.isFinite(stored)&&stored>0, viewport=null, content=null;
 function restore(scrollTo){
  if(!pending||viewport===null||content===null||!scrollTo)return;
  pending=false;
  const y=Math.max(0,Math.min(stored,content-viewport));
  memory.set(route,y);
  if(y>0)scrollTo(y);
 }
 return {
  layout(height,scrollTo){if(Number.isFinite(height)&&height>0)viewport=height;restore(scrollTo)},
  content(height,scrollTo){if(Number.isFinite(height)&&height>=0)content=height;restore(scrollTo)},
  scroll(y){
   if(pending||!Number.isFinite(y))return;
   memory.delete(route);
   memory.set(route,Math.max(0,y));
   if(memory.size>32)memory.delete(memory.keys().next().value);
  }
 };
}
function useCatalogMotion(){
 const [enabled,setEnabled]=React.useState(false);
 React.useEffect(()=>{
  let active=true,changed=false;
  const sub=AccessibilityInfo.addEventListener("reduceMotionChanged",value=>{changed=true;if(active)setEnabled(!value)});
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!changed)setEnabled(!value)}).catch(()=>{});
  return()=>{active=false;sub.remove()};
 },[]);
 return enabled;
}
function RememberedScrollView({memory,route,motionEnabled=false,children,...props}){
 const viewRef=React.useRef(null);
 const opacity=React.useRef(null);
 if(!opacity.current)opacity.current=new Animated.Value(1);
 React.useEffect(()=>{
  const value=opacity.current;
  if(!motionEnabled){value.setValue(1);return;}
  value.setValue(.88);
  const animation=Animated.timing(value,{toValue:1,duration:160,useNativeDriver:true});
  animation.start();
  return()=>animation.stop();
 },[route,motionEnabled]);
 const sessionRef=React.useRef(null);
 if(!sessionRef.current||sessionRef.current.memory!==memory){
  sessionRef.current={memory,controller:createScrollSession(memory,route)};
 }
 const session=sessionRef.current.controller;
 return h(Animated.ScrollView,{...props,style:[props.style,{opacity:opacity.current}],ref:viewRef,
  onLayout:event=>session.layout(event.nativeEvent.layout.height,viewRef.current?y=>viewRef.current?.scrollTo({y,animated:false}):null),
  onContentSizeChange:(_width,height)=>session.content(height,viewRef.current?y=>viewRef.current?.scrollTo({y,animated:false}):null),
  onScroll:event=>session.scroll(event.nativeEvent.contentOffset.y),scrollEventThrottle:32
 },children);
}
module.exports={RememberedScrollView,scrollRouteKey,createScrollSession,useCatalogMotion};
