// Musical reader presentation. All three use the existing canonical parser and shared score controls.
const {createElement:h,useState}=require("react");
const {View,Text,Pressable,Image,Alert}=require("react-native");
const {parseSong,transposeOne}=require("./chords");
const {names,safeWebUrl}=require("./catalog");
const {hasFavorite}=require("./favorites");
const {capoSelection,collectionCapo,occurrenceKey}=require("./song-capo-core");
const {clampReaderFont}=require("./score-zoom");
const {repertoireType}=require("./repertoire-ui");
const StudioCollections=require("./studio-collections");
const ReaderCues=require("./studio-reader-cues");
const SectionReader=require("./section-reader-ui");

// One compact control, reused by both official and personal readers.
function CollectionCapoControl({song,selection,onSelect,style,textStyle}){
 const [expanded,setExpanded]=useState(false);
 if(!song||selection.choices.length<=1)return null;
 const {chosen,choices}=selection;
 return h(View,{style:{gap:4,alignItems:"flex-start"}},
  h(Pressable,{style,onPress:()=>setExpanded(v=>!v),accessibilityRole:"button",accessibilityLabel:"Seleccionar capo de "+(song.title||"canto"),accessibilityState:{expanded}},h(Text,{style:textStyle},(chosen.id==="none"?"Sin capo":"Capo "+chosen.position+(chosen.key?" · "+chosen.key:""))+" ▾")),
  expanded?h(View,{style:{gap:5,flexDirection:"row",flexWrap:"wrap"}},...choices.map(c=>h(Pressable,{key:String(c.id),style:[style,c.id===chosen.id&&{borderWidth:1,borderColor:"#27c98b"}],accessibilityRole:"button",accessibilityState:{selected:c.id===chosen.id},onPress:()=>{onSelect(c.id);setExpanded(false);}},h(Text,{style:textStyle},c.label+(c.key?" · Figuras en "+c.key:""))))):null);
}
function CollectionSongMenu({song,onPress,style,textStyle}){
 if(!song||!onPress)return null;
 return h(Pressable,{style,onPress,accessibilityRole:"button",accessibilityLabel:"Opciones de "+(song.title||"canto")},h(Text,{style:textStyle},"⋮"));
}
function RepertoireReader({rep,S,HOME_IMAGES,label,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,openStudioPart,selectSong,onSongOptions,onCopy}){
  const items=Array.isArray(rep.items)?rep.items:[];
  const kind=repertoireType(rep);
  const [capos,setCapos]=useState({});
  const practiceParts=items.map((item,index)=>{
   const song=model.songs.find(s=>String(s.id)===String(item.song_id)),key=occurrenceKey(rep,index,item),selection=collectionCapo(song,item,capos[key]);
   return {...item,shift:transpose+selection.offset,capo:selection.chosen.position,selection,key};
  });
  const plan=StudioCollections.plan(practiceParts,model.songs);
  return h(View,{style:S.multiReader},
   h(View,{style:S.songMetaRow},
    h(View,{style:S.songMetaIcon},h(Image,{source:HOME_IMAGES[kind==="misa"?"mass":"repertoires"],
     resizeMode:"contain",style:S.songMetaIconImage})),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.songHeading},rep.title||"Repertorio"),
     label(items.length+" "+(items.length===1?"canto":"cantos")+
      (rep.event_date?" · "+rep.event_date:""),S.songArtist),
     h(View,{style:S.songTypeBadge},
      label(kind==="misa"?"Misa":kind==="ensayo"?"Ensayo":"Repertorio",S.songTypeText)))),
   (rep.location||rep.notes)?h(Text,{style:S.multiDescription},[rep.location,rep.notes].filter(Boolean).join(" · ")):null,
   renderMultiReadingControls(),
   !immersiveActive&&onCopy?h(Pressable,{style:S.multiTextAction,onPress:onCopy,accessibilityRole:"button"},label("Copiar a Mis creaciones",S.multiTextActionLabel)):null,
   !immersiveActive&&kind!=="misa"?renderStudioCollectionAction(plan,"Ensayar con guitarra"):null,
   ...items.map((item,index)=>{
    const song=model.songs.find(s=>String(s.id)===String(item.song_id));
    const title=String(song?.title||item.song_title||"Canto no disponible");
    const moment=String(item.moment||"Canto "+(index+1));
    const {selection,key,shift:scoreShift,capo:position}=practiceParts[index];
    const tone=song?.tone?transposeOne(song.tone,transpose):"";
    return h(View,{key:item.id||index,style:[S.multiPart,index>0&&S.multiPartDivider]},
     h(View,{style:S.multiPartHeading},
      h(View,{style:S.multiPartNumber},label(String(index+1),S.multiPartNumberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(View,{style:S.multiMomentPill},label(moment,S.multiMomentText)),
       h(Text,{style:S.multiPartTitle},title),
       tone?label("Tono "+tone,S.multiPartDetail):null),
      h(CollectionSongMenu,{song,style:S.songTopMore,textStyle:S.songTopMoreText,onPress:onSongOptions?()=>onSongOptions(song,{lyrics:song.lyrics||"",shift:scoreShift,capo:position,override:item.cue_override,practiceReady:!!plan.entries[index]?.ready}):null})),
     item.notes?h(Text,{style:S.multiPartNote},item.notes):null,
     h(CollectionCapoControl,{song,selection,onSelect:id=>setCapos(v=>({...v,[key]:id})),style:S.multiTextAction,textStyle:S.multiTextActionLabel}),
     renderMultiReadingScore(song?.lyrics||"Canto no disponible.",scoreShift,"rep-"+index,undefined,song,item.cue_override),
     !immersiveActive&&plan.entries[index]?.ready?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>openStudioPart(song,{shift:scoreShift,capo:position})},label("♫ Practicar con guitarra",S.multiOriginalText)):null,
     song?h(Pressable,{onPress:()=>selectSong(song),accessibilityRole:"button",
       accessibilityLabel:"Abrir "+title+" como canto individual",style:S.multiOriginalLink},
       label("Ver canto individual  ›",S.multiOriginalText)):null
    );
   }),
   !items.length?h(SectionEmpty,{message:"Este repertorio todavía no tiene cantos."}):null
  );
 }

