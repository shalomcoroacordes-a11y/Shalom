// Shared minimal reader switch and pager. Mode is a session preference only.
const React=require("react"),{View,Text,Pressable}=require("react-native"),C=require("./palette");
const h=React.createElement;
function button(text,onPress,selected=false,disabled=false){
 return h(Pressable,{onPress,disabled,accessibilityRole:"button",accessibilityState:{selected,disabled},style:{paddingVertical:10,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:selected?C.green:C.border,opacity:disabled?.4:1}},
  h(Text,{style:{fontSize:12,fontWeight:"600",color:selected?C.green:C.text}},text));
}
function Mode({mode="continuous",setMode=()=>{},setPage=()=>{}}){
 const choose=value=>{setMode(value);setPage(0)};
 return h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:8}},
  button("Lectura continua",()=>choose("continuous"),mode==="continuous"),
  button("Por secciones",()=>choose("sections"),mode==="sections"));
}
function Pager({pages=[],page=0,setPage=()=>{}}){
 if(!pages.length)return null;
 const index=Math.min(pages.length-1,Math.max(0,page));
 return h(View,{style:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:7,marginVertical:9}},
  button("‹ Anterior",()=>setPage(index-1),false,index===0),
  h(View,{style:{flex:1,alignItems:"center"}},h(Text,{style:{fontSize:12,color:C.green,fontWeight:"600",textAlign:"center"}},pages[index].title),h(Text,{style:{fontSize:11,color:C.muted}},(index+1)+" / "+pages.length)),
  button("Siguiente ›",()=>setPage(index+1),false,index===pages.length-1));
}
module.exports={Mode,Pager};
