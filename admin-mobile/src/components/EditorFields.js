"use strict";
const React=require("react");
const {useState}=React;
const {View,Pressable,Alert}=require("react-native");
const {S,C}=require("../styles");
const {OPTIONS,displayTitle}=require("../model");
const {categoryChoices}=require("../selector");
const {options:collectionCapoOptions}=require("../collection-capo-options");
const Picker=require("./Picker");
const LyricsEditor=require("./LyricsEditor");
const CollectionCueEditor=require("../collection-cue-editor");
const {txt,heading,button,chip,input,wrapChips}=require("./Controls");
const h=React.createElement;
function CompositeEditor({kind,value,onChange,songs,mode,createId}){
 const [query,setQuery]=useState("");
 const [cueIndex,setCueIndex]=useState(null);
 let entries;
 try{entries=JSON.parse(String(value||"[]"));}catch(_){return input("Corrige los datos JSON",value,onChange,{multi:true});}
 if(!Array.isArray(entries))return input("Se requiere una lista JSON",value,onChange,{multi:true});
 const medley=kind==="parts",limit=medley?30:45;
 const save=a=>onChange(JSON.stringify(a,null,2));
 const change=(index,key,value)=>save(entries.map((x,i)=>i===index?{...x,[key]:value}:x));
 const remove=index=>{setCueIndex(null);save(entries.filter((_,i)=>i!==index));};
 const move=(index,delta)=>{
  const to=index+delta;if(to<0||to>=entries.length)return;
  const list=entries.slice();[list[index],list[to]]=[list[to],list[index]];setCueIndex(null);save(list);
 };
 const add=song=>{
  if(entries.length>=limit)return Alert.alert("Límite alcanzado","Máximo "+limit+" cantos.");
  const entry=medley?
   {id:createId(),song_id:song.id,song_title:song.title,title:song.title,tone:song.tone||"",lyrics:song.lyrics||"",shift:0}:
   {song_id:song.id,moment:mode==="misa"?"Entrada":"Ensayo",notes:""};
  setCueIndex(null);save([...entries,entry]);setQuery("");
 };
 const filtered=songs.filter(x=>String(x.title||"").toLowerCase().includes(query.toLowerCase())).slice(0,16);
 function chooseSection(index,label){
  const source=String(songs.find(x=>x.id===entries[index].song_id)?.lyrics||"");
  const labelRx=/^\[([^\]]+)\]\s*$/gm;
  const found=[...source.matchAll(labelRx)];
  const match=found.find(x=>x[1]===label);
  if(!match)return;
  const at=source.indexOf(match[0],match.index);
  const next=found.find(x=>x.index>at);
  change(index,"lyrics",source.slice(at,next?.index??source.length).trim());
 }
 return h(View,{style:{gap:11}},
  txt(medley?"Fragmentos del popurrí ("+entries.length+"/"+limit+")":"Cantos del repertorio ("+entries.length+"/"+limit+")",S.section),
  entries.map((e,i)=>{const lyrics=medley?e.lyrics:songs.find(x=>x.id===e.song_id)?.lyrics;return h(View,{key:(e.id||e.song_id||"item")+"_"+i,style:S.card},
   h(View,{style:S.apart},txt((i+1)+". "+(e.title||e.song_title||songs.find(x=>x.id===e.song_id)?.title||"Canto"),S.itemTitle),
    h(View,{style:S.row},button("↑",()=>move(i,-1),"secondary",i===0),button("↓",()=>move(i,1),"secondary",i===entries.length-1),button("Quitar",()=>remove(i),"danger"))),
   txt("Capo de este canto",S.label),
   wrapChips(collectionCapoOptions(songs.find(x=>x.id===e.song_id),e.capo_id||"none").map(c=>[c.id,c.label]),e.capo_id||"none",id=>change(i,"capo_id",id)),
   medley?
    h(View,{style:{gap:7}},
     input("Nombre del fragmento",e.title||"",v=>change(i,"title",v)),
     input("Transponer (−11 a +11 semitonos)",String(e.shift||0),v=>change(i,"shift",Number(v)||0)),
     i<entries.length-1?input("Studio: pausa al siguiente fragmento (ms, vacío = sin configurar)",String(e.studio_gap_ms??""),v=>change(i,"studio_gap_ms",v.trim()===""?null:Number(v))):null,
     txt("Usar sección del canto original",S.label),
     wrapChips([...String(songs.find(x=>x.id===e.song_id)?.lyrics||"").matchAll(/^\[([^\]]+)\]\s*$/gm)].slice(0,12).map(x=>[x[1],x[1]]),"",section=>chooseSection(i,section)),
     input("Letra y acordes de esta parte",e.lyrics||"",v=>change(i,"lyrics",v),{multi:true})):
    h(View,{style:{gap:7}},
     txt("Momento de la celebración",S.label),
     wrapChips((mode==="misa"?["Entrada","Señor ten piedad","Gloria","Salmo","Aleluya","Ofertorio","Santo","Cordero de Dios","Comunión","Salida"]:["Ensayo","Repaso","Nuevo canto","Inicio","Final"]).map(x=>[x,x]),e.moment||"",v=>change(i,"moment",v)),
     input("Indicaciones para el coro",e.notes||"",v=>change(i,"notes",v))),
   lyrics?button(cueIndex===i?"Cerrar editor de indicaciones":"Editar indicaciones de este canto",()=>setCueIndex(cueIndex===i?null:i),"secondary"):null,
   cueIndex===i&&lyrics?h(CollectionCueEditor,{key:i+"-"+lyrics,lyrics,initial:e.cue_override,official:true,styles:{sectionTitle:S.section,hint:S.note,action:S.item,actionTitle:S.itemTitle,createButton:S.btn,createLabel:S.btnText,input:S.input},onSave:next=>{change(i,"cue_override",next);setCueIndex(null);}}):null
  );}),
  txt("Agregar un canto existente",S.label),
  input("Buscar título",query,setQuery),
  h(View,{style:{gap:4}},filtered.map(song=>h(Pressable,{key:song.id,style:S.item,onPress:()=>add(song)},
   h(View,{style:S.apart},txt(song.title,S.itemTitle),txt("+ Agregar",{color:C.green,fontSize:11,fontWeight:"800"}))))),
  !songs.length&&txt("Primero descarga el catálogo conectado a internet para elegir cantos.",S.note),
  txt("Los cantos originales no se modifican. Puedes reordenar y eliminar fragmentos sin alterar sus fuentes.",S.note)
 );
}
function Field({spec,form,onChange,lists,createId,onOpenCues}){
 const [key,label,kind]=spec,value=form[key];
 const set=v=>onChange(key,v);
 if(OPTIONS[kind])return h(View,{style:{gap:7}},txt(label,S.label),wrapChips(OPTIONS[kind],value,set));
 if(kind==="boolean")return h(View,{style:S.apart},txt(label,S.label),chip(value?"Sí":"No",!!value,()=>set(!value)));
 if(["artist","album","category","artists","categories","featured"].includes(kind)){
  const multiple=["artists","categories","featured"].includes(kind);
  const table=["artist","artists"].includes(kind)?"artists":
              kind==="album"?"albums":
              ["category","categories"].includes(kind)?"categories":"songs";
  const records=lists[table]||[];
  const options=table==="categories"?categoryChoices(records):records.map(x=>[x.id,displayTitle(table,x)]);
  const noneLabel=kind==="album"?"Sin álbum":"Ninguno";
  return h(Picker,{title:label,options,value,onChange:set,multiple,
   maxSelected:kind==="featured"?3:0,noneLabel,
   hint:multiple?"Busca y selecciona sin mostrar toda la lista":"Toca para buscar o cambiar",
   placeholder:"Buscar "+label.toLowerCase()+"..."});
 }
 if(key==="lyrics")return h(LyricsEditor,{value:value||"",onChange:set,onOpenCues});
 if(kind==="links"||kind==="capos")return h(NestedEditor,{kind,value:value||[],onChange:set});
 if(kind==="json"&&["parts","items"].includes(key))return h(CompositeEditor,{kind:key,value:value||"[]",onChange:set,songs:(lists.songs||[]).map(song=>({...song,_capos:(lists.song_capo_versions||[]).filter(c=>c.song_id===song.id)})),mode:form.kind||"misa",createId});
 return input(label,value,set,{multi:kind==="multiline"||kind==="json",email:kind==="url"});
}
function NestedEditor({kind,value,onChange}){
 const [title,setTitle]=useState(""),[url,setUrl]=useState(""),[platform,setPlatform]=useState("YouTube"),[linkType,setLinkType]=useState("Tutorial"),[capoLabel,setCapoLabel]=useState("");
 const [position,setPosition]=useState("2"),[key,setKey]=useState("G");
 function add(){
  if(kind==="links"){
   if(!title.trim()||!/^https:\/\//i.test(url))return Alert.alert("Enlace incompleto","Indica título y URL HTTPS.");
   onChange([...value,{title,platform,link_type:linkType,url,sort_order:value.length}]);setTitle("");setUrl("");
  }else{
   if(!Number(position)||!key.trim())return Alert.alert("Capo incompleto","Indica capo y figuras.");
   onChange([...value,{label:capoLabel.trim()||"Capo "+position+" · "+key,capo_position:Number(position),capo_key:key,sort_order:value.length}]);setCapoLabel("");
  }
 }
 return h(View,{style:{gap:10}},
  heading(kind==="links"?"Tutoriales y enlaces":"Versiones de capo"),
  value.map((x,i)=>h(View,{key:"item"+i,style:S.apart},
    h(View,{style:{flex:1,gap:3}},txt(x.title||x.label,S.itemTitle),txt(x.url||"Capo "+x.capo_position+" / "+x.capo_key,S.itemSub)),
    button("Quitar",()=>onChange(value.filter((_,j)=>j!==i)),"danger"))),
  kind==="links"?
   h(View,{style:{gap:9}},input("Título del enlace",title,setTitle),
    txt("Tipo de enlace",S.label),wrapChips(["Tutorial","Video","Canal","Cover","Acordes"].map(x=>[x,x]),linkType,setLinkType),
    txt("Plataforma",S.label),wrapChips(["YouTube","TikTok","Instagram","Facebook","Spotify","Sitio web"].map(x=>[x,x]),platform,setPlatform),
    input("URL (HTTPS)",url,setUrl)):
   h(View,{style:{gap:9}},input("Nombre de la versión",capoLabel,setCapoLabel),input("Posición del capo (1-12)",position,setPosition),input("Figuras",key,setKey)),
  button(kind==="links"?"+ Agregar enlace":"+ Agregar capo",add,"secondary")
 );
}
module.exports={Field,CompositeEditor,NestedEditor};
