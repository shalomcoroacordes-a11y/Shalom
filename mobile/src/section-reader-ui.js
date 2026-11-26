const {createElement:h}=require("react");
const {View,Text,Pressable,useWindowDimensions}=require("react-native");
const AlignedScore=require("./aligned-score-ui");
const {sectionsOf,moveIndex}=require("./section-reader-core");
function SectionReader({rows,sectionIndex,setSectionIndex,fitMode,setFitMode,fontSize,fitFont,onFitFont,onManualFont,immersiveActive,S}){
 const {height}=useWindowDimensions();
 const sections=sectionsOf(rows),index=moveIndex(sectionIndex,0,sections.length),current=sections[index];
 // Initial viewport budget for the single-song header. Exact measured viewport is
 // reserved for the shared collection/immersive shell; vertical scrolling remains available.
 const available=Math.max(120,height-(immersiveActive?210:350));
 const button=(text,selected,onPress,disabled=false)=>h(Pressable,{key:text,accessibilityRole:"button",accessibilityState:{selected,disabled},disabled,onPress,style:{paddingVertical:9,paddingHorizontal:12,borderRadius:8,backgroundColor:selected?"#174b35":"#20262e",opacity:disabled?.45:1}},h(Text,{style:{color:selected?"#83e4b2":"#e1e6e8",fontSize:13}},text));
 const change=next=>setSectionIndex(moveIndex(index,next,sections.length));
 return h(View,{style:{gap:10}},
  h(Text,{style:S.songReaderHint},"Estructura del canto"),
  h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:6}},...sections.map((section,i)=>h(View,{key:i},button(section.title,i===index,()=>setSectionIndex(i))))),
  h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:6}},
   button("Automático",fitMode==="auto",()=>setFitMode("auto")),
   button("Al ancho",fitMode==="width",()=>setFitMode("width")),
   button("Manual",fitMode==="manual",()=>{onManualFont(fitFont);setFitMode("manual");})),
  h(AlignedScore,{key:"section-"+index,rows:current.rows,fontSize:fitMode==="manual"?fitFont:fontSize,fitMode,fitHeight:available,onFitFont,onFontSizeChange:onManualFont}),
  h(Text,{style:[S.songReaderHint,{textAlign:"center"}]},"Sección "+(index+1)+" de "+sections.length),
  h(View,{style:{flexDirection:"row",justifyContent:"space-between",gap:6}},
   button("‹ Anterior",false,()=>change(-1),index===0),
   button("Siguiente ›",false,()=>change(1),index===sections.length-1)));
}
module.exports=SectionReader;
