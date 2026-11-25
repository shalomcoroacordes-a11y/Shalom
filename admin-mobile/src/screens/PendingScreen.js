"use strict";
const React=require("react");
const {View,Alert}=require("react-native");
const {S,C}=require("../styles");
const {TITLES,displayTitle}=require("../model");
const {txt,heading,button}=require("../components/Controls");
const h=React.createElement;
function PendingScreen({busy,offline,sendQueue,drafts,begin,onTransition,onDelete}){
  return h(View,{style:{gap:14}},heading("Guardados en este teléfono"),
   txt("Los borradores no salen de tu dispositivo hasta que pulses Enviar a publicación. La cola se reintenta con internet.",S.subtitle),
   button(busy?"Sincronizando...":"Sincronizar pendientes",sendQueue,null,busy||offline),
   drafts.map(d=>h(View,{key:d.id,style:S.card},
    h(View,{style:S.apart},txt(displayTitle(d.type,d.body),S.itemTitle),txt(d.status.toUpperCase(),{color:d.status==="conflict"?C.danger:C.green,fontSize:10,fontWeight:"800"})),
    txt(TITLES[d.type]||d.type,S.itemSub),d.error?txt(d.error,S.error):null,
    h(View,{style:S.row},
     button("Editar",()=>begin(d.type,null,d),"secondary"),
     button(d.status==="queued"?"Volver a borrador":"Enviar",()=>onTransition(d),"secondary"),
     button("Borrar",()=>Alert.alert("Eliminar borrador local","No podrás recuperar los cambios sin publicar.",[
      {text:"Cancelar"},{text:"Eliminar",style:"destructive",onPress:()=>onDelete(d)}
     ]),"danger")))),
   !drafts.length&&txt("No hay borradores pendientes.",S.note)
  );
 }
module.exports=PendingScreen;
