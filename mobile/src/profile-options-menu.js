const React=require("react");
const {Modal,View,Text,Pressable,StyleSheet}=require("react-native");
const h=React.createElement;
function ProfileOptionsMenu({visible,onDismiss,onEdit,onCollections,onBackup,onMore,motionEnabled=false,bottomInset=0}){
 const items=[
  ["✎","Editar perfil",onEdit],
  ["▣","Mis creaciones",onCollections],
  ["↥","Respaldo y restauración",onBackup],
  ["⋯","Más opciones",onMore]
 ];
 const option=([symbol,title,action])=>h(Pressable,{key:title,accessibilityRole:"button",
  accessibilityLabel:title,style:({pressed})=>[S.item,pressed&&S.pressed],onPress:()=>{onDismiss();action();}},
  h(Text,{style:S.icon},symbol),
  h(Text,{style:S.name},title),
  h(Text,{style:S.arrow},"›"));
 return h(Modal,{visible,transparent:true,animationType:motionEnabled?"slide":"none",onRequestClose:onDismiss,
  statusBarTranslucent:true,accessibilityViewIsModal:true},
  h(View,{style:S.root},
   h(Pressable,{onPress:onDismiss,accessibilityRole:"button",accessibilityLabel:"Cerrar opciones",style:S.backdrop}),
   h(View,{style:[S.menu,{paddingBottom:Math.max(26,bottomInset+12)}],accessibilityViewIsModal:true},
    h(View,{style:S.handle}),
    h(Text,{style:S.heading},"Opciones de Mi perfil"),
    ...items.map(option),
    h(Pressable,{onPress:onDismiss,style:S.close,accessibilityRole:"button"},
     h(Text,{style:S.closeText},"Cerrar")))));
}
const S=StyleSheet.create({
 root:{flex:1,justifyContent:"flex-end"},
 backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.58)"},
 menu:{backgroundColor:"#10181e",borderTopLeftRadius:23,borderTopRightRadius:23,
  borderTopWidth:1,borderColor:"#456356",paddingHorizontal:17,paddingTop:10,paddingBottom:26},
 handle:{height:5,width:42,borderRadius:4,alignSelf:"center",backgroundColor:"#536762",marginBottom:15},
 heading:{fontSize:18,color:"#f3f8f5",fontWeight:"850",marginBottom:12},
 item:{minHeight:53,flexDirection:"row",alignItems:"center",gap:13,paddingHorizontal:6,
  borderBottomColor:"#34453f",borderBottomWidth:1},
 pressed:{backgroundColor:"#213a33"},
 icon:{width:29,textAlign:"center",fontSize:23,color:"#27c98b"},
 name:{flex:1,fontSize:14,fontWeight:"750",color:"#f4f7f7"},
 arrow:{fontSize:23,color:"#879d94"},
 close:{alignItems:"center",justifyContent:"center",minHeight:44,padding:12,marginTop:10,borderRadius:12,backgroundColor:"#213a33"},
 closeText:{fontSize:13,color:"#d1f7e5",fontWeight:"750"}
});
module.exports=ProfileOptionsMenu;