function MedleyReader({medley,S,HOME_IMAGES,label,type,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,setStudioQueue,setStudioPayload,selectSong,openWeb,onSongOptions,onCopy}){
  const parts=Array.isArray(medley.parts)?medley.parts:[];
  const generalTone=String(medley.base_tone||"");
  const [capos,setCapos]=useState({});
  const practiceParts=parts.map((part,index)=>{
   const song=model.songs.find(s=>String(s.id)===String(part.song_id)),key=occurrenceKey(medley,index,part),selection=collectionCapo(song,part,capos[key]);
   return {...part,shift:transpose+Number(part.shift||0)+selection.offset,capo:selection.chosen.position,selection,key};
  });
  const plan=StudioCollections.plan(practiceParts,model.songs);
  const sequence=StudioCollections.sequencePlan(practiceParts,model.songs,medley.title);
  return h(View,{style:S.multiReader},
   h(View,{style:S.songMetaRow},
    h(View,{style:S.songMetaIcon},
     h(Image,{source:HOME_IMAGES.medleys,resizeMode:"contain",style:S.songMetaIconImage})),
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.songHeading},medley.title||"Popurrí"),
     label(parts.length+" "+(parts.length===1?"fragmento":"fragmentos")+
      (generalTone?" · Tono "+transposeOne(generalTone,transpose):""),S.songArtist),
     h(View,{style:S.songTypeBadge},label(type(medley.song_type),S.songTypeText)))),
   medley.description?h(Text,{style:S.multiDescription},medley.description):null,
   renderMultiReadingControls(),
   !immersiveActive&&onCopy?h(Pressable,{style:S.multiTextAction,onPress:onCopy,accessibilityRole:"button"},label("Copiar a Mis creaciones",S.multiTextActionLabel)):null,
   !immersiveActive&&sequence?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>{setStudioQueue(null);setStudioPayload(sequence)}},label("▶ Practicar popurrí completo",S.multiOriginalText)):null,
   !immersiveActive?renderStudioCollectionAction(plan,"Practicar fragmentos disponibles"):null,
   ...parts.map((part,index)=>{
    const original=model.songs.find(song=>String(song.id)===String(part.song_id));
    const fragmentTitle=part.title||part.song_title||original?.title||"Canto "+(index+1);
    const shift=Number(part.shift||0);
    const delta=transpose+(Number.isFinite(shift)?shift:0);
    const tone=part.tone||original?.tone||"";
    const {selection,key,shift:scoreShift}=practiceParts[index];
    const tutorials=[
     ...(original?._links||[]).map(x=>({title:x.title||"Video",url:x.url})),
     {title:"Tutorial guitarra",url:original?.tutorial_guitar},
     {title:"Tutorial piano",url:original?.tutorial_piano}
    ].filter(x=>safeWebUrl(x.url));
    return h(View,{key:part.id||index,style:[S.multiPart,index>0&&S.multiPartDivider]},
     h(View,{style:S.multiPartHeading},
      h(View,{style:S.multiPartNumber},label(String(index+1),S.multiPartNumberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(Text,{style:S.multiPartTitle},fragmentTitle),
       tone?label("Tono "+transposeOne(tone,delta),S.multiPartDetail):null),
      h(CollectionSongMenu,{song:original,style:S.songTopMore,textStyle:S.songTopMoreText,onPress:onSongOptions?()=>onSongOptions(original,{lyrics:part.lyrics||original.lyrics||"",shift:scoreShift,capo:selection.chosen.position,override:part.cue_override,practiceReady:!!plan.entries[index]?.ready}):null})),
     h(CollectionCapoControl,{song:original,selection,onSelect:id=>setCapos(v=>({...v,[key]:id})),style:S.multiTextAction,textStyle:S.multiTextActionLabel}),
     renderMultiReadingScore(part.lyrics||original?.lyrics||"Sin letra guardada.",scoreShift,"medley-"+index,undefined,original,part.cue_override),
     h(View,{style:S.multiQuickLinks},
      !immersiveActive&&plan.entries[index]?.ready?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>{setStudioQueue(null);setStudioPayload(plan.entries[index].payload)}},label("♫ Practicar fragmento",S.multiOriginalText)):null,
      original?h(Pressable,{onPress:()=>selectSong(original),accessibilityRole:"button",
       accessibilityLabel:"Abrir "+original.title+" como canto individual",style:S.multiOriginalLink},
       label("Ver canto original  ›",S.multiOriginalText)):null,
      ...tutorials.map((x,i)=>h(Pressable,{key:"video-"+i,onPress:()=>openWeb(x.url),
       accessibilityRole:"button",accessibilityLabel:"Abrir "+x.title,style:S.multiOriginalLink},
       label("▶ "+x.title,S.multiOriginalText))))
    );
   }),
   !parts.length?h(SectionEmpty,{message:"Este popurrí todavía no tiene fragmentos."}):null
  );
 }

