const React=require("react");
const {useState,useEffect}=React;
const {View,Text,TextInput,Pressable,Share,Alert,Image}=require("react-native");
const Clipboard=require("expo-clipboard");
const {CoverArt,CoverPicker,PRESETS}=require("./personal-cover-ui");
const {chooseCover,removeCover}=require("./collection-covers");
const {COLORS,MOMENTS,newCollection,newEntry,newPart,songSections,exportCode}=require("./personal-collections");
const {transposeOne}=require("./chords");
const {readingRows}=require("./personal-reader-core");
const {CollectionCapoControl,CollectionSongMenu}=require("./music-readers-ui");
const {useCollectionSections,CollectionSectionControls,CollectionSectionScore}=require("./section-reader-ui");
const {items,createPersonal,receivePersonal,codePreview,kindName}=require("./personal-workflows");
const h=React.createElement;
const theme=require("./palette");
const {MotionEntrance,MotionPressable}=require("./motion-ui");
const styles=require("./personal-styles")(theme);
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
const {updateCollection,updateComposition,reorderParts}=require("./personal-store");
function PersonalCollectionsScreen({icons={},store,onChange,songs,renderScore,collectionScoreRows,onSelectSong,onSongOptions,onStudioPart,onStudioCollection,filterKind=null,onClearFilter=()=>{},registerBack,initialNav,onNavChange,showReaderCues=true,setShowReaderCues,onReadingChange,immersiveActive=false,onToggleFullscreen}){
 const [folderId,setFolderId]=useState(initialNav?.folderId||null);
 const [entryId,setEntryId]=useState(initialNav?.entryId||null);
 const [view,setView]=useState(initialNav?.view||"home");
 const [createKind,setCreateKind]=useState(initialNav?.kind||filterKind||"misa");
 const [createTitle,setCreateTitle]=useState("");
 const [createTarget,setCreateTarget]=useState(null);
 const [editReturn,setEditReturn]=useState(initialNav?.editReturn||"home");
 const [shareReturn,setShareReturn]=useState(initialNav?.shareReturn||"home");
 const [expandedPartId,setExpandedPartId]=useState(null);
 const [importPreview,setImportPreview]=useState(null);
 const [importTarget,setImportTarget]=useState(null);
 const [listFilter,setListFilter]=useState(filterKind||"all");
 const [showRawCode,setShowRawCode]=useState(false);
 const [newFolderName,setNewFolderName]=useState("");
 const [newColor,setNewColor]=useState(COLORS[0]);
 const [newCoverPreset,setNewCoverPreset]=useState("dove");
 const [newCoverPhoto,setNewCoverPhoto]=useState(null);
 const [photoBusy,setPhotoBusy]=useState(false);
 const [customize,setCustomize]=useState(false);
 const [showFolderForm,setShowFolderForm]=useState(false);
 const [nameDraft,setNameDraft]=useState(()=>store.collections.find(c=>c.id===initialNav?.folderId)?.entries.find(e=>e.id===initialNav?.entryId)?.title||"");
 const [search,setSearch]=useState("");
 const [adding,setAdding]=useState(false);
 const [shareInput,setShareInput]=useState("");
 const [readerShift,setReaderShift]=useState(0);
 const [readerFont,setReaderFont]=useState(16);
 useEffect(()=>{onNavChange?.({folderId,entryId,view,kind:createKind,editReturn,shareReturn})},
  [folderId,entryId,view,createKind,editReturn,shareReturn]);
 useEffect(()=>{
  if(!registerBack)return;
  return registerBack(()=>back(true));
 },[registerBack,view,showFolderForm,customize,adding,filterKind,editReturn,shareReturn]);
 const folder=store.collections.find(c=>c.id===folderId);
 const entry=folder?.entries.find(e=>e.id===entryId);
 const readingActive=view==="reading"&&Boolean(folder&&entry);
 useEffect(()=>{onReadingChange?.(readingActive);return()=>{if(readingActive)onReadingChange?.(false);};},[onReadingChange,readingActive]);
 const catalog=new Map(songs.map(song=>[String(song.id),song]));
 const personalReadingRows=view==="reading"&&entry?readingRows(entry,catalog,readerShift):[];
 const nav=useCollectionSections(personalReadingRows.map(({part,song,resolved,scoreShift,index})=>({title:[part.moment,song?.title||part.fragmentTitle||"Fragmento "+(index+1)].filter(Boolean).join(" · "),rows:collectionScoreRows(resolved.lyrics||resolved.error||"Este canto no tiene letra descargada.",scoreShift,song,part.cueOverride)})),readerFont);
 const commit=(next,options)=>onChange(next,options);
 const updateFolder=fn=>commit(updateCollection(store,folderId,fn));
 const updateEntry=(fn,options)=>commit(updateComposition(store,folderId,entryId,fn),options);
 function back(fromNative=false){
  if(showFolderForm){setShowFolderForm(false);return true;}
  if(customize){setCustomize(false);return true;}
  if(view==="share"){setView(shareReturn);return true;}
  if(view==="import"){setImportPreview(null);setShareInput("");setView("home");return true;}
  if(view==="create"){setView("home");return true;}
  if(view==="reading"){setView("editing");return true;}
  if(view==="editing"){
   setEntryId(null);setSearch("");setAdding(false);setExpandedPartId(null);
   setView(editReturn);return true;
  }
  if(view==="folder"){setFolderId(null);setView("folders");return true;}
  if(view==="folders"){setView("home");return true;}
  if(filterKind){setListFilter("all");onClearFilter();return true;}
  return false;
 }
 function startCreate(kind){
  if(!["misa","popurri","repertorio"].includes(kind))return;
  setCreateKind(kind);setCreateTitle("");setCreateTarget(null);
  setView("create");setShareInput("");setImportPreview(null);
 }
 function finishCreate(){
  try{
   const result=createPersonal(store,createKind,createTitle,createTarget);
   commit(result.store,{notice:"Tu "+kindName(createKind)+" está lista para agregar cantos"});
   setFolderId(result.folder.id);setEntryId(result.entry.id);
   setNameDraft(result.entry.title);setSearch("");setAdding(true);
   setExpandedPartId(null);setEditReturn("home");setListFilter(createKind);setView("editing");
  }catch(e){Alert.alert("No se pudo crear",e?.message||"Revisa los datos.");}
 }
 function openReceive(target=null){
  setShareInput("");setImportTarget(target);setImportPreview(null);
  setView("import");
 }
 function openEntry(item,targetFolder,origin="home"){
  setFolderId(targetFolder.id);setEntryId(item.id);
  setNameDraft(item.title);setSearch("");setAdding(false);
  setEditReturn(origin);setExpandedPartId(null);
  nav.reset();setView(item.parts.length?"reading":"editing");setReaderShift(0);
 }
 function showShare(item,targetFolder,returnTo="home"){
  setFolderId(targetFolder.id);setEntryId(item.id);
  setShareReturn(returnTo);setView("share");
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
  setShowFolderForm(true);
 }
 function createEntry(kind){
  if(!folder)return;
  if(folder.entries.length>=100)return Alert.alert("Límite","Esta colección ya tiene 100 composiciones.");
  const item=newEntry(kind,kind==="misa"?"Mi misa":kind==="repertorio"?"Mi repertorio":"Mi popurrí");
  updateFolder(c=>({...c,entries:[...c.entries,item]}));
  setEntryId(item.id);setNameDraft(item.title);setSearch("");setAdding(true);setEditReturn("folder");setView("editing");
 }
 function editEntry(item){
  setEntryId(item.id);setNameDraft(item.title);setView("editing");setSearch("");setAdding(false);setEditReturn("folder");
 }
 function saveTitle(){
  const value=nameDraft.trim();
  if(!value)return Alert.alert("Nombre obligatorio","Escribe un nombre para guardar.");
  if(value!==entry?.title)updateEntry(e=>({...e,title:value.slice(0,120)}),{notice:"Nombre actualizado"});
 }
 function changePart(id,fn){updateEntry(e=>({...e,parts:e.parts.map(p=>p.id===id?fn(p):p)}));}
 function choosePartSection(part,sectionIndex,sectionTitle){
  if(part.fragmentLyrics==null&&part.sectionIndex===sectionIndex&&part.sectionTitle===sectionTitle)return;
  const apply=()=>changePart(part.id,x=>{const next={...x,sectionIndex,sectionTitle};delete next.fragmentLyrics;delete next.fragmentTitle;delete next.cueOverride;return next;});
  if(part.fragmentLyrics!=null||part.cueOverride!=null)Alert.alert("Cambiar fragmento","Se reemplazará la letra de esta aparición y se restablecerán sus indicaciones personalizadas. El canto original no cambia.",[{text:"Cancelar",style:"cancel"},{text:"Cambiar",onPress:apply}]);
  else apply();
 }
 function movePart(index,delta){
  if(!entry||index+delta<0||index+delta>=entry.parts.length)return;
  updateEntry(e=>reorderParts(e,index,delta));
 }
 function addSong(song){
  if(!entry)return;
  if(entry.parts.length>=30)return Alert.alert("Límite","El máximo es 30 fragmentos.");
  const part=newPart(song.id);
  updateEntry(e=>({...e,parts:[...e.parts,part]}));
  setSearch("");setAdding(true);
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
 function openFolder(c,custom=false){
  setFolderId(c.id);setView("folder");setCustomize(custom);
 }
 function collectionCard(c){
  const compositions=c.entries.length;
  const fragments=c.entries.reduce((acc,item)=>acc+(item.parts?.length||0),0);
  return h(MotionPressable,{key:c.id,style:[styles.collectionCard,{borderBottomColor:c.color}],
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
      style:styles.collectionCardMore},h(Image,{source:icons.dots,style:{width:24,height:24,tintColor:theme.muted},resizeMode:"contain"})))));
 }
 function kindTile(kind,caption){
  const name=kind==="misa"?"Misa":kind==="popurri"?"Popurrí":"Repertorio";
  const symbol=kind==="misa"?"mass":kind==="popurri"?"medleys":"repertoires";
  return h(MotionPressable,{key:kind,onPress:()=>startCreate(kind),
   style:styles.quickTile,accessibilityRole:"button",accessibilityLabel:"Crear "+name.toLowerCase()},
   h(Image,{source:icons[symbol],style:{width:24,height:24,tintColor:theme.green},resizeMode:"contain"}), label(kind==="misa"?"Nueva misa":kind==="repertorio"?"Nuevo repertorio":"Nuevo popurrí",styles.quickTileText),
   label(caption,styles.quickTileCaption));
 }
 function homeView(){
  const all=items(store,listFilter==="all"?null:listFilter);
  const counts={misa:items(store,"misa").length,popurri:items(store,"popurri").length,
   repertorio:items(store,"repertorio").length};
  return h(View,{style:styles.container},
   label("MI ESPACIO",styles.eyebrow),
   label("Mis creaciones",styles.collectionTitle),
   label("Prepara tus cantos para misa o ensayo. Todo se guarda en este celular.",styles.description),
   h(View,{style:styles.quickGrid},
    kindTile("misa","Para una celebración"),
    kindTile("repertorio","Para tu ensayo"),
    kindTile("popurri","Une varios cantos")),
   h(Pressable,{onPress:openReceive,accessibilityRole:"button",
    accessibilityLabel:"Recibir una composición por código",style:styles.receiveShortcut},
    h(Image,{source:icons.download,style:{width:24,height:24,tintColor:theme.green},resizeMode:"contain"}),
    h(View,{style:{flex:1}},
     label("Recibir composición",styles.cardTitle),
     label("Pega el mensaje que te enviaron por WhatsApp.",styles.meta)),
    label("›",styles.arrow)),
   label("Tus composiciones",styles.sectionHeading),
   h(View,{style:styles.wrap},
    chip("Todos",listFilter==="all",()=>setListFilter("all")),
    chip("Misas · "+counts.misa,listFilter==="misa",()=>setListFilter("misa")),
    chip("Popurrís · "+counts.popurri,listFilter==="popurri",()=>setListFilter("popurri")),
    chip("Repertorios · "+counts.repertorio,listFilter==="repertorio",()=>setListFilter("repertorio"))),
   ...all.map(({folder:c,entry:item})=>h(View,{key:c.id+"-"+item.id,style:styles.creationRow},
    h(Pressable,{style:styles.creationOpen,onPress:()=>openEntry(item,c,"home"),
     accessibilityRole:"button",accessibilityLabel:"Abrir "+item.title},
     h(View,{style:styles.creationIcon},h(Image,{source:icons[item.kind==="misa"?"mass":item.kind==="repertorio"?"repertoires":"medleys"],style:{width:24,height:24,tintColor:theme.green},resizeMode:"contain"})),
     h(View,{style:{flex:1,minWidth:0}},
      h(Text,{style:styles.cardTitle,numberOfLines:2},item.title),
      label((item.kind==="misa"?"Misa":item.kind==="repertorio"?"Repertorio":"Popurrí")+
       " · "+item.parts.length+" "+(item.parts.length===1?"canto":"cantos"),styles.meta),
      label("En "+c.name,styles.creationFolder)),
     label("›",styles.arrow)),
    item.parts.length?h(Pressable,{onPress:()=>showShare(item,c,"home"),
     style:styles.shareSmall,accessibilityRole:"button",
     accessibilityLabel:"Compartir "+item.title},h(Image,{source:icons.share,style:{width:24,height:24,tintColor:theme.muted},resizeMode:"contain",accessible:false})):null)),
   !all.length?h(View,{style:styles.emptyClean},
    label(listFilter==="all"?"Todavía no tienes composiciones.":
     "Aún no has creado "+(listFilter==="misa"?"misas":listFilter==="popurri"?"popurrís":"repertorios")+".",styles.emptyTitle),
    label("Elige una de las opciones de arriba para comenzar. No necesitas crear una carpeta.",styles.description)):null,
   h(Pressable,{onPress:()=>setView("folders"),accessibilityRole:"button",style:[styles.action,styles.actionSecondary,styles.iconAction]},h(Image,{source:icons.folder,style:{width:24,height:24,tintColor:theme.text},resizeMode:"contain",accessible:false}),label("Organizar por carpetas",[styles.actionText,styles.actionTextSecondary])),
   h(View,{style:styles.privacyFooter},
    h(Image,{source:icons.lock,style:{width:16,height:16,tintColor:theme.muted},resizeMode:"contain",accessible:false}),label("Tus composiciones son privadas y no modifican los cantos oficiales de SHALOM.",styles.privateText)));
 }
 function createView(){
  const title=createKind==="misa"?"Nueva misa":createKind==="repertorio"?"Nuevo repertorio":"Nuevo popurrí";
  return h(View,{style:styles.container},
   action("← Mis creaciones",back,true),
   label("PASO 1 DE 2",styles.eyebrow),
   label(title,styles.collectionTitle),
   label("Dale un nombre. Después podrás elegir los cantos y ordenarlos.",styles.description),
   label("¿Qué vas a preparar?",styles.inputLabel),
   h(View,{style:styles.wrap},
    chip("Misa",createKind==="misa",()=>setCreateKind("misa")),
    chip("Repertorio",createKind==="repertorio",()=>setCreateKind("repertorio")),
    chip("Popurrí",createKind==="popurri",()=>setCreateKind("popurri"))),
   label("Nombre",styles.inputLabel),
   input(createTitle,setCreateTitle,createKind==="misa"?"Ej. Misa del domingo":
    createKind==="repertorio"?"Ej. Ensayo del jueves":"Ej. Alabanzas de entrada"),
   label("Guardar en",styles.inputLabel),
   label("Por defecto se organizará en «Mis creaciones». La carpeta es opcional.",styles.description),
   h(View,{style:styles.wrap},
    chip("Automático",createTarget===null,()=>setCreateTarget(null)),
    ...store.collections.map(c=>chip(c.name,createTarget===c.id,()=>setCreateTarget(c.id)))),
   action("Continuar → Agregar cantos",finishCreate,false,!createTitle.trim()),
   label("Los nombres y cantos son editables después. Nada se publica en internet.",styles.meta));
 }
 async function pasteFromClipboard(){
  try{
   const copied=await Clipboard.getStringAsync();
   if(!copied.trim())return Alert.alert("Portapapeles vacío","Copia primero el mensaje recibido.");
   setShareInput(copied);setImportPreview(null);
  }catch(e){Alert.alert("No se pudo pegar",e?.message||"Pega el mensaje manualmente.");}
 }
 function examineImport(){
  try{setImportPreview(codePreview(shareInput,songs));}
  catch(e){setImportPreview(null);Alert.alert("Mensaje no reconocido",e.message);}
 }
 function completeImport(){
  try{
   // Se vuelve a validar el texto por si se modificó después de la vista previa.
   const inspected=codePreview(shareInput,songs);
   const result=receivePersonal(store,shareInput,importTarget);
   commit(result.store,{notice:"Composición recibida y guardada"});
   setFolderId(result.folder.id);setEntryId(result.entry.id);
   setNameDraft(result.entry.title);setEditReturn("home");
   setSearch("");setAdding(false);setExpandedPartId(null);
   setShareInput("");setImportPreview(null);setView("editing");
   if(inspected.missingCount)Alert.alert("Cantos pendientes",
    "Hay "+inspected.missingCount+" cantos que no están descargados. Actualiza la biblioteca para verlos.");
  }catch(e){Alert.alert("No se pudo importar",e?.message||"Comprueba el código.");}
 }
 function receiveView(){
  return h(View,{style:styles.container},
   action("← Mis creaciones",back,true),
   label("RECIBIR",styles.eyebrow),
   label("Recibir composición",styles.collectionTitle),
   label("¿Te enviaron una misa, popurrí o repertorio? Copia el mensaje de WhatsApp y pégalo aquí.",styles.description),
   action("Pegar desde el portapapeles",pasteFromClipboard),
   h(TextInput,{value:shareInput,onChangeText:v=>{setShareInput(v);setImportPreview(null)},
    placeholder:"O mantén presionado aquí para pegar el mensaje SHALOM…",
    placeholderTextColor:theme.muted,style:[styles.input,styles.multiInput],multiline:true,
    maxLength:19000,textAlignVertical:"top",autoCapitalize:"none",autoCorrect:false}),
   action("Revisar composición",examineImport,true,!shareInput.trim()),
   importPreview?h(View,{style:styles.importSummary},
    label("LISTA PARA IMPORTAR",styles.eyebrow),
    label(importPreview.entry.title,styles.cardTitle),
    label("Tipo: "+kindName(importPreview.entry.kind)+" · "+
     importPreview.count+" "+(importPreview.count===1?"fragmento":"fragmentos"),styles.meta),
    label(importPreview.missingCount?
     "Hay "+importPreview.missingCount+" cantos pendientes de descargar. Podrás agregarlos más adelante.":
     "Todos los cantos de este mensaje están en tu biblioteca.",styles.description),
    label("¿Dónde guardarla?",styles.inputLabel),
    h(View,{style:styles.wrap},
     chip("Recibidos",importTarget===null,()=>setImportTarget(null)),
     ...store.collections.map(c=>chip(c.name,importTarget===c.id,()=>setImportTarget(c.id)))),
    action("Guardar en mi teléfono",completeImport),
    label("No se alterarán tus cantos originales ni la cuenta del administrador.",styles.meta)):null);
 }
 function shareView(){
  if(!folder||!entry)return homeView();
  let code="",shareError="";
  try{code=exportCode(entry);}catch(error){shareError=error.message||"No se pudo preparar el código.";}
  const shareMessage="🕊️ SHALOM · "+kindName(entry.kind)+"\n"+entry.title+
   "\n\n"+code+"\n\nPara guardarlo: abre SHALOM → Mis creaciones → Recibir composición → Pegar mensaje.";
  async function shareNative(){
   try{
    if(!code)throw new Error(shareError);
    await Share.share({title:"SHALOM · "+entry.title,message:shareMessage});
   }catch(e){Alert.alert("No se pudo compartir",e?.message||"Inténtalo de nuevo.");}
  }
  async function copyCode(){
   try{
    if(!code)throw new Error(shareError);
    await Clipboard.setStringAsync(shareMessage);
    Alert.alert("Mensaje copiado","Ya puedes pegarlo en WhatsApp o en otra conversación.");
   }catch(e){Alert.alert("No se pudo copiar",e?.message||"Inténtalo de nuevo.");}
  }
  return h(View,{style:styles.container},
   action("← Volver",back,true),
   label("COMPARTIR",styles.eyebrow),
   label("Enviar composición",styles.collectionTitle),
   label(entry.title,styles.cardTitle),
   label(entry.parts.length+" cantos · "+kindName(entry.kind),styles.meta),
   label("La otra persona podrá guardarla en su SHALOM, sin que ninguno de los dos tenga que iniciar sesión.",styles.description),
   shareError?label(shareError+" Puedes conservar la composición completa mediante Respaldo y restauración.",styles.warning):null,
   action("↗  Enviar por WhatsApp u otra app",shareNative,false,!code),
   action("▣  Copiar mensaje",copyCode,true,!code),
   h(View,{style:styles.infoCard},
    label("¿Qué recibe la otra persona?",styles.cardTitle),
    label("El orden de los cantos, los fragmentos, tonos, capos y notas personalizadas. Las indicaciones pueden incluir las frases seleccionadas y los fragmentos modificados incluyen su letra y acordes. No se envían tus fotografías.",styles.description),
    code.startsWith("SHALOM2-")?label("Quien lo reciba necesita una versión compatible con las indicaciones y capos personalizados.",styles.meta):null,
    label("Solo tiene que abrir Mis creaciones → Recibir composición y pegar el mensaje.",styles.meta)),
   action(showRawCode?"Ocultar código":"Ver código de SHALOM",()=>setShowRawCode(v=>!v),true),
   showRawCode?h(Text,{selectable:true,style:styles.codePreview},code):null);
 }
 function foldersView(){
  const empty=!store.collections.length;
  return h(View,{style:styles.collectionRoot},
   h(View,{style:styles.collectionHeading},
    label("TU BIBLIOTECA PERSONAL",styles.eyebrow),
    label("Mis colecciones",styles.collectionTitle),
    label("Organiza repertorios, misas y popurrís con portadas y colores propios.",styles.collectionSubtitle)),
   h(View,{style:styles.collectionTopActions},
    action("+ Crear colección",()=>{
      if(showFolderForm){setShowFolderForm(false);}else startNewFolder();
     }),
    action("Recibir composición",()=>{setShowFolderForm(false);openReceive();},true)),
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
    h(Image,{source:icons.lock,style:{width:16,height:16,tintColor:theme.muted},resizeMode:"contain",accessible:false}),label("Guardado solo en este dispositivo. Tus misas y popurrís no modifican los cantos oficiales.",styles.privateText)));
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
      h(Image,{source:icons.edit,style:{width:24,height:24,tintColor:theme.text},resizeMode:"contain",accessible:false})))),
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
    action("+ Repertorio",()=>createEntry("repertorio"),true),
    action("Recibir composición",()=>openReceive(folder.id),true)),
   ...folder.entries.map(item=>h(View,{key:item.id,style:styles.entryCard},
    label(item.kind==="misa"?"MISA PERSONAL":item.kind==="repertorio"?"REPERTORIO PERSONAL":"POPURRÍ PERSONAL",styles.tag),
    label(item.title,styles.cardTitle),
    label(item.parts.length+" fragmentos · Lectura continua",styles.meta),
    h(View,{style:styles.actions},
     action("Abrir",()=>openEntry(item,folder,"folder"),false),
     action("Editar",()=>editEntry(item),true),
     action("Compartir",()=>showShare(item,folder,"folder"),true,item.parts.length===0)),
    action("Eliminar",()=>deleteEntry(item),true))),
   !folder.entries.length?h(View,{style:styles.folderEmpty},
    label("Esta colección ya tiene su portada 💚",styles.emptyTitle),
    label("Ahora puedes crear una misa o un popurrí flexible usando los cantos descargados.",styles.description),
    action("+ Crear mi primera misa",()=>createEntry("misa"))):null,
   action("Eliminar colección",deleteFolder,true));
 }
 function editView(){
  if(!folder||!entry)return homeView();
  const normalized=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const results=search.trim()?songs.filter(song=>normalized(
   (song.title||"")+" "+(song._artists||[]).map(a=>a.name).join(" ")).includes(normalized(search.trim()))).slice(0,14):
   songs.slice(0,8);
  return h(View,{style:styles.container},
   action("← Volver",back,true),
   label("PASO 2 DE 2",styles.eyebrow),
   label(entry.kind==="misa"?"Prepara tu misa":entry.kind==="repertorio"?"Prepara tu repertorio":"Prepara tu popurrí",styles.pageTitle),
   label("Agrega cantos del catálogo. Después puedes ajustar estrofas y tonos.",styles.description),
   label("Nombre",styles.inputLabel),
   h(TextInput,{value:nameDraft,onChangeText:setNameDraft,
    onBlur:()=>{if(nameDraft.trim()&&nameDraft.trim()!==entry.title)saveTitle();},
    placeholder:"Nombre de tu composición",placeholderTextColor:theme.muted,
    style:styles.input,maxLength:120}),
   h(View,{style:styles.actions},
    action("Guardar nombre",saveTitle,true,nameDraft.trim()===entry.title||!nameDraft.trim()),
    action("✓  Listo",()=>{
     if(!nameDraft.trim())return Alert.alert("Falta el nombre","Escribe el nombre de tu composición.");
     saveTitle();setAdding(false);setExpandedPartId(null);setView(editReturn);
    },true)),
   h(View,{style:styles.editorStep},
    label("1. Elige tus cantos",styles.cardTitle),
    label("Puedes repetir cantos para formar un popurrí o una misa.",styles.description),
    action(adding?"Cerrar búsqueda":"+ Añadir canto",()=>setAdding(v=>!v))),
   adding?h(View,{style:styles.searchPanel},
    input(search,setSearch,"Buscar canto por título o artista"),
    !songs.length?label("Descarga primero el cancionero en Inicio.",styles.warning):null,
    ...results.map(song=>h(Pressable,{key:song.id,onPress:()=>addSong(song),style:styles.result,
     accessibilityRole:"button",accessibilityLabel:"Añadir "+song.title},
      h(View,{style:{flex:1}},
       label(song.title,styles.resultTitle),
       label((song._artists||[]).map(a=>a.name).filter(Boolean).join(" · ")||
        "Canto SHALOM",styles.meta)),
      label("+",styles.arrow))),
    search.trim()&&!results.length?label("No se encontraron cantos con ese nombre.",styles.description):null):null,
   label("2. Orden de los cantos",styles.cardTitle),
   label(entry.parts.length?(entry.parts.length+" "+(entry.parts.length===1?"canto agregado":"cantos agregados")):
    "Aún no hay cantos. Usa «Añadir canto» para comenzar.",styles.description),
   ...entry.parts.map((p,index)=>{
    const song=catalog.get(p.songId),sections=song?songSections(song.lyrics):[];
    const expanded=expandedPartId===p.id;
    return h(View,{key:p.id,style:styles.partCompact},
     h(View,{style:styles.partHead},
      h(View,{style:styles.number},label(String(index+1),styles.numberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(Text,{style:styles.cardTitle,numberOfLines:2},song?.title||"Canto pendiente de descargar"),
       label((p.fragmentLyrics!=null?p.fragmentTitle||"Fragmento personalizado":p.sectionIndex===null?"Completo":p.sectionTitle||"Fragmento")+" · "+
        (song?.tone?transposeOne(song.tone,p.shift):"Sin tono")+
        (p.moment?" · "+p.moment:""),styles.meta))),
     h(View,{style:styles.actions},
      action(expanded?"Cerrar ajustes":"Ajustar",()=>setExpandedPartId(expanded?null:p.id),true),
      action("↑",()=>movePart(index,-1),true,index===0),
      action("↓",()=>movePart(index,1),true,index===entry.parts.length-1),
      action("Quitar",()=>updateEntry(e=>({...e,parts:e.parts.filter(x=>x.id!==p.id)})),true)),
     expanded?h(View,{style:styles.partDetails},
      label("¿Qué parte quieres usar?",styles.inputLabel),
      song?h(View,{style:styles.wrap},
       p.fragmentLyrics!=null?label("Se conserva el fragmento de la copia oficial.",styles.meta):null,
       chip("Canto completo",p.fragmentLyrics==null&&p.sectionIndex===null,()=>choosePartSection(p,null,"")),
       ...sections.map(section=>chip(section.title,p.sectionIndex===section.index,
        ()=>choosePartSection(p,section.index,section.title)))):
       label("Descarga la biblioteca para elegir estrofas.",styles.warning),
      entry.kind==="misa"?h(View,{style:{gap:7}},
       label("Momento de la misa",styles.inputLabel),
       h(View,{style:styles.wrap},...MOMENTS.map(m=>chip(m,p.moment===m,
        ()=>changePart(p.id,x=>({...x,moment:m})))))):null,
      label("Cambiar tono de este canto",styles.inputLabel),
      h(View,{style:styles.toneRow},
       action("T−",()=>changePart(p.id,x=>({...x,shift:Math.max(-11,x.shift-1)})),true,p.shift<=-11),
       label((p.shift>0?"+":"")+p.shift+" semitonos",styles.meta),
       action("T+",()=>changePart(p.id,x=>({...x,shift:Math.min(11,x.shift+1)})),true,p.shift>=11))):null);
   }),
   h(View,{style:styles.editorFinish},
    action("▶  Leer composición",()=>{setView("reading");setReaderShift(0)},false,!entry.parts.length),
    action("↗  Compartir",()=>showShare(entry,folder,"editing"),true,!entry.parts.length)),
   label("Los cambios se guardan en tu teléfono. El nombre también se guarda al salir del campo.",styles.privacyNote));
 }
 function readingView(){
  if(!folder||!entry)return folderView();
  const rows=personalReadingRows;
  const plan=require("./studio-collections").plan(rows.map(({part,song,resolved,scoreShift,selection})=>({songId:part.songId,title:song?.title,moment:part.moment,lyrics:resolved.lyrics,shift:scoreShift,capo:selection.chosen.position})),songs);
  return h(View,{style:styles.container},
   !immersiveActive?action("← Editar "+kindName(entry.kind),back,true):null,
   label(entry.title,immersiveActive?styles.cardTitle:styles.pageTitle),
   !immersiveActive?label((entry.kind==="misa"?"Misa":entry.kind==="repertorio"?"Repertorio":"Popurrí")+" personal · "+entry.parts.length+" fragmentos · Sin internet",styles.description):null,
   onToggleFullscreen?action(immersiveActive?"Salir de pantalla completa":"⛶ Pantalla completa",onToggleFullscreen,true):null,
   h(View,{style:styles.toneRow},
    action("T−",()=>setReaderShift(v=>Math.max(-11,v-1)),true,readerShift<=-11),
    label(readerShift===0?"Tono original":(readerShift>0?"+":"")+readerShift+" semitonos",styles.meta),
    action("T+",()=>setReaderShift(v=>Math.min(11,v+1)),true,readerShift>=11),
    action("A−",()=>nav.enabled?nav.manualFont(nav.fitFont-1):setReaderFont(v=>Math.max(13,v-1)),true,!nav.enabled&&readerFont<=13),
    action("A+",()=>nav.enabled?nav.manualFont(nav.fitFont+1):setReaderFont(v=>Math.min(22,v+1)),true,!nav.enabled&&readerFont>=22)),
   h(CollectionSectionControls,{nav}),
   setShowReaderCues?action(showReaderCues?"Ocultar indicaciones":"Mostrar indicaciones",()=>setShowReaderCues(v=>!v),true):null,
   !immersiveActive&&entry.kind!=="misa"&&plan.ready.length&&onStudioCollection?action("♫ "+(entry.kind==="popurri"?"Practicar fragmentos":"Ensayar con guitarra")+" · "+plan.ready.length+"/"+plan.total,()=>onStudioCollection(plan),true):null,
   ...rows.map(({part:p,index,song,resolved,scoreShift,selection,tone})=>{
    if(nav.enabled&&nav.current?.entryIndex!==index)return null;
    return h(View,{key:p.id,style:styles.readerPart},
     h(View,{style:styles.partHead},
      h(View,{style:styles.number},label(String(index+1),styles.numberText)),
      h(View,{style:{flex:1}},entry.kind==="misa"&&p.moment?label(p.moment,styles.tag):null,
       label(song?.title||p.fragmentTitle||"Canto no disponible",styles.cardTitle),
       label((resolved.section||p.sectionTitle||"")+
        (song?.tone?" · Tono "+tone:""),styles.meta)),
      h(CollectionSongMenu,{song,style:styles.chip,textStyle:styles.chipText,onPress:onSongOptions&&resolved.lyrics!==null?()=>onSongOptions(song,{lyrics:resolved.lyrics,shift:scoreShift,capo:selection.chosen.position,override:p.cueOverride,personalTarget:{folderId:folder.id,entryId:entry.id,partId:p.id},practiceReady:!!plan.entries[index]?.ready}):null})),
     h(CollectionCapoControl,{song,selection,onSelect:id=>changePart(p.id,x=>({...x,capoId:id})),style:styles.chip,textStyle:styles.chipText}),
     p.notes?label(p.notes,styles.meta):null,
     nav.enabled?h(CollectionSectionScore,{nav,fontSize:readerFont,S:{songReaderHint:styles.meta},immersiveActive}):resolved.lyrics===null?label(resolved.error,styles.warning):
      resolved.lyrics?renderScore(resolved.lyrics,scoreShift,"local-"+p.id,readerFont,song,p.cueOverride):
       label("Este canto no tiene letra descargada.",styles.warning),
     !immersiveActive&&plan.entries[index]?.ready&&onStudioPart?action("♫ Practicar con guitarra",()=>onStudioPart(song,{lyrics:resolved.lyrics,shift:scoreShift,capo:selection.chosen.position}),true):null,
     !immersiveActive&&song?action("Ver canto original",()=>onSelectSong(song),true):null);
   }),
   !immersiveActive?action("Compartir",()=>showShare(entry,folder,"reading"),true):null);
 }
 if(view==="reading")return readingView();
 if(view==="editing")return editView();
 if(view==="share")return shareView();
 if(view==="import")return receiveView();
 if(view==="create")return createView();
 if(view==="folder")return h(MotionEntrance,{key:"folder"},folderView());
 if(view==="folders")return h(MotionEntrance,{key:"folders"},foldersView());
 return homeView();
}
module.exports=PersonalCollectionsScreen;
