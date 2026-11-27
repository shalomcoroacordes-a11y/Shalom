const {createStyles}=require("./design-system");
const palette=require("./palette");
const React=require("react");
const {useState}=React;
const {View,Text,Pressable,Alert,StyleSheet}=require("react-native");
const {summaryOf}=require("./personal-backup-core");
const h=React.createElement;
const G=palette.green,T=palette.text,M=palette.muted;
const text=(value,style)=>h(Text,{style},String(value||""));
function PersonalBackupScreen({onExport,onPick,onRestore,onBack}){
 const [selection,setSelection]=useState(null);
 const [busy,setBusy]=useState(false);
 async function run(work,errorTitle){
  if(busy)return;
  setBusy(true);
  try{await work();}catch(e){Alert.alert(errorTitle,e.message||"Inténtalo nuevamente.");}
  finally{setBusy(false);}
 }
 async function makeExport(){
  return run(async()=>{
   await onExport();
   Alert.alert("Archivo preparado","Elige dónde conservar el respaldo desde el menú de compartir. SHALOM no lo subió a Supabase.");
  },"No se pudo crear el respaldo");
 }
 async function choose(){
  return run(async()=>{
   const parsed=await onPick();
   if(parsed)setSelection(parsed);
  },"No se pudo abrir el respaldo");
 }
 function confirm(){
  if(!selection||busy)return;
  const stats=summaryOf(selection);
  Alert.alert("¿Reemplazar tus datos personales?",
   "Se reemplazarán tu perfil, favoritos, misas, popurrís y colecciones actuales por los del archivo.\n\n"+
   stats.collections+" colecciones · "+stats.favorites+" favoritos · "+stats.images+" fotografías\n\n"+
   "Esto NO modifica los cantos oficiales ni Supabase. Si tienes datos nuevos, exporta antes un respaldo.",[
    {text:"Cancelar",style:"cancel"},
    {text:"Restaurar datos",style:"destructive",onPress:()=>run(async()=>{
     await onRestore(selection);
     setSelection(null);
     Alert.alert("Restauración completada","Tus datos personales y fotografías ya están guardados en este teléfono.");
    },"No se pudo restaurar")}
   ]);
 }
 const button=(label,onPress,secondary=false,disabled=false)=>h(Pressable,{
  accessibilityRole:"button",accessibilityLabel:label,onPress,disabled:disabled||busy,
  style:[S.button,secondary&&S.buttonSecondary,(disabled||busy)&&{opacity:.42}]},
  text(label,[S.buttonText,secondary&&S.buttonSecondaryText]));
 return h(View,{style:S.page},
  text("Respaldo y restauración",S.title),
  text("Cuida tus colecciones y fotografías personales cuando cambies de teléfono.",S.subtitle),
  h(View,{style:S.card},
   h(View,{style:S.line},text("↗",S.icon),text("Crear respaldo",S.heading)),
   text("Incluye perfil, foto, portada, banner de Inicio, Mis me gusta, misas, popurrís, repertorios personales y colecciones.",S.desc),
   text("El respaldo se genera sin internet. Tú eliges dónde guardar o compartir el archivo .shalom.json.",S.hint),
   button(busy?"Preparando…":"Exportar mis datos",makeExport)),
  h(View,{style:S.card},
   h(View,{style:S.line},text("↓",S.icon),text("Restaurar respaldo",S.heading)),
   text("Selecciona un respaldo creado por SHALOM en este u otro teléfono. Podrás revisar su contenido antes de reemplazar tus datos.",S.desc),
   button("Seleccionar archivo",choose,true),
   selection?h(View,{style:S.preview},
    text("Respaldo reconocido",S.previewTitle),
    text("Fecha: "+(selection.createdAt||"No disponible").slice(0,10),S.hint),
    ...Object.entries(summaryOf(selection)).map(([key,count])=>h(View,{key,style:S.summaryRow},
     text(({favorites:"Mis me gusta",collections:"Colecciones",misas:"Misas",popurris:"Popurrís",
      repertorios:"Repertorios personales",images:"Fotografías"})[key],S.summaryLabel),
     text(String(count),S.summaryNum))),
    button("Restaurar estos datos",confirm,false),
    button("Cancelar importación",()=>setSelection(null),true)):null),
  h(View,{style:S.privacy},
   text("🔒  Tus fotografías y datos permanecen en el teléfono hasta que tú elijas compartir el archivo.",S.privacyText),
   text("El archivo no está cifrado. Guárdalo en un lugar privado y no lo compartas con desconocidos.",S.privacyText),
   text("Los cantos oficiales no se incluyen; en otro teléfono se descargan desde la biblioteca de SHALOM.",S.privacyText)),
  button("← Regresar",onBack,true));
}
const S=createStyles(StyleSheet,{
 page:{gap:13,paddingBottom:22},
 title:{fontSize:23,fontWeight:"900",color:T},
 subtitle:{fontSize:12,color:M,lineHeight:18,marginBottom:2},
 card:{gap:12,padding:14,backgroundColor:palette.panel,borderRadius:16,borderWidth:1,borderColor:palette.border},
 line:{flexDirection:"row",alignItems:"center",gap:11},
 icon:{fontSize:25,color:G,fontWeight:"900"},
 heading:{fontSize:17,color:T,fontWeight:"900"},
 desc:{fontSize:13,color:T,lineHeight:19},
 hint:{fontSize:11,color:M,lineHeight:17},
 button:{borderRadius:11,paddingHorizontal:16,paddingVertical:12,minHeight:44,
  backgroundColor:G,alignItems:"center",justifyContent:"center"},
 buttonText:{fontSize:13,color:palette.bg,fontWeight:"850"},
 buttonSecondary:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border},
 buttonSecondaryText:{color:T},
 preview:{gap:9,padding:12,borderRadius:12,backgroundColor:palette.panel},
 previewTitle:{fontSize:14,fontWeight:"800",color:G},
 summaryRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10},
 summaryLabel:{fontSize:12,color:M},
 summaryNum:{fontSize:13,fontWeight:"850",color:T},
 privacy:{borderWidth:1,borderColor:palette.border,borderRadius:12,padding:13,gap:7},
 privacyText:{fontSize:11,color:M,lineHeight:17}
});
module.exports=PersonalBackupScreen;