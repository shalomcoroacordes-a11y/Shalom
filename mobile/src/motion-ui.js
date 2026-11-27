// Native-driver microinteractions. No music reader, data or navigation ownership.
const React=require("react");
const {useContext,useEffect,useRef,useState}=React;
const {AccessibilityInfo,Animated,Easing,Pressable}=require("react-native");
const {motion,navGeometry}=require("./motion-core");
const palette=require("./palette");
const h=React.createElement;
const ReducedMotion=React.createContext(true);
function MotionProvider({children}){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{
  let active=true,changed=false;
  const subscription=AccessibilityInfo.addEventListener("reduceMotionChanged",value=>{changed=true;if(active)setReduced(value);});
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!changed)setReduced(value);}).catch(()=>{});
  return ()=>{active=false;subscription.remove();};
 },[]);
 return h(ReducedMotion.Provider,{value:reduced},children);
}
function useReducedMotion(){return useContext(ReducedMotion);}
function timing(value,toValue,duration,easing=Easing.out(Easing.cubic)){
 return Animated.timing(value,{toValue,duration,easing,useNativeDriver:true,isInteraction:false});
}
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
function MotionPressable({children,style,onPressIn,onPressOut,disabled,...props}){
 const reduced=useReducedMotion();
 const scale=useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(reduced||disabled){scale.stopAnimation();scale.setValue(1);}return ()=>scale.stopAnimation();},[reduced,disabled,scale]);
 const animate=(value,duration)=>{if(!reduced&&!disabled)timing(scale,value,duration).start();};
 return h(AnimatedPressable,{...props,disabled,style:[style,{transform:[{scale}]}],
  onPressIn:e=>{animate(motion.pressScale,motion.press);onPressIn?.(e);},
  onPressOut:e=>{animate(1,motion.release);onPressOut?.(e);}},children);
}
function MotionEntrance({children}){
 const reduced=useReducedMotion();
 const value=useRef(new Animated.Value(reduced?1:0)).current;
 useEffect(()=>{
  if(reduced){value.setValue(1);return;}
  const animation=timing(value,1,motion.page);
  animation.start();return ()=>animation.stop();
 },[reduced,value]);
 return h(Animated.View,{style:{opacity:value.interpolate({inputRange:[0,1],outputRange:[.3,1]}),
  transform:[{translateY:value.interpolate({inputRange:[0,1],outputRange:[motion.pageOffset,0]})}]}},children);
}
function MotionHeart({liked,style,...props}){
 const reduced=useReducedMotion();
 const scale=useRef(new Animated.Value(1)).current;
 const previous=useRef(liked);
 useEffect(()=>{
  const added=liked&&!previous.current;previous.current=liked;
  scale.stopAnimation();scale.setValue(1);
  if(reduced||!added)return;
  scale.setValue(motion.heartStart);
  const animation=Animated.sequence([timing(scale,motion.heartPeak,motion.heartUp),timing(scale,1,motion.heartDown)]);
  animation.start();return ()=>animation.stop();
 },[liked,reduced,scale]);
 return h(Animated.Image,{...props,style:[style,{transform:[{scale}]}]});
}
function NavHighlight({width,count,index}){
 const reduced=useReducedMotion();
 const geometry=navGeometry(width,count,index);
 const x=useRef(new Animated.Value(geometry?.x||0)).current;
 const previous=useRef(null);
 useEffect(()=>{
  if(!geometry)return;
  if(reduced||previous.current!==width){x.setValue(geometry.x);previous.current=width;return;}
  const animation=timing(x,geometry.x,motion.nav,Easing.bezier(.2,.85,.25,1));
  animation.start();return ()=>animation.stop();
 },[width,geometry?.x,reduced,x]);
 if(!geometry)return null;
 return h(Animated.View,{pointerEvents:"none",accessible:false,style:{position:"absolute",left:0,top:7,
  width:geometry.width,height:34,borderRadius:17,backgroundColor:palette.green+"22",transform:[{translateX:x}]}});
}
module.exports={MotionProvider,useReducedMotion,MotionPressable,MotionEntrance,MotionHeart,NavHighlight};
