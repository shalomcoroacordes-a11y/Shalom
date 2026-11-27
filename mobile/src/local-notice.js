const palette=require("./palette");
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
 bar:{flexDirection:"row",alignItems:"center",gap:9,backgroundColor:palette.panel,borderRadius:13,
  borderColor:palette.border,borderWidth:1,paddingHorizontal:13,paddingVertical:12,
  shadowColor:"#000",shadowOpacity:.25,shadowRadius:9,maxWidth:520,width:"100%"},
 check:{color:palette.green,fontWeight:"900",fontSize:16},
 message:{flex:1,color:palette.text,fontWeight:"650",fontSize:12.5,lineHeight:18},
 undoButton:{paddingVertical:7,paddingHorizontal:5,minHeight:37,justifyContent:"center"},
 undoText:{color:palette.green,fontWeight:"850",fontSize:12.5}
});
module.exports=LocalNotice;