function SongReader({song,S,label,type,Chip,capo,transpose,likedIds,toggleLike,renderToneStepper,setReaderFont,capoExpanded,setCapoExpanded,setCapo,renderAlignedScoreRows,readerFont,showReaderCues=true,setShowReaderCues,immersiveActive=false}){
  const [sectionMode,setSectionMode]=useState(false);
  const [sectionIndex,setSectionIndex]=useState(0);
  const [fitMode,setFitMode]=useState("auto");
  const [fitFont,setFitFont]=useState(readerFont);
  function manualFont(value){setFitFont(clampReaderFont(value));setFitMode("manual");}
  const {choices,chosen,offset:capoOffset}=capoSelection(song,capo);
  const toned=transpose?transposeOne(song.tone||"",transpose):song.tone||"—";
  const liked=hasFavorite(likedIds,song.id);
  const parsed=parseSong(song.lyrics||"Sin letra guardada.",transpose+capoOffset);
  const cueRows=ReaderCues.decorate(parseSong(song.lyrics||"",0),song._studio,parsed);
  const hasCues=cueRows!==parsed;
  return h(View,{style:S.songReader},
   h(View,{style:S.songReaderIntro},
    label(type(song.song_type).toUpperCase(),S.songReaderKicker),
    h(View,{style:S.songReaderTitleRow},
     h(View,{style:{flex:1,minWidth:0}},
      h(Text,{style:S.songReaderTitle},song.title||"Sin título"),
      label(names(song._artists)||"SHALOM",S.songReaderArtist)),
     h(Pressable,{onPress:()=>toggleLike(song.id),accessibilityRole:"button",
      accessibilityLabel:liked?"Quitar Me gusta":"Marcar Me gusta",
      accessibilityState:{selected:liked},style:S.songLikeButton},
      h(Text,{style:[S.songHeart,liked&&S.songHeartActive]},liked?"♥":"♡"))),
    h(View,{style:S.songReaderBadges},
     h(View,{style:S.songReaderToneBadge},label(toned,S.songReaderToneText)),
     label("Letra y acordes",S.songReaderHint))),
   h(View,{style:S.songControlsStack},
    h(View,{style:S.songCompactControls},
     h(View,{style:[S.songControlColumn,S.songControlTone]},
      label("TONO",S.songControlCaption),
      renderToneStepper(toned,true)),
     h(View,{style:[S.songControlColumn,S.songControlFont]},
      label("LETRA",S.songControlCaption),
      h(View,{style:[S.songFontControl,S.songFontCompact]},
       h(Pressable,{onPress:()=>sectionMode?manualFont(fitFont-1):setReaderFont(v=>clampReaderFont(v-1)),
        accessibilityRole:"button",accessibilityLabel:"Reducir tamaño de letra",style:S.songFontButton},
        label("A−",S.songFontText)),
       h(Pressable,{onPress:()=>sectionMode?manualFont(fitFont+1):setReaderFont(v=>clampReaderFont(v+1)),
        accessibilityRole:"button",accessibilityLabel:"Aumentar tamaño de letra",style:S.songFontButton},
        label("A+",S.songFontText)))),
     h(View,{style:[S.songControlColumn,S.songControlCapo]},
      label("CAPO",S.songControlCaption),
      h(Pressable,{style:[S.songCapoButton,S.songCapoCompact],onPress:()=>{
       if(choices.length>1)setCapoExpanded(v=>!v);
       else Alert.alert("Capo","No hay variantes de capo registradas para este canto.");
      },accessibilityRole:"button",accessibilityLabel:"Seleccionar capo",
       accessibilityState:{expanded:capoExpanded,disabled:choices.length<=1}},
       label(chosen.id==="none"?"Sin capo ▾":"Capo "+chosen.position+" ▾",S.songControlText))))),
   capoExpanded&&choices.length>1?h(View,{style:S.songCapoVariants},
    ...choices.map(item=>h(Chip,{key:String(item.id),text:item.label,
     active:item.id===capo,onPress:()=>{setCapo(item.id);setCapoExpanded(false)}}))):null,
   chosen.id!=="none"?label("Capo "+chosen.position+(chosen.key?" · Figuras en "+chosen.key:""),S.songCapoNote):null,
   hasCues?h(Pressable,{style:S.multiTextAction,accessibilityRole:"button",accessibilityState:{selected:showReaderCues},onPress:()=>setShowReaderCues(v=>!v)},label(showReaderCues?"Ocultar indicaciones":"Mostrar indicaciones",S.multiTextActionLabel)):null,
   h(Pressable,{style:S.multiTextAction,accessibilityRole:"button",accessibilityState:{selected:sectionMode},onPress:()=>setSectionMode(v=>!v)},label(sectionMode?"Lectura normal":"Lectura por secciones",S.multiTextActionLabel)),
   h(View,{style:S.songScorePlain},
    sectionMode?h(SectionReader,{rows:showReaderCues?cueRows:parsed,sectionIndex,setSectionIndex,fitMode,setFitMode,fontSize:readerFont,fitFont,onFitFont:setFitFont,onManualFont:manualFont,immersiveActive,S}):renderAlignedScoreRows(showReaderCues?cueRows:parsed,readerFont,"song-"+song.id))
  );
 }

module.exports={RepertoireReader,MedleyReader,SongReader,CollectionCapoControl,CollectionSongMenu};
