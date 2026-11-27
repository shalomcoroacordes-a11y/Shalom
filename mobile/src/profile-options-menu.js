const React=require("react");
const {Modal,View,Text,Pressable,ScrollView,StyleSheet}=require("react-native");
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
    h(ScrollView,{keyboardShouldPersistTaps:"handled",bounces:false},...items.map(option)),
    h(Pressable,{onPress:onDismiss,style:S.close,accessibilityRole:"button"},
     h(Text,{style:S.closeText},"Cerrar")))));
}
const S=StyleSheet.create({
 root:{flex:1,justifyContent:"flex-end"},
 backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.58)"},
 menu:{backgroundColor:"#151b22",borderTopLeftRadius:20,borderTopRightRadius:20,
  borderTopWidth:1,borderColor:"#303a40",paddingHorizontal:14,paddingTop:8,paddingBottom:26,maxHeight:"86%"},
 handle:{height:4,width:32,borderRadius:4,alignSelf:"center",backgroundColor:"#65736e",marginBottom:8},
 heading:{fontSize:16,color:"#f3f8f5",fontWeight:"650",marginBottom:6},
 item:{minHeight:44,flexDirection:"row",alignItems:"center",gap:10,paddingVertical:5,paddingHorizontal:4,
  borderRadius:8},
 pressed:{backgroundColor:"#233139"},
 icon:{width:25,textAlign:"center",fontSize:20,color:"#b0c0c7"},
 name:{flex:1,fontSize:14,fontWeight:"500",color:"#f4f7f7"},
 arrow:{fontSize:19,color:"#87958e"},
 close:{alignItems:"center",justifyContent:"center",minHeight:44,padding:8,marginTop:4,borderTopWidth:1,borderColor:"#303a40"},
 closeText:{fontSize:13,color:"#b0c0c7",fontWeight:"500"}
});
module.exports=ProfileOptionsMenu;