"use strict";
const React=require("react");
const {View}=require("react-native");
const {S}=require("../styles");
const {TITLES,displayTitle}=require("../model");
const {effective,canEdit,mapped}=require("../permissions");
const {txt,heading,button,input,itemRow}=require("../components/Controls");
const h=React.createElement;
function CatalogScreen({type,lists,search,setSearch,begin,access,offline,confirmRemove}){
  const rows=(lists[type]||[]).filter(x=>displayTitle(type,x).toLowerCase().includes(search.toLowerCase()));
  return h(View,{style:{gap:13}},
   h(View,{style:S.apart},heading(TITLES[type]),type==="contact_messages"?null:button("+ Nuevo",()=>begin(type),null,!canEdit(access,type)&&!offline)),
   input("Buscar "+TITLES[type],search,setSearch),
   rows.map(r=>h(View,{key:String(r.id||r.content_key),style:S.item},
    itemRow(displayTitle(type,r),(r.tone?"Tono "+r.tone:"")+(r.song_type?" · "+r.song_type:""),()=>begin(type,r)),
    !!access&&effective(access,mapped(type)+".delete")?button("Eliminar",()=>confirmRemove(type,r),"danger"):null
   )),
   !rows.length&&txt("No hay registros descargados. Conéctate y pulsa Actualizar para consultar el catálogo.",S.note)
  );
 }
module.exports=CatalogScreen;
