"use strict";
const React=require("react"),h=React.createElement;
const {View,Pressable,Alert}=require("react-native");
const {S,C}=require("../styles");
const {txt,button,input,wrapChips}=require("./Controls");
const R=require("../repertoire-editor-core");
function RepertoireEditor({value,onChange,songs,mode,date}){
 const [query,setQuery]=React.useState(""),[page,setPage]=React.useState(1),[moment,setMoment]=React.useState(""),[expanded,setExpanded]=React.useState(null);
 const rows=R.parseItems(value);
 if(!rows)return h(View,{style:{gap:8}},txt("No se pudo interpretar el repertorio. No se reemplazará por una lista vacía.",S.note),input("Reparar datos del repertorio",typeof value==="string"?value:JSON.stringify(value),onChange,{multi:true}));
 const options=R.moments(mode),chosen=options.includes(moment)?moment:options[0],filtered=R.findSongs(songs,query);
 const save=next=>onChange(JSON.stringify(next,null,2));
 const update=(index,key,value)=>save(rows.map((row,i)=>i===index?{...row,[key]:value}:row));
 const move=(i,delta)=>{save(R.moveItem(rows,i,delta));setExpanded(null);};
 const remove=i=>Alert.alert("Quitar canto","Solo se quitará del repertorio. El canto original se conserva.",[{text:"Cancelar",style:"cancel"},{text:"Quitar",style:"destructive",onPress:()=>{save(rows.filter((_,j)=>j!==i));setExpanded(null);}}]);
 const add=song=>{if(rows.length>=45)return Alert.alert("Límite alcanzado","Máximo 45 cantos.");save([...rows,{song_id:song.id,moment:chosen,notes:""}]);setExpanded(rows.length);setQuery("");setPage(1);};
 return h(View,{style:{gap:12}},
  txt("Orden musical · "+rows.length+"/45",S.section),
  ...R.warnings({kind:mode,event_date:date,items:rows}).map(text=>txt(text,S.note)),
  ...rows.map((item,i)=>{const song=songs.find(s=>String(s.id)===String(item.song_id)),open=expanded===i;return h(View,{key:String(item.song_id)+"-"+i,style:S.repEditorRow},
   h(Pressable,{style:S.apart,onPress:()=>setExpanded(open?null:i),accessibilityRole:"button",accessibilityState:{expanded:open},accessibilityLabel:"Editar canto "+(i+1)},h(View,{style:{flex:1,gap:4}},txt((i+1)+". "+(song?.title||item.title||item.song_title||"Canto no disponible"),S.itemTitle),txt([item.moment,song?.tone?"Tono "+song.tone:""].filter(Boolean).join(" · "),S.itemSub)),txt(open?"⌃":"⌄",{color:C.green,fontSize:20})),
   open?h(View,{style:{gap:8}},txt("Momento",S.label),wrapChips(options.map(x=>[x,x]),R.canonicalMoment(item.moment),v=>update(i,"moment",v)),input("Indicaciones",item.notes||"",v=>update(i,"notes",v)),h(View,{style:S.row},button("↑ Subir",()=>move(i,-1),"secondary",i===0),button("↓ Bajar",()=>move(i,1),"secondary",i===rows.length-1),button("Quitar",()=>remove(i),"danger"))):null);}),
  !rows.length?txt("Agrega los cantos en el orden de la celebración.",S.note):null,
  txt("Agregar canto",S.section),txt("Momento para el siguiente canto",S.label),wrapChips(options.map(x=>[x,x]),chosen,setMoment),
  input("Buscar título o tono",query,v=>{setQuery(v);setPage(1);}),
  ...filtered.slice(0,page*8).map(song=>h(Pressable,{key:String(song.id),style:S.repEditorRow,onPress:()=>add(song),accessibilityRole:"button",accessibilityLabel:"Agregar "+song.title},h(View,{style:S.apart},h(View,{style:{flex:1,gap:3}},txt(song.title,S.itemTitle),txt(song.tone?"Tono "+song.tone:"Canto del catálogo",S.itemSub)),txt("+",{color:C.green,fontSize:22})))),
  filtered.length>page*8?button("Mostrar más cantos",()=>setPage(page+1),"secondary"):null,
  !filtered.length?txt(songs.length?"Sin coincidencias.":"Descarga el catálogo para seleccionar cantos.",S.note):null,
  txt("Se conserva la letra y los acordes de los cantos originales.",S.note));
}
module.exports=RepertoireEditor;
