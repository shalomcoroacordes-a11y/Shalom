const React=require("react");
const {View,Switch,ActivityIndicator}=require("react-native");
const h=React.createElement;
// Presentation only: application owns preferences, catalog, sync and navigation.
function SettingsScreen({S,C,title,label,Card,Btn,copy,model,wifiOnly,changeWifi,busy,manualSync,progress,error,goTab,openWeb}){
 function metric(name,n){return h(View,{style:S.metric,key:name},label(String(n),S.metricNumber),label(name,S.smallMuted))}
  return h(View,null,
   title("Configuración","Preferencias de SHALOM Android"),
   h(Card,null,
    label("Biblioteca y sincronización",S.listTitle),
    label(copy?.syncedAt?"Última actualización: "+new Date(copy.syncedAt).toLocaleString("es-MX"):"Todavía no has descargado la biblioteca.",S.rowMeta),
    h(View,{style:S.metrics},metric("Cantos",model.songs.length),metric("Artistas",model.artists.length),metric("Categorías",model.categories.length)),
    h(View,{style:S.switchRow},
     h(View,{style:{flex:1}},label("Preferir Wi-Fi",S.listTitle),label("Sincronización automática al abrir la aplicación.",S.smallMuted)),
     h(Switch,{value:wifiOnly,onValueChange:changeWifi,trackColor:{false:C.border,true:C.green},thumbColor:C.pale})),
    h(Btn,{text:busy?"Actualizando…":"Actualizar cancionero",onPress:manualSync,disabled:busy}),
    busy?h(ActivityIndicator,{color:C.green,style:{marginTop:8}}):null,
    progress?label(progress,S.info):null,error?label(error,S.error):null),
   title("Tus datos personales"),
   h(Btn,{text:"Respaldo y restauración",secondary:true,onPress:()=>goTab("Respaldo")}),
   label("Conserva una copia fuera del teléfono para recuperar tu perfil, fotos y creaciones.",S.smallMuted),
   title("Información de SHALOM"),
   h(Btn,{text:"Acerca de SHALOM ↗",secondary:true,onPress:()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/acerca.html")}),
   h(View,{style:{height:10}}),
   h(Btn,{text:"Donaciones ↗",secondary:true,onPress:()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/donaciones.html")}),
  );
 
}
module.exports=SettingsScreen;
