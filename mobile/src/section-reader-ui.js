const {createElement:h,useState}=require("react");
const {View,Text,Pressable,useWindowDimensions}=require("react-native");
const AlignedScore=require("./aligned-score-ui");
const {sectionsOf,moveIndex,navigation}=require("./section-reader-core");
const {clampReaderFont}=require("./score-zoom");
function SectionReader({rows,sectionIndex,setSectionIndex,fitMode,setFitMode,fontSize,fitFont,onFitFont,onManualFont,immersiveActive,S,onPreviousEntry,onNextEntry}){
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
   button(index===0&&onPreviousEntry?"‹ Canto anterior":"‹ Anterior",false,()=>index===0&&onPreviousEntry?onPreviousEntry():change(-1),index===0&&!onPreviousEntry),
   button(index===sections.length-1&&onNextEntry?"Siguiente canto ›":"Siguiente ›",false,()=>index===sections.length-1&&onNextEntry?onNextEntry():change(1),index===sections.length-1&&!onNextEntry)));
}
// Per-reader local state, indexed by occurrence, not by song id.
function useCollectionSections(entries,fontSize){
 const [enabled,setEnabled]=useState(false);
 const [position,setPosition]=useState(0);
 const [fitMode,setFitMode]=useState("auto");
 const [fitFont,setFitFont]=useState(fontSize);
 const sequence=enabled?navigation(entries):[];
 const at=moveIndex(position,0,sequence.length),current=sequence[at];
 function selectEntry(i){const next=sequence.findIndex(s=>s.entryIndex===i);if(next>=0)setPosition(next);}
 function selectSection(i){const next=sequence.findIndex(s=>s.entryIndex===current?.entryIndex&&s.sectionIndex===i);if(next>=0)setPosition(next);}
 function manualFont(value){setFitFont(clampReaderFont(value));setFitMode("manual");}
 return {enabled,setEnabled,reset:()=>{setEnabled(false);setPosition(0);setFitMode("auto");setFitFont(fontSize);},current,entries,selectEntry,selectSection,fitMode,setFitMode,fitFont,setFitFont,manualFont,
  onPreviousEntry:at>0?()=>setPosition(at-1):null,onNextEntry:at<sequence.length-1?()=>setPosition(at+1):null};
}
function CollectionSectionControls({nav}){
 const [expanded,setExpanded]=useState(false);
 const button=(text,onPress,selected=false)=>h(Pressable,{onPress,accessibilityRole:"button",accessibilityState:{selected},style:{padding:10,borderRadius:8,backgroundColor:selected?"#174b35":"#20262e"}},h(Text,{style:{color:selected?"#83e4b2":"#e1e6e8"}},text));
 return h(View,{style:{gap:6}},
  button(nav.enabled?"Lectura normal":"Lectura por secciones",()=>{nav.setEnabled(v=>!v);setExpanded(false)},nav.enabled),
  nav.enabled&&nav.current?button("Canto "+(nav.current.entryIndex+1)+" de "+nav.entries.length+" · "+nav.entries[nav.current.entryIndex].title+" ▾",()=>setExpanded(v=>!v)):null,
  nav.enabled&&expanded?h(View,{style:{gap:4}},...nav.entries.map((entry,i)=>h(View,{key:i},button((i+1)+". "+entry.title,()=>{nav.selectEntry(i);setExpanded(false)},i===nav.current?.entryIndex)))):null);
}
function CollectionSectionScore({nav,fontSize,immersiveActive,S}){
 if(!nav.current)return null;
 return h(SectionReader,{rows:nav.entries[nav.current.entryIndex].rows,sectionIndex:nav.current.sectionIndex,setSectionIndex:nav.selectSection,fitMode:nav.fitMode,setFitMode:nav.setFitMode,fontSize,fitFont:nav.fitFont,onFitFont:nav.setFitFont,onManualFont:nav.manualFont,immersiveActive,S,onPreviousEntry:nav.onPreviousEntry,onNextEntry:nav.onNextEntry});
}
module.exports=SectionReader;
module.exports.useCollectionSections=useCollectionSections;
module.exports.CollectionSectionControls=CollectionSectionControls;
module.exports.CollectionSectionScore=CollectionSectionScore;
