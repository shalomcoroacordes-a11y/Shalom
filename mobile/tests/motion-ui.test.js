// Exercise native-animation contracts without requiring an Android runtime.
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {motion,navGeometry}=require("../src/motion-core");
let effects=[],refs=[],cursor=0,reduced=false,animations=[];
class Value{
 constructor(value){this.value=value;}
 setValue(value){this.value=value;}
 stopAnimation(){}
 interpolate(config){return {value:this,config};}
}
const Easing={cubic:"cubic",out:x=>x,bezier:(...args)=>args};
const Animated={Value,View:"AnimatedView",Image:"AnimatedImage",createAnimatedComponent:()=> "AnimatedPressable",timing(value,config){return {start(){animations.push(config);value.setValue(config.toValue);},stop(){}}},sequence(items){return {start(){items.forEach(x=>x.start());},stop(){}}}};
const h=(type,props,...children)=>({type,props,children});
const React={createElement:h,createContext:()=>({Provider:"Provider"}),useContext:()=>reduced,useRef:value=>refs[cursor++]||(refs[cursor-1]={current:value}),useEffect:fn=>effects.push(fn),useState:value=>[value,()=>{}]};
const mod={exports:{}};
vm.runInNewContext(fs.readFileSync("src/motion-ui.js","utf8"),{module:mod,require(name){if(name==="react")return React;if(name==="react-native")return{Animated,Easing,Pressable:"Pressable"};if(name==="./motion-core")return{motion,navGeometry};if(name==="./palette")return{green:"#49B58B"};throw Error(name);}});
const {MotionPressable,MotionHeart,MotionEntrance,NavHighlight}=mod.exports;
function render(fn,props,reset=false){if(reset)refs=[];cursor=0;effects=[];const result=fn(props);effects.forEach(fn=>fn());return result;}
let pressed=0,inCount=0,outCount=0;
let p=render(MotionPressable,{onPress:()=>pressed++,onPressIn:()=>inCount++,onPressOut:()=>outCount++,children:"Botón"},true);
p.props.onPressIn({});p.props.onPress({});p.props.onPressOut({});
assert.equal(pressed,1);assert.equal(inCount,1);assert.equal(outCount,1);
assert.equal(animations.at(-2).toValue,.94);assert.equal(animations.at(-1).toValue,1);
assert.ok(animations.every(a=>a.useNativeDriver===true&&a.isInteraction===false));
animations=[];reduced=true;p=render(MotionPressable,{},true);p.props.onPressIn({});p.props.onPressOut({});assert.equal(animations.length,0);
reduced=false;render(MotionHeart,{liked:false},true);render(MotionHeart,{liked:true});assert.deepEqual(animations.map(a=>a.toValue),[1.27,1]);
animations=[];render(MotionEntrance,{children:"Contenido"},true);assert.equal(animations.at(-1).duration,240);
animations=[];render(NavHighlight,{width:360,count:5,index:0},true);render(NavHighlight,{width:360,count:5,index:3});assert.equal(animations.at(-1).duration,340);assert.equal(animations.at(-1).toValue,navGeometry(360,5,3).x);
console.log("Native motion: callbacks, reduced motion, heart, entrance and indicator verified.");
