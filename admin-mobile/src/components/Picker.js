"use strict";
const React=require("react");
const {useMemo,useState}=React;
const {View,Text,TextInput,Pressable,ScrollView,Alert}=require("react-native");
const {S,C}=require("../styles");
const {filterChoices}=require("../selector");
const h=React.createElement;
function label(value,style){return h(Text,{style,numberOfLines:1},String(value));}
function Picker({title,options,value,onChange,multiple=false,maxSelected=0,placeholder="Buscar...",noneLabel="Ninguno",hint=""}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[page,setPage]=useState(1);
 const all=Array.isArray(options)?options:[];
 const selected=multiple?(Array.isArray(value)?value:[]):[value||""];
 const selectedNames=selected.filter(Boolean).map(id=>all.find(x=>x[0]===id)?.[1]||"Elemento no disponible");
 const filtered=useMemo(()=>filterChoices(all,query),[all,query]);
 const visible=filtered.slice(0,page*8);
 const summary=multiple?(selectedNames.length?selectedNames.length+" seleccionado(s)":"Seleccionar "+title.toLowerCase()):selectedNames[0]||noneLabel;
 function select(id){
  if(!multiple){onChange(id);setOpen(false);setQuery("");setPage(1);return;}
  const next=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];
  if(maxSelected && next.length>maxSelected){Alert.alert("Límite alcanzado","Puedes seleccionar máximo "+maxSelected+".");return;}
  onChange(next);
 }
 return h(View,{style:{gap:8}},
  label(title,S.label),
  h(Pressable,{accessibilityRole:"button",accessibilityLabel:"Elegir "+title,onPress:()=>{setOpen(v=>!v);setQuery("");setPage(1);},style:S.selectorTrigger},
   h(View,{style:{flex:1,gap:3}},label(summary,{color:C.text,fontSize:14,fontWeight:"600"}),
    !!hint&&label(hint,S.caption)),
   label(open?"⌃":"⌄",{color:C.green,fontSize:23})),
  !!selectedNames.length && multiple && h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:7}},
   selected.filter(Boolean).map(id=>{
    const name=all.find(x=>x[0]===id)?.[1]||"No disponible";
    return h(Pressable,{key:id,onPress:()=>select(id),style:S.pickerSelected,accessibilityLabel:"Quitar "+name},
     label(name+"  ×",{color:C.text,fontSize:12}));
   })),
  open&&h(View,{style:S.pickerPanel},
   h(TextInput,{style:S.selectorSearch,value:query,onChangeText:t=>{setQuery(t);setPage(1);},placeholder,placeholderTextColor:C.muted,autoCapitalize:"none",autoCorrect:false}),
   !multiple&&h(Pressable,{style:S.pickerRow,onPress:()=>select("")},label((selected[0]?"○  ":"✓  ")+noneLabel,{color:C.text,fontSize:13})),
   h(ScrollView,{nestedScrollEnabled:true,keyboardShouldPersistTaps:"always",style:{maxHeight:280},showsVerticalScrollIndicator:true},
    visible.map(([id,name])=>h(Pressable,{key:id,onPress:()=>select(id),style:S.pickerRow,accessibilityRole:"checkbox",accessibilityState:{checked:selected.includes(id)}},
     label(selected.includes(id)?"✓":"○",{color:selected.includes(id)?C.green:C.muted,fontSize:17}),
     h(View,{style:{flex:1}},label(name,{color:C.text,fontSize:13})))),
    !visible.length&&h(View,{style:{padding:12}},label("Sin resultados. Busca con otro nombre.",S.note)),
    filtered.length>visible.length&&h(Pressable,{style:S.pickerRow,onPress:()=>setPage(n=>n+1)},
     label("Mostrar más · "+(filtered.length-visible.length)+" restantes",{color:C.green,fontSize:12}))),
   h(Pressable,{accessibilityRole:"button",style:{alignItems:"center",padding:10},onPress:()=>setOpen(false)},
    label("Listo",{color:C.green,fontSize:13,fontWeight:"700"})))
 );
}
module.exports=Picker;
