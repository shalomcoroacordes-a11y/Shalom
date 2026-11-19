const React=require("react");
const {useState}=React;
const {View,Text,TextInput,Pressable,ScrollView,Share,Alert,StyleSheet}=require("react-native");
const {CoverArt,CoverPicker,PRESETS}=require("./personal-cover-ui");
const {chooseCover,removeCover}=require("./collection-covers");
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
 const [newCoverPreset,setNewCoverPreset]=useState("dove");
 const [newCoverPhoto,setNewCoverPhoto]=useState(null);
 const [photoBusy,setPhotoBusy]=useState(false);
 const [customize,setCustomize]=useState(false);
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
   const collection={...newCollection(newFolderName,newColor,newCoverPreset),coverPhoto:newCoverPhoto};
   commit({...store,collections:[...store.collections,collection]});
   setNewFolderName("");setNewCoverPhoto(null);setShowFolderForm(false);setCustomize(false);setFolderId(collection.id);setView("folder");
  }catch(e){Alert.alert("No se creó la colección",e.message);}
 }
 async function pickPhoto(isNew){
  if(photoBusy)return;
  setPhotoBusy(true);
  try {
   const filename=await chooseCover();
   if(filename){
    if(isNew){setNewCoverPhoto(filename);}
    else if(folder){updateFolder(c=>({...c,coverPhoto:filename}));}
   }
  }catch(e){Alert.alert("No se pudo guardar la portada",e.message||"Inténtalo con otra fotografía.");}
  finally{setPhotoBusy(false);}
 }
 function choosePreset(preset,isNew){
  if(isNew){setNewCoverPreset(preset);setNewCoverPhoto(null);}
  else if(folder){updateFolder(c=>({...c,coverPreset:preset,coverPhoto:null}));}
 }
 function startNewFolder(){
  setNewFolderName("");setNewColor(COLORS[0]);setNewCoverPreset("dove");setNewCoverPhoto(null);
  setShowFolderForm(true);setShareOpen(false);
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
    removeCover(folder?.coverPhoto);
    setCustomize(false);setFolderId(null);setEntryId(null);setView("folders");
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

 function openFolder(c,custom=false){
  setFolderId(c.id);setView("folder");setCustomize(custom);setShareOpen(false);
 }
 function collectionCard(c){
  const compositions=c.entries.length;
  const fragments=c.entries.reduce((acc,item)=>acc+(item.parts?.length||0),0);
  return h(Pressable,{key:c.id,style:[styles.collectionCard,{borderBottomColor:c.color}],
   accessibilityRole:"button",accessibilityLabel:"Abrir colección "+c.name,
   onPress:()=>openFolder(c)},
   h(CoverArt,{preset:c.coverPreset,photo:c.coverPhoto,color:c.color,height:124}),
   h(View,{style:styles.collectionCardBody},
    h(Text,{style:styles.collectionCardTitle,numberOfLines:2},c.name),
    h(Text,{style:styles.collectionCardCount,numberOfLines:1},
     compositions+" "+(compositions===1?"composición":"composiciones")+" · "+fragments+" fragmentos"),
    h(View,{style:styles.collectionCardFoot},
     h(View,{style:[styles.collectionColorDot,{backgroundColor:c.color}]}),
     h(Text,{style:styles.collectionCardType},"Colección privada"),
     h(Pressable,{onPress:e=>{e?.stopPropagation?.();openFolder(c,true);},
      accessibilityRole:"button",accessibilityLabel:"Personalizar "+c.name,
      style:styles.collectionCardMore},label("⋮",styles.moreIcon)))));
 }
 function foldersView(){
  const empty=!store.collections.length;
  return h(View,{style:styles.collectionRoot},
   h(View,{style:styles.collectionHeading},
    label("TU BIBLIOTECA PERSONAL",styles.eyebrow),
    label("Mis colecciones",styles.collectionTitle),
    label("Organiza tus misas y popurrís con portadas y colores propios.",styles.collectionSubtitle)),
   h(View,{style:styles.collectionTopActions},
    action("+ Crear colección",()=>{
      if(showFolderForm){setShowFolderForm(false);}else startNewFolder();
     }),
    action("Importar código",()=>{setShareOpen(v=>!v);setShowFolderForm(false);},true)),
   importPanel(),
   showFolderForm?h(View,{style:styles.customizerPanel},
    label("Nueva colección",styles.customTitle),
    label("Ponle un nombre y dale tu propio estilo.",styles.description),
    input(newFolderName,setNewFolderName,"Ej. Cantos para misa"),
    h(CoverPicker,{preset:newCoverPreset,photo:newCoverPhoto,color:newColor,
     onPreset:key=>choosePreset(key,true),onColor:setNewColor,
     onChoosePhoto:()=>pickPhoto(true),onClearPhoto:()=>setNewCoverPhoto(null),busy:photoBusy}),
    h(View,{style:styles.actions},
     action("Guardar colección",createFolder),
     action("Cancelar",()=>setShowFolderForm(false),true))):null,
   !empty?h(View,{style:styles.collectionGrid},...store.collections.map(collectionCard)):null,
   empty&&!showFolderForm?h(View,{style:styles.emptyVisual},
    h(View,{style:styles.emptyHeading},
     label("Dale personalidad a tus colecciones",styles.emptyTitle),
     label("Elige una portada de ejemplo o selecciona una fotografía de tu galería al crear tu colección.",
      styles.description)),
    h(View,{style:styles.inspirationGrid},
     ...["sunrise","guitar","adoration","book"].map(key=>h(Pressable,{
      key,accessibilityRole:"button",accessibilityLabel:"Elegir portada "+PRESETS[key].label,
      onPress:()=>{startNewFolder();setNewCoverPreset(key);},
      style:styles.inspirationCard},
      h(CoverArt,{preset:key,color:COLORS[["sunrise","guitar","adoration","book"].indexOf(key)+1],height:103}),
      label(PRESETS[key].label,styles.inspirationLabel)))),
    label("Estas son portadas de muestra, no colecciones ni cantos creados.",styles.emptyHint),
    action("+ Crear mi primera colección",()=>startNewFolder())):null,
   h(View,{style:styles.privacyFooter},
    label("⌂  Guardado solo en este dispositivo. Tus misas y popurrís no modifican los cantos oficiales.",styles.privateText)));
 }
 function folderView(){
  if(!folder)return foldersView();
  return h(View,{style:styles.container},
   action("← Mis colecciones",back,true),
   h(View,{style:styles.folderHero},
    h(CoverArt,{preset:folder.coverPreset,photo:folder.coverPhoto,color:folder.color,height:154}),
    h(View,{style:styles.folderHeroBottom},
     h(View,{style:{flex:1,minWidth:0}},
      label(folder.name,styles.pageTitle),
      label(folder.entries.length+" composiciones · Guardado en tu teléfono",styles.meta)),
     h(Pressable,{onPress:()=>setCustomize(v=>!v),accessibilityRole:"button",
      accessibilityLabel:"Editar portada y colores",style:styles.folderCustomize},
      label("✎",styles.folderCustomizeIcon)))),
   customize?h(View,{style:styles.customizerPanel},
    h(View,{style:styles.actions},
     label("Personalizar mi colección",styles.customTitle),
     action("Listo",()=>setCustomize(false),true)),
    h(CoverPicker,{preset:folder.coverPreset,photo:folder.coverPhoto,color:folder.color,
     onPreset:key=>choosePreset(key,false),
     onColor:color=>updateFolder(c=>({...c,color})),
     onChoosePhoto:()=>pickPhoto(false),
     onClearPhoto:()=>updateFolder(c=>({...c,coverPhoto:null})),busy:photoBusy})):null,
   h(View,{style:styles.actions},
    action("+ Misa",()=>createEntry("misa")),
    action("+ Popurrí",()=>createEntry("popurri")),
    action("Importar código",()=>setShareOpen(v=>!v),true)),
   importPanel(),
   ...folder.entries.map(item=>h(View,{key:item.id,style:styles.entryCard},
    label(item.kind==="misa"?"⛪ MISA PERSONAL":"♫ POPURRÍ PERSONAL",styles.tag),
    label(item.title,styles.cardTitle),
    label(item.parts.length+" fragmentos · Lectura continua",styles.meta),
    h(View,{style:styles.actions},
     action("Abrir",()=>{setEntryId(item.id);setView("reading");setReaderShift(0)},false,item.parts.length===0),
     action("Editar",()=>editEntry(item),true),
     action("Compartir",()=>shareEntry(item),true,item.parts.length===0)),
    action("Eliminar",()=>deleteEntry(item),true))),
   !folder.entries.length?h(View,{style:styles.folderEmpty},
    label("Esta colección ya tiene su portada 💚",styles.emptyTitle),
    label("Ahora puedes crear una misa o un popurrí flexible usando los cantos descargados.",styles.description),
    action("+ Crear mi primera misa",()=>createEntry("misa"))):null,
   action("Eliminar colección",deleteFolder,true));
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
 collectionRoot:{gap:13,paddingBottom:25},
 collectionHeading:{gap:4,paddingTop:5,marginBottom:2},
 eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.1,color:theme.green},
 collectionTitle:{fontSize:25,color:theme.text,fontWeight:"900",lineHeight:33},
 collectionSubtitle:{fontSize:12,color:theme.muted,lineHeight:18},
 collectionTopActions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:5},
 collectionGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:13},
 collectionCard:{width:"48.4%",overflow:"hidden",borderRadius:14,backgroundColor:"#19222d",borderWidth:1,
  borderColor:"#43525B",borderBottomWidth:4},
 collectionCardBody:{minHeight:112,padding:10,gap:4,justifyContent:"space-between"},
 collectionCardTitle:{fontSize:14,fontWeight:"900",lineHeight:19,color:theme.text},
 collectionCardCount:{fontSize:10.2,color:theme.muted},
 collectionCardFoot:{flexDirection:"row",alignItems:"center",gap:5,minHeight:25},
 collectionColorDot:{width:8,height:8,borderRadius:6},
 collectionCardType:{fontSize:9,color:theme.muted,flex:1},
 collectionCardMore:{minWidth:29,minHeight:33,justifyContent:"center",alignItems:"center"},
 moreIcon:{fontSize:22,color:theme.text,fontWeight:"800"},
 emptyVisual:{gap:11,marginTop:7},
 emptyHeading:{marginBottom:4,gap:3},
 emptyTitle:{fontSize:16,fontWeight:"850",color:theme.text,lineHeight:23},
 inspirationGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",rowGap:11},
 inspirationCard:{width:"48%",borderRadius:14,overflow:"hidden",backgroundColor:theme.panel,
  borderColor:theme.border,borderWidth:1},
 inspirationLabel:{fontSize:12,fontWeight:"800",color:theme.text,padding:10},
 emptyHint:{fontSize:11,color:theme.muted},
 customizerPanel:{backgroundColor:theme.panel,padding:13,borderWidth:1,borderColor:theme.border,
  borderRadius:16,gap:10,marginTop:4},
 customTitle:{fontSize:17,fontWeight:"900",color:theme.text},
 folderHero:{borderRadius:16,overflow:"hidden",backgroundColor:theme.panel,borderWidth:1,borderColor:theme.border},
 folderHeroBottom:{padding:11,flexDirection:"row",alignItems:"center",gap:7},
 folderCustomize:{width:42,height:42,borderWidth:1,borderColor:theme.green,borderRadius:12,
  justifyContent:"center",alignItems:"center"},
 folderCustomizeIcon:{fontSize:22,color:theme.green},
 privacyFooter:{padding:11,borderTopWidth:1,borderColor:theme.border,marginTop:9},
 privateText:{fontSize:11,color:theme.muted,lineHeight:16},
 entryCard:{padding:12,borderRadius:13,backgroundColor:theme.panel,borderWidth:1,
  borderColor:theme.border,gap:9,marginVertical:3},
 folderEmpty:{padding:16,backgroundColor:theme.panel,borderRadius:14,gap:9,marginVertical:13},
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