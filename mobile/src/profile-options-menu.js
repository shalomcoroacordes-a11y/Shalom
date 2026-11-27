const palette=require("./palette");
const React=require("react");
const {Modal,View,Text,Pressable,StyleSheet}=require("react-native");
const h=React.createElement;
function ProfileOptionsMenu({visible,onDismiss,onEdit,onCollections,onBackup,onMore}){
 const items=[
  ["✎","Editar perfil",onEdit],
  ["▣","Mis creaciones",onCollections],
  ["↥","Respaldo y restauración",onBackup],
  ["⋯","Más opciones",onMore]
 ];
 const option=([symbol,title,action])=>h(Pressable,{key:title,accessibilityRole:"button",
  accessibilityLabel:title,style:S.item,onPress:()=>{onDismiss();action();}},
  h(Text,{style:S.icon},symbol),
  h(Text,{style:S.name},title),
  h(Text,{style:S.arrow},"›"));
 return h(Modal,{visible,transparent:true,animationType:"slide",onRequestClose:onDismiss,
  statusBarTranslucent:true,accessibilityViewIsModal:true},
  h(View,{style:S.root},
   h(Pressable,{onPress:onDismiss,accessibilityRole:"button",accessibilityLabel:"Cerrar opciones",style:S.backdrop}),
   h(View,{style:S.menu},
    h(View,{style:S.handle}),
    h(Text,{style:S.heading},"Opciones de Mi perfil"),
    ...items.map(option),
    h(Pressable,{onPress:onDismiss,style:S.close,accessibilityRole:"button"},
     h(Text,{style:S.closeText},"Cerrar")))));
}
const S=StyleSheet.create({
 root:{flex:1,justifyContent:"flex-end"},
 backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.58)"},
 menu:{backgroundColor:palette.bg,borderTopLeftRadius:23,borderTopRightRadius:23,
  borderTopWidth:1,borderColor:palette.border,paddingHorizontal:17,paddingTop:10,paddingBottom:26},
 handle:{height:5,width:42,borderRadius:4,alignSelf:"center",backgroundColor:palette.muted,marginBottom:15},
 heading:{fontSize:18,color:palette.text,fontWeight:"850",marginBottom:12},
 item:{minHeight:53,flexDirection:"row",alignItems:"center",gap:13,paddingHorizontal:6,
  borderBottomColor:palette.border,borderBottomWidth:1},
 icon:{width:29,textAlign:"center",fontSize:23,color:palette.green},
 name:{flex:1,fontSize:14,fontWeight:"750",color:palette.text},
 arrow:{fontSize:23,color:palette.muted},
 close:{alignItems:"center",padding:12,marginTop:10,borderRadius:12,backgroundColor:palette.panel},
 closeText:{fontSize:13,color:palette.text,fontWeight:"750"}
});
module.exports=ProfileOptionsMenu;