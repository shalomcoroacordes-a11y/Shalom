const React=require("react");
const {View,Text,StyleSheet}=require("react-native");
const {LinearGradient}=require("expo-linear-gradient");
const h=React.createElement;
const TONES=[
 ["#185D65","#0C3344"],["#196849","#10382F"],["#776041","#423225"],
 ["#614785","#2C284F"],["#9C5362","#4D2B45"],["#3B6791","#173652"],
 ["#857030","#49371F"],["#32766A","#153F4D"]
];
function colorFor(name){
 const title=String(name||"Canto");
 let hash=0;
 for(let i=0;i<title.length;i++)hash=(Math.imul(hash,31)+title.charCodeAt(i))|0;
 return TONES[Math.abs(hash)%TONES.length];
}
function initials(name){
 const t=String(name||"?").trim().split(/\s+/).filter(Boolean);
 if(!t.length)return "?";
 return (t.length>1?t[0].slice(0,1)+t[1].slice(0,1):t[0].slice(0,1)).toUpperCase();
}
function InitialCover({title,size=54,round=false,full=false}){
 const colors=colorFor(title);
 return h(View,{style:[S.box,{width:full?"100%":size,height:size,borderRadius:round?size/2:12}]},
  h(LinearGradient,{colors,style:S.full}),
  h(Text,{style:[S.letter,{fontSize:Math.max(15,size*.32)}]},initials(title)));
}
const S=StyleSheet.create({
 box:{backgroundColor:"#17674C",overflow:"hidden",alignItems:"center",justifyContent:"center",position:"relative"},
 full:{position:"absolute",top:0,bottom:0,left:0,right:0},
 letter:{fontWeight:"900",color:"#F5F9F6",textAlign:"center"}
});
module.exports={InitialCover,colorFor,initials};
