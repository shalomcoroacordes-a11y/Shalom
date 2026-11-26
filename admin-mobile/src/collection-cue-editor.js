// Local collection lyric indications. No access to catalog writers or network.
const React=require("react");
const {View,Text,Pressable,TextInput}=require("react-native");
const {parseSong}=require("./chords"),core=require("./studio-core"),codec=require("./studio-codec"),ReaderCues=require("./studio-reader-cues");
const h=React.createElement;
function CollectionCueEditor({lyrics,initial,onSave,styles,official=false}){
 const rows=parseSong(lyrics||"",0);
 const [mode,setMode]=React.useState(initial?.mode||"inherit");
 const [cues,setCues]=React.useState(()=>initial?codec.decodeLyricCues({v:1,k:"lyrics",j:initial.j}):[]);
 const [start,setStart]=React.useState(null),[end,setEnd]=React.useState(null);
 const [action,setAction]=React.useState("note"),[audience,setAudience]=React.useState("all"),[detail,setDetail]=React.useState("");
 const [editing,setEditing]=React.useState(null),[error,setError]=React.useState("");
 const text=(v,s=styles.actionTitle)=>h(Text,{style:s},v);
 const cueText=c=>{const look=core.cueAppearance(c.action);return h(Text,{accessibilityLabel:core.cueText(c),style:[styles.actionTitle,{color:look.dark,fontStyle:"italic"}]},look.symbol+" "+core.cueText(c));};
 const button=(title,fn,selected=false)=>h(Pressable,{style:[styles.createButton,selected&&{borderWidth:2,borderColor:"#b5ffe0"}],onPress:fn,accessibilityRole:"button",accessibilityState:{selected}},text(title,styles.createLabel));
 const reset=()=>{setStart(null);setEnd(null);setEditing(null);setDetail("");setError("");};
 function select(i){if(start===null||end!==null){setStart(i);setEnd(null);}else{setStart(Math.min(start,i));setEnd(Math.max(start,i));}}
 function add(){
  try{
   if(start===null)throw Error("Selecciona al menos una frase.");
   const cue={...core.lyricCueAnchor(rows,start,end??start),action,audience,text:detail};
   const updated=core.normalizeLyricCues(editing===null?[...cues,cue]:cues.map((c,i)=>i===editing?cue:c));
   setCues(updated);reset();
  }catch(e){setError(e.message);}
 }
 function save(){
  try{
   if(mode!=="inherit"&&mode!=="hide"&&(start!==null||editing!==null))throw Error("Agrega o cancela la indicación que estás editando.");
   if(mode!=="inherit"&&mode!=="hide"&&cues.some(c=>!core.validLyricCue(rows,c)))throw Error("Hay indicaciones con frases desactualizadas. Edítalas o quítalas.");
   const next=ReaderCues.validateOverride(rows,mode==="inherit"?null:{v:1,mode,j:codec.encodeLyricCues(mode==="hide"?[]:cues).j});
   onSave(next);
  }catch(e){setError(e.message);}
 }
 return h(View,{style:{gap:8}},
  text("Indicaciones de este canto",styles.sectionTitle),
  text(official?"Los cambios se aplican a esta aparición en la colección oficial al guardarla. El canto original no se modifica.":"Los cambios se aplican solo a esta aparición en tu colección.",styles.hint),
  ...[["inherit","Usar originales"],["append","Agregar propias"],["replace","Reemplazar"],["hide","Ocultar"]].map(([id,title])=>h(View,{key:id},button(title,()=>{setMode(id);reset()},mode===id))),
  mode==="append"||mode==="replace"?h(View,{style:{gap:6}},
   text("Toca una frase o dos para seleccionar un fragmento.",styles.hint),
   ...rows.map((r,i)=>{
    const phrase=r.kind==="chords"?r.lyricLine:r.kind==="lyric"?r.text:"";
    const selected=start!==null&&i>=start&&i<=(end??start);
    return h(View,{key:String(i),style:{gap:3}},
     r.kind==="section"?text(r.text,styles.sectionTitle):null,
     phrase.trim()?h(Pressable,{style:[styles.action,selected&&{backgroundColor:"#145a43"}],accessibilityRole:"button",accessibilityState:{selected},onPress:()=>select(i)},text(phrase)):null,
     ...cues.flatMap((c,k)=>c.end===i&&core.validLyricCue(rows,c)?[h(View,{key:"cue-"+k},cueText(c))]:[]));
   }),
   text("Acción",styles.hint),
   h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:5}},...Object.entries(core.cueActions).map(([id,title])=>h(View,{key:id},button(title,()=>setAction(id),action===id)))),
   text("Para quién",styles.hint),
   h(View,{style:{flexDirection:"row",flexWrap:"wrap",gap:5}},...Object.entries(core.cueAudiences).map(([id,title])=>h(View,{key:id},button(title,()=>setAudience(id),audience===id)))),
   h(TextInput,{value:detail,onChangeText:setDetail,maxLength:160,placeholder:"Detalle de la indicación",placeholderTextColor:"#b4c5c9",style:styles.input,accessibilityLabel:"Detalle de la indicación"}),
   button(editing===null?"+ Agregar indicación":"Actualizar indicación",add),
   start!==null?button("Cancelar selección",reset):null,
   ...cues.map((c,i)=>h(View,{key:"saved-"+i,style:{gap:4}},
    !core.validLyricCue(rows,c)?text("Revisar frase",styles.hint):null,cueText(c),
    button("Editar indicación "+(i+1),()=>{setEditing(i);setStart(core.validLyricCue(rows,c)?c.start:null);setEnd(core.validLyricCue(rows,c)?c.end:null);setAction(c.action);setAudience(c.audience);setDetail(c.text);}),
    button("Quitar indicación "+(i+1),()=>{setCues(v=>v.filter((_,k)=>k!==i));reset();})))
  ):null,
  error?text(error,{color:"#ffc4bf"}):null,
  button("Guardar indicaciones",save));
}
module.exports=CollectionCueEditor;
