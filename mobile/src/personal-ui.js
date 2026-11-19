const React=require("react");
const {useState}=React;
const {View,Text,TextInput,Pressable,ScrollView,Share,Alert,StyleSheet}=require("react-native");
const {COLORS,MOMENTS,newCollection,newEntry,newPart,songSections,resolvePart,exportCode,importCode}=require("./personal-collections");
const {transposeOne}=require("./chords");
const h=React.createElement;
const theme={bg:"#0e1219",panel:"#19222d",sub:"#232d39",border:"#354650",text:"#f4f7f7",muted:"#b0c0c7",green:"#27c98b",pale:"#b5ffe0"};
const label=(str,style)=>h(Text,{style:style||styles.text},String(str==null?"":str));
function action(title,onPress,secondary=false,disabled=false){
 return h(Pressable,{onPress,disabled,accessibilityRole:"button",accessibilityLabel:title,
  style:[styles.action,secondary&&styles.actionSecondary,disabled&&{opacity:0.45}]},
  label(title,[styles.actionText,secondary&&styles.actionTextSecondary]));
}
function chip(title,selected,onPress){
 return h(Pressable,{key:title,onPress,accessibilityRole:"button",accessibilityState:{selected},
  style:[styles.chip,selected&&styles.chipActive]},
  label(title,[styles.chipText,selected&&styles.chipTextActive]));
}
function input(value,setValue,placeholder,multiline=false){
 return h(TextInput,{value,onChangeText:setValue,placeholder,placeholderTextColor:theme.muted,
  style:[styles.input,multiline&&styles.multiInput],multiline,maxLength:multiline?19000:120,
  textAlignVertical:multiline?"top":"center",autoCorrect:false});
}
function modify(store,folderId,entryId,apply){
 const collections=store.collections.map(folder=>{
  if(folder.id!==folderId)return folder;
  if(!entryId)return apply(folder);
  return {...folder,entries:folder.entries.map(entry=>entry.id===entryId?apply(entry):entry)};
 });
 return {...store,collections};
}
function PersonalCollectionsScreen({store,onChange,songs,renderScore,onSelectSong}){
 const [folderId,setFolderId]=useState(null);
 const [entryId,setEntryId]=useState(null);
 const [view,setView]=useState("folders");
 const [newFolderName,setNewFolderName]=useState("");
 const [newColor,setNewColor]=useState(COLORS[0]);
 const [showFolderForm,setShowFolderForm]=useState(false);
 const [nameDraft,setNameDraft]=useState("");
 const [search,setSearch]=useState("");
 const [adding,setAdding]=useState(false);
 const [shareOpen,setShareOpen]=useState(false);
 const [shareInput,setShareInput]=useState("");
 const [readerShift,setReaderShift]=useState(0);
 const [readerFont,setReaderFont]=useState(16);
 const folder=store.collections.find(c=>c.id===folderId);
 const entry=folder?.entries.find(e=>e.id===entryId);
 const catalog=new Map(songs.map(song=>[String(song.id),song]));
 const commit=next=>onChange(next);
 const updateFolder=fn=>commit(modify(store,folderId,null,fn));
 const updateEntry=fn=>commit(modify(store,folderId,entryId,fn));
 function back(){
  if(view==="reading"){setView("editing");return;}
  if(view==="editing"){setEntryId(null);setSearch("");setAdding(false);setView("folder");return;}
  if(view==="folder"){setFolderId(null);setView("folders");return;}
  setShareOpen(false);
 }
 function createFolder(){
  try{
   if(store.collections.length>=100)throw new Error("Se alcanzó el máximo de colecciones.");
   const collection=newCollection(newFolderName,newColor);
   commit({...store,collections:[...store.collections,collection]});
   setNewFolderName("");setShowFolderForm(false);setFolderId(collection.id);setView("folder");
  }catch(e){Alert.alert("No se creó la colección",e.message);}
 }
 function createEntry(kind){
  if(!folder)return;
  if(folder.entries.length>=100)return Alert.alert("Límite","Esta colección ya tiene 100 composiciones.");
  const item=newEntry(kind,kind==="misa"?"Mi misa":"Mi popurrí");
  updateFolder(c=>({...c,entries:[...c.entries,item]}));
  setEntryId(item.id);setNameDraft(item.title);setSearch("");setAdding(true);setView("editing");
 }
 function editEntry(item){
  setEntryId(item.id);setNameDraft(item.title);setView("editing");setSearch("");setAdding(false);
 }
 function saveTitle(){
  const value=nameDraft.trim();
  if(!value)return Alert.alert("Nombre obligatorio","Escribe un nombre para guardar.");
  updateEntry(e=>({...e,title:value.slice(0,120)}));
  Alert.alert("Guardado","El nombre se guardó únicamente en este teléfono.");
 }
 function changePart(id,fn){updateEntry(e=>({...e,parts:e.parts.map(p=>p.id===id?fn(p):p)}));}
 function movePart(index,delta){
  const other=index+delta;
  if(!entry||other<0||other>=entry.parts.length)return;
  updateEntry(e=>{
   const parts=e.parts.slice();
   [parts[index],parts[other]]=[parts[other],parts[index]];
   return {...e,parts};
  });
 }
 function addSong(song){
  if(!entry)return;
  if(entry.parts.length>=30)return Alert.alert("Límite","El máximo es 30 fragmentos.");
  const part=newPart(song.id);
  updateEntry(e=>({...e,parts:[...e.parts,part]}));
  setSearch("");setAdding(false);
 }
 function deleteEntry(item){
  Alert.alert("Eliminar composición","Se borrará solamente de este teléfono. No modifica ningún canto oficial.",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:()=>{
    updateFolder(f=>({...f,entries:f.entries.filter(e=>e.id!==item.id)}));
    if(entryId===item.id){setEntryId(null);setView("folder");}
   }}
  ]);
 }
 function deleteFolder(){
  Alert.alert("Eliminar colección","También se borrarán sus misas y popurrís locales. No afecta a Supabase.",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:()=>{
    commit({...store,collections:store.collections.filter(c=>c.id!==folderId)});
    setFolderId(null);setEntryId(null);setView("folders");
   }}
  ]);
 }
 async function shareEntry(item){
  try{
   const code=exportCode(item);
   await Share.share({title:"SHALOM · "+item.title,
    message:"🕊️ SHALOM · "+(item.kind==="misa"?"Misa":"Popurrí")+
     "\n"+item.title+"\n\n"+code+
     "\n\nPara usarlo: abre SHALOM > Mis colecciones > Importar código, pega este mensaje y guarda. No necesitas descargar archivos."});
  }catch(e){Alert.alert("No se pudo compartir",e.message||"Inténtalo de nuevo.");}
 }
 function pasteImport(){
  try{
   const imported=importCode(shareInput);
   const unavailable=[...new Set(imported.parts.map(p=>p.songId))].filter(id=>!catalog.has(id)).length;
   const targetFolder=folder||store.collections.find(c=>c.name==="Recibidos");
   const newTarget=targetFolder||newCollection("Recibidos");
   if(newTarget.entries.length>=100)throw new Error("Esta colección ya tiene 100 composiciones.");
   Alert.alert("Importar "+(imported.kind==="misa"?"misa":"popurrí"),
    imported.title+"\n"+imported.parts.length+" fragmentos.\n"+
    (unavailable?"Hay "+unavailable+" cantos que no están descargados. Podrás revisar esos fragmentos al actualizar la biblioteca.":"Todos los cantos están en tu biblioteca local.")+
    "\nSe guardará solo en tu teléfono.",[
    {text:"Cancelar",style:"cancel"},
    {text:"Guardar",onPress:()=>{
     const collections=store.collections.some(c=>c.id===newTarget.id)?
      store.collections.map(c=>c.id===newTarget.id?{...c,entries:[...c.entries,imported]}:c):
      [...store.collections,{...newTarget,entries:[imported]}];
     commit({...store,collections});
     setFolderId(newTarget.id);setEntryId(imported.id);setNameDraft(imported.title);
     setShareInput("");setShareOpen(false);setView("editing");
    }}
   ]);
  }catch(e){Alert.alert("Código no reconocido",e.message||"Revisa el mensaje recibido.");}
 }
 function importPanel(){
  if(!shareOpen)return null;
  return h(View,{style:styles.card},
   label("Importar código de SHALOM",styles.cardTitle),
   label("Pega aquí el texto recibido por WhatsApp. No se enviará a internet.",styles.description),
   input(shareInput,setShareInput,"Pega el código SHALOM1-…",true),
   h(View,{style:styles.actions},action("Guardar en mis colecciones",pasteImport),
    action("Cancelar",()=>{setShareOpen(false);setShareInput("")},true)));
 }
 function foldersView(){
  return h(View,{style:styles.container},
   label("Mis colecciones",styles.pageTitle),
   label("Carpetas privadas con misas y popurrís. Se guardan únicamente en este celular.",styles.description),
   h(View,{style:styles.actions},action("+ Nueva colección",()=>setShowFolderForm(v=>!v)),
    action("Importar código",()=>setShareOpen(v=>!v),true)),
   importPanel(),
   showFolderForm?h(View,{style:styles.card},
    label("Nombre de tu colección",styles.cardTitle),
    input(newFolderName,setNewFolderName,"Ej. Cantos para misa"),
    label("Color de la colección",styles.description),
    h(View,{style:styles.colors},...COLORS.map(color=>h(Pressable,{
     key:color,onPress:()=>setNewColor(color),accessibilityRole:"button",
     accessibilityLabel:"Elegir color "+color,style:[styles.color,{backgroundColor:color},newColor===color&&styles.colorActive]},
     newColor===color?label("✓",styles.colorCheck):null))),
    action("Crear colección",createFolder)):null,
   ...store.collections.map(c=>h(Pressable,{key:c.id,onPress:()=>{
    setFolderId(c.id);setView("folder");setShareOpen(false);
   },accessibilityRole:"button",style:[styles.folderCard,{borderLeftColor:c.color}]},
    label("▣",styles.folderIcon),
    h(View,{style:{flex:1}},label(c.name,styles.cardTitle),
     label(c.entries.length+" "+(c.entries.length===1?"composición":"composiciones"),styles.meta)),
    label("›",styles.arrow))),
   !store.collections.length?label("Crea tu primera carpeta para organizar misas y popurrís propios.",styles.empty):null);
 }
 function folderView(){
  if(!folder)return foldersView();
  return h(View,{style:styles.container},
   action("← Mis colecciones",back,true),
   h(View,{style:[styles.folderHeader,{borderLeftColor:folder.color}]},
    label(folder.name,styles.pageTitle),
    label("Solo en este teléfono · "+folder.entries.length+" composiciones",styles.description)),
   h(View,{style:styles.actions},
    action("+ Misa",()=>createEntry("misa")),
    action("+ Popurrí",()=>createEntry("popurri")),
    action("Importar",()=>setShareOpen(v=>!v),true)),
   importPanel(),
   ...folder.entries.map(item=>h(View,{key:item.id,style:styles.card},
    label(item.kind==="misa"?"⛪ MISA PERSONAL":"♫ POPURRÍ PERSONAL",styles.tag),
    label(item.title,styles.cardTitle),
    label(item.parts.length+" fragmentos · Lectura continua",styles.meta),
    h(View,{style:styles.actions},
     action("Abrir",()=>{setEntryId(item.id);setView("reading");setReaderShift(0)},false,item.parts.length===0),
     action("Editar",()=>editEntry(item),true),
     action("Compartir",()=>shareEntry(item),true,item.parts.length===0)),
    action("Eliminar",()=>deleteEntry(item),true))),
   !folder.entries.length?label("Aquí aparecerán tus misas y popurrís. Crea uno o importa un código recibido.",styles.empty):null,
   h(View,{style:styles.colors},
    ...COLORS.map(color=>h(Pressable,{key:color,onPress:()=>updateFolder(f=>({...f,color})),
     style:[styles.color,{backgroundColor:color},folder.color===color&&styles.colorActive],
     accessibilityRole:"button",accessibilityLabel:"Cambiar el color de la colección"},folder.color===color?label("✓",styles.colorCheck):null))),
   action("Eliminar esta colección",deleteFolder,true));
 }
 function editView(){
  if(!folder||!entry)return folderView();
  const results=search.trim()?songs.filter(s=>
   (String(s.title||"")+" "+(s._artists||[]).map(a=>a.name).join(" ")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(
    search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase())).slice(0,24):songs.slice(0,24);
  return h(View,{style:styles.container},
   action("← "+folder.name,back,true),
   label(entry.kind==="misa"?"Editar misa personal":"Editar popurrí personal",styles.pageTitle),
   label("Solo utiliza cantos publicados. Puedes repetir un canto y elegir una estrofa distinta cada vez.",styles.description),
   input(nameDraft,setNameDraft,"Nombre de la misa o popurrí"),
   action("Guardar nombre",saveTitle,true),
   label(entry.parts.length+" fragmentos en orden",styles.cardTitle),
   ...entry.parts.map((p,index)=>{
    const song=catalog.get(p.songId);
    const sections=song?songSections(song.lyrics):[];
    return h(View,{key:p.id,style:styles.card},
     h(View,{style:styles.partHead},
      h(View,{style:styles.number},label(String(index+1),styles.numberText)),
      h(View,{style:{flex:1}},label(song?.title||"Canto pendiente de descargar",styles.cardTitle),
       label(p.sectionIndex===null?"Canto completo":p.sectionTitle||"Estrofa "+(p.sectionIndex+1),styles.meta))),
     label("Fragmento a interpretar",styles.inputLabel),
     song?h(View,{style:styles.wrap},
      chip("Completo",p.sectionIndex===null,()=>changePart(p.id,x=>({...x,sectionIndex:null,sectionTitle:""}))),
      ...sections.map(s=>chip(s.title+" #"+(s.index+1),p.sectionIndex===s.index,
       ()=>changePart(p.id,x=>({...x,sectionIndex:s.index,sectionTitle:s.title}))))):
      label("Actualiza el cancionero para poder elegir sus estrofas.",styles.warning),
     entry.kind==="misa"?h(View,null,label("Momento de la celebración",styles.inputLabel),
      h(View,{style:styles.wrap},...MOMENTS.map(m=>chip(m,p.moment===m,()=>changePart(p.id,x=>({...x,moment:m})))))):null,
     h(View,{style:styles.toneRow},
      label("Tono "+(song?.tone?transposeOne(song.tone,p.shift):"sin registro"),styles.meta),
      action("−",()=>changePart(p.id,x=>({...x,shift:Math.max(-11,x.shift-1)})),true,p.shift<=-11),
      label((p.shift>0?"+":"")+p.shift+" st",styles.meta),
      action("+",()=>changePart(p.id,x=>({...x,shift:Math.min(11,x.shift+1)})),true,p.shift>=11)),
     h(View,{style:styles.actions},
      action("↑",()=>movePart(index,-1),true,index===0),
      action("↓",()=>movePart(index,1),true,index===entry.parts.length-1),
      action("Quitar",()=>updateEntry(e=>({...e,parts:e.parts.filter(x=>x.id!==p.id)})),true))
    );
   }),
   action(adding?"Cerrar búsqueda":"+ Agregar canto o fragmento",()=>setAdding(v=>!v),true),
   adding?h(View,{style:styles.card},
    label("Selecciona un canto publicado",styles.cardTitle),
    input(search,setSearch,"Buscar por título o artista"),
    !songs.length?label("Descarga primero el cancionero de SHALOM.",styles.warning):null,
    ...results.map(song=>h(Pressable,{key:song.id,onPress:()=>addSong(song),style:styles.result,
     accessibilityRole:"button",accessibilityLabel:"Agregar "+song.title},
      label(song.title,styles.resultTitle),label("＋",styles.arrow)))):null,
   h(View,{style:styles.actions},
    action("Leer completo",()=>{setView("reading");setReaderShift(0)},false,!entry.parts.length),
    action("Compartir código",()=>shareEntry(entry),true,!entry.parts.length)));
 }
 function readingView(){
  if(!folder||!entry)return folderView();
  return h(View,{style:styles.container},
   action("← Editar "+(entry.kind==="misa"?"misa":"popurrí"),back,true),
   label(entry.title,styles.pageTitle),
   label((entry.kind==="misa"?"Misa":"Popurrí")+" personal · "+entry.parts.length+" fragmentos · Sin internet",styles.description),
   h(View,{style:styles.toneRow},
    action("T−",()=>setReaderShift(v=>Math.max(-11,v-1)),true,readerShift<=-11),
    label(readerShift===0?"Tono original":(readerShift>0?"+":"")+readerShift+" semitonos",styles.meta),
    action("T+",()=>setReaderShift(v=>Math.min(11,v+1)),true,readerShift>=11),
    action("A−",()=>setReaderFont(v=>Math.max(13,v-1)),true,readerFont<=13),
    action("A+",()=>setReaderFont(v=>Math.min(22,v+1)),true,readerFont>=22)),
   ...entry.parts.map((p,index)=>{
    const song=catalog.get(p.songId),resolved=resolvePart(song,p);
    return h(View,{key:p.id,style:styles.readerPart},
     h(View,{style:styles.partHead},
      h(View,{style:styles.number},label(String(index+1),styles.numberText)),
      h(View,{style:{flex:1}},entry.kind==="misa"&&p.moment?label(p.moment,styles.tag):null,
       label(song?.title||"Canto no disponible",styles.cardTitle),
       label((resolved.section||p.sectionTitle||"")+
        (song?.tone?" · Tono "+transposeOne(song.tone,p.shift+readerShift):""),styles.meta))),
     resolved.lyrics===null?label(resolved.error,styles.warning):
      resolved.lyrics?renderScore(resolved.lyrics,p.shift+readerShift,"local-"+p.id,readerFont):
       label("Este canto no tiene letra descargada.",styles.warning),
     song?action("Ver canto original",()=>onSelectSong(song),true):null);
   }),
   action("Compartir código",()=>shareEntry(entry),true));
 }
 if(view==="reading")return readingView();
 if(view==="editing")return editView();
 if(view==="folder")return folderView();
 return foldersView();
}
const styles=StyleSheet.create({
 container:{gap:9,paddingVertical:5,paddingBottom:22},
 pageTitle:{fontSize:20,color:theme.text,fontWeight:"900",marginBottom:1},
 text:{fontSize:13,color:theme.text},
 description:{fontSize:12,color:theme.muted,lineHeight:18,marginBottom:6},
 meta:{fontSize:12,color:theme.muted,lineHeight:17,flexShrink:1},
 tag:{fontSize:11,fontWeight:"850",color:theme.green,marginBottom:5},
 cardTitle:{fontSize:16,fontWeight:"850",color:theme.text,lineHeight:22},
 card:{padding:12,borderRadius:13,backgroundColor:theme.panel,borderWidth:1,borderColor:theme.border,gap:10,marginVertical:3},
 folderCard:{padding:12,borderRadius:12,backgroundColor:theme.panel,borderWidth:1,borderColor:theme.border,borderLeftWidth:5,
  flexDirection:"row",alignItems:"center",gap:12,marginVertical:4},
 folderHeader:{padding:13,borderLeftWidth:5,borderColor:theme.border,backgroundColor:theme.panel,borderRadius:12},
 folderIcon:{fontSize:26,color:theme.pale},
 arrow:{fontSize:26,color:theme.green},
 actions:{flexDirection:"row",gap:6,flexWrap:"wrap",alignItems:"center",marginVertical:3},
 action:{backgroundColor:theme.green,borderRadius:10,minHeight:40,paddingHorizontal:12,paddingVertical:8,
  alignItems:"center",justifyContent:"center"},
 actionSecondary:{backgroundColor:theme.sub,borderWidth:1,borderColor:theme.border},
 actionText:{color:"#041b13",fontSize:12,fontWeight:"850",textAlign:"center"},
 actionTextSecondary:{color:theme.text},
 input:{borderColor:theme.border,borderWidth:1,backgroundColor:theme.sub,color:theme.text,
  borderRadius:11,padding:11,minHeight:44,fontSize:14},
 multiInput:{height:120},
 colors:{flexDirection:"row",flexWrap:"wrap",gap:12,marginVertical:10},
 color:{width:34,height:34,borderRadius:20,alignItems:"center",justifyContent:"center"},
 colorActive:{borderWidth:3,borderColor:"#ffffff"},
 colorCheck:{color:"#ffffff",fontWeight:"900",fontSize:17},
 chip:{paddingHorizontal:10,paddingVertical:9,backgroundColor:theme.sub,borderRadius:14,borderWidth:1,borderColor:theme.border,minHeight:37},
 chipActive:{backgroundColor:"#176b51",borderColor:theme.green},
 chipText:{fontSize:12,color:theme.text,fontWeight:"650"},
 chipTextActive:{color:theme.pale,fontWeight:"850"},
 wrap:{flexDirection:"row",flexWrap:"wrap",gap:5,marginVertical:5},
 inputLabel:{color:theme.muted,fontSize:12,fontWeight:"750",marginTop:5},
 partHead:{flexDirection:"row",alignItems:"center",gap:8},
 number:{width:33,height:33,borderRadius:8,backgroundColor:"#106849",alignItems:"center",justifyContent:"center"},
 numberText:{fontSize:17,color:theme.pale,fontWeight:"900"},
 toneRow:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:6,marginVertical:4},
 warning:{fontSize:13,color:"#ffc4bf",lineHeight:20,marginVertical:8},
 empty:{fontSize:13,color:theme.muted,marginVertical:10,lineHeight:20},
 result:{minHeight:41,paddingVertical:8,borderBottomWidth:1,borderColor:theme.border,flexDirection:"row",alignItems:"center",gap:7},
 resultTitle:{flex:1,fontSize:13,color:theme.text},
 readerPart:{paddingTop:15,paddingBottom:15,borderBottomWidth:1,borderColor:theme.border,gap:8}
});
module.exports=PersonalCollectionsScreen;