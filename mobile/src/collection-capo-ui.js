// Compact per-song capo chooser shared by official and personal compositions.
const React=require("react"),{View,Text,Pressable}=require("react-native");
const h=React.createElement,palette=require("./palette");
module.exports=function CollectionCapo({selection,onChange,transpose=0}){
 const [open,setOpen]=React.useState(false);
 const {choices,chosen}=selection;
 const label=chosen.id==="none"?"Sin capo":"Capo "+chosen.position;
 const available=choices.length>1;
 return h(View,{style:{alignItems:"flex-start",marginVertical:4}},
  h(Pressable,{accessibilityRole:"button",accessibilityLabel:"Seleccionar capo",accessibilityState:{expanded:open,disabled:!available},disabled:!available,
   onPress:()=>setOpen(v=>!v),style:{paddingVertical:8,paddingHorizontal:2}},
   h(Text,{style:{color:palette.pale,fontSize:12,fontWeight:"600"}},label+(available?" ▾":""))),
  open&&available?h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:7}},
   ...choices.map(c=>h(Pressable,{key:String(c.id),accessibilityRole:"button",accessibilityState:{selected:c.id===chosen.id},
    onPress:()=>{onChange(c.id);setOpen(false)},style:{borderWidth:1,borderColor:c.id===chosen.id?palette.green:palette.border,borderRadius:12,padding:9}},
    h(Text,{style:{color:palette.text,fontSize:12}},c.label+(c.key?" · "+require("./chords").transposeOne(c.key,transpose):""))))):null);
};
