"use strict";
const React=require("react");
const {View,Text,ScrollView}=require("react-native");
const {S}=require("../styles");
const {TITLES,FIELDS}=require("../model");
const {canPublish}=require("../permissions");
const {renderLines}=require("../score");
const {txt,button,wrapChips}=require("../components/Controls");
const {Field}=require("../components/EditorFields");
const StudioHistory=require("./StudioHistory");
const h=React.createElement;
function EditorScreen({form,selectedType,section,update,adminBack,setSection,lists,localId,editing,studioStatus,openStudio,openLyricCues,listStudioHistory,chooseStudioHistory,historyOwner,editorSaving,saveDraft,access,offline}){
  if(!form)return null;
  const specs=FIELDS[selectedType]||[];
  const song=selectedType==="songs";
  const available= song && section==="Datos"?specs.filter(x=>!["lyrics","links","capos"].includes(x[0])):
    song&&section==="Letra"?specs.filter(x=>x[0]==="lyrics"):
    song&&section==="Capos"?specs.filter(x=>x[0]==="capos"):
    song&&section==="Enlaces"?specs.filter(x=>x[0]==="links"):song?[]:specs;
  return h(View,{style:{gap:14}},
   h(View,{style:S.apart},h(View,null,txt("Editar "+(TITLES[selectedType]||selectedType),S.kicker),txt(form.title||form.name||"Nuevo contenido",S.section)),button("Volver",adminBack,"secondary")),
   song?wrapChips(["Datos","Letra","Capos","Enlaces","Vista previa"].map(x=>[x,x]),section,setSection):null,
   section==="Vista previa"&&song?h(View,{style:S.preview},
    txt(form.title||"Canto sin título",S.section),
    txt("TONO "+(form.tone||"—")+" · CAPO "+(form.capo_position||0),S.caption),
    h(ScrollView,{horizontal:true,nestedScrollEnabled:true,showsHorizontalScrollIndicator:true,
      contentContainerStyle:{paddingVertical:8,minWidth:"100%"}},
      h(View,{style:{gap:2}},renderLines(form.lyrics).map((r,i)=>h(Text,{key:"line"+i,
       style:[r.type==="chords"?S.chords:r.type==="section"?S.kicker:S.lyrics,
        {fontSize:r.type==="section"?12:15,lineHeight:24,marginTop:r.type==="section"?12:0}]},r.text))))
   ):h(View,{style:{gap:12}},available.map(spec=>h(Field,{key:spec[0],spec,form,onChange:update,lists,createId:localId,onOpenCues:openLyricCues}))),
   song&&editing?.expected?h(View,{style:{gap:6}},txt("SHALOM Studio",S.kicker),txt(studioStatus?.id!==editing.id?"Consultando acompañamiento…":studioStatus.error?"No se pudo consultar el estado":studioStatus.draft?(studioStatus.arrangement?"Borrador local · hay una versión publicada":"Borrador local · todavía no publicado"):studioStatus.arrangement?(studioStatus.checked?"✓ Acompañamiento publicado":"Acompañamiento guardado en caché · sin conexión"):(studioStatus.checked?"Sin acompañamiento publicado":"Sin información local · sin conexión"),S.note),button(studioStatus?.id===editing.id&&(studioStatus.arrangement||studioStatus.draft)?"Abrir acompañamiento de guitarra":"Configurar acompañamiento de guitarra",openStudio,"secondary")):null,
   song&&editing?.expected&&!offline&&canPublish(access,"songs")?h(StudioHistory,{key:JSON.stringify([historyOwner,editing.id,editing.expected]),revision:editing.expected,onList:listStudioHistory,onChoose:chooseStudioHistory}):null,
   h(View,{style:S.divider}),
   h(View,{style:{gap:9}},button(editorSaving?"Guardando…":"Guardar borrador local",()=>saveDraft(false),"secondary",editorSaving),
    button("Enviar a publicación",()=>saveDraft(true),null,editorSaving||(!canPublish(access,selectedType)&&!offline))),
   txt("Sin internet se guarda localmente. La publicación se confirma solo después de verificar sesión y permisos en Supabase.",S.note)
  );
 }
module.exports=EditorScreen;
