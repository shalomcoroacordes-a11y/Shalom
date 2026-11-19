const React=require("react");
const {View,Text,Pressable,StyleSheet}=require("react-native");
const h=React.createElement;
function LocalNotice({notice,onUndo,bottom=80}){
 if(!notice)return null;
 return h(View,{pointerEvents:"box-none",style:[S.overlay,{bottom}]},
  h(View,{style:S.bar,accessibilityRole:"alert"},
   h(Text,{style:S.check},"✓"),
   h(Text,{style:S.message,numberOfLines:2},notice.message),
   typeof notice.onUndo==="function"?h(Pressable,{
    accessibilityRole:"button",accessibilityLabel:"Deshacer última acción",onPress:onUndo,
    style:S.undoButton},h(Text,{style:S.undoText},"Deshacer")):null));
}
const S=StyleSheet.create({
 overlay:{position:"absolute",left:12,right:12,zIndex:30,elevation:24,alignItems:"center"},
 bar:{flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"#202c35",borderRadius:13,
  borderColor:"#51645e",borderWidth:1,paddingHorizontal:13,paddingVertical:12,
  shadowColor:"#000",shadowOpacity:.25,shadowRadius:9,maxWidth:520,width:"100%"},
 check:{color:"#27c98b",fontWeight:"900",fontSize:16},
 message:{flex:1,color:"#f1f5f4",fontWeight:"650",fontSize:12.5,lineHeight:18},
 undoButton:{paddingVertical:7,paddingHorizontal:5,minHeight:37,justifyContent:"center"},
 undoText:{color:"#5ff2b7",fontWeight:"850",fontSize:12.5}
});
module.exports=LocalNotice;