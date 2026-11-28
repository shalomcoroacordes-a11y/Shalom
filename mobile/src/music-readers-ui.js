// Musical reader presentation. All three use the existing canonical parser and shared score controls.
const h=require("react").createElement;
const {View,Text,Pressable,Image,Alert}=require("react-native");
const {parseSong,transposeOne}=require("./chords");
const {names,safeWebUrl}=require("./catalog");
const {hasFavorite}=require("./favorites");
const {capoSelection}=require("./song-capo-core");
const CollectionCapo=require("./collection-capo-ui");
const {readingPages,currentPage}=require("./reading-sections-core");
const {Mode,Pager}=require("./reading-sections-ui");
const collectionKey=(kind,id,index)=>kind+":"+id+":"+index;
const {clampReaderFont}=require("./score-zoom");
const {repertoireType}=require("./repertoire-ui");
const StudioCollections=require("./studio-collections");

function RepertoireReader({reading={},readerFont=15,renderAlignedScoreRows,rep,collectionCapos={},setCollectionCapo=()=>{},S,HOME_IMAGES,label,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,openStudioPart,selectSong}){
  const items=Array.isArray(rep.items)?rep.items:[];
  const kind=repertoireType(rep);
  const selections=items.map((item,index)=>capoSelection(model.songs.find(s=>String(s.id)===String(item.song_id)),collectionCapos[collectionKey("rep",rep.id,index)]||"none"));
  const plan=StudioCollections.plan(items.map((item,index)=>({...item,shift:transpose+selections[index].offset,capo:selections[index].chosen.position})),model.songs);
  const pages=reading.mode==="sections"?readingPages(items.map((item,index)=>({lyrics:model.songs.find(s=>String(s.id)===String(item.song_id))?.lyrics||"Canto no disponible.",shift:transpose+selections[index].offset})),parseSong):[];
  const active=currentPage(pages,reading.page);
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
   renderMultiReadingControls(),h(Mode,reading),active?h(Pager,{...reading,pages}):null,
   !immersiveActive&&kind!=="misa"?renderStudioCollectionAction(plan,"Ensayar con guitarra"):null,
   ...items.map((item,index)=>{
    if(active&&active.partIndex!==index)return null;
    const song=model.songs.find(s=>String(s.id)===String(item.song_id));
    const title=String(song?.title||item.song_title||"Canto no disponible");
    const moment=String(item.moment||"Canto "+(index+1));
    const tone=song?.tone?transposeOne(song.tone,transpose):"";
    return h(View,{key:item.id||index,style:[S.multiPart,index>0&&S.multiPartDivider]},
     h(View,{style:S.multiPartHeading},
      h(View,{style:S.multiPartNumber},label(String(index+1),S.multiPartNumberText)),
      h(View,{style:{flex:1,minWidth:0}},
       h(View,{style:S.multiMomentPill},label(moment,S.multiMomentText)),
       h(Text,{style:S.multiPartTitle},title),
       tone?label("Tono "+tone,S.multiPartDetail):null)),
     item.notes?h(Text,{style:S.multiPartNote},item.notes):null,
     song?h(CollectionCapo,{selection:selections[index],transpose,onChange:id=>setCollectionCapo(collectionKey("rep",rep.id,index),id)}):null,
     active?renderAlignedScoreRows(active.rows,readerFont,"rep-section-"+index+"-"+active.sectionIndex,true):renderMultiReadingScore(song?.lyrics||"Canto no disponible.",transpose+selections[index].offset,"rep-"+index),
     !immersiveActive&&plan.entries[index]?.ready?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>openStudioPart(song,{shift:transpose+selections[index].offset,capo:selections[index].chosen.position})},label("♫ Practicar con guitarra",S.multiOriginalText)):null,
     song?h(Pressable,{onPress:()=>selectSong(song),accessibilityRole:"button",
       accessibilityLabel:"Abrir "+title+" como canto individual",style:S.multiOriginalLink},
       label("Ver canto individual  ›",S.multiOriginalText)):null
    );
   }),
   active?h(Pager,{...reading,pages}):null,
   !items.length?h(SectionEmpty,{message:"Este repertorio todavía no tiene cantos."}):null
  );
 }

function MedleyReader({reading={},readerFont=15,renderAlignedScoreRows,medley,collectionCapos={},setCollectionCapo=()=>{},S,HOME_IMAGES,label,type,SectionEmpty,model,transpose,immersiveActive,renderMultiReadingControls,renderStudioCollectionAction,renderMultiReadingScore,setStudioQueue,setStudioPayload,selectSong,openWeb}){
  const parts=Array.isArray(medley.parts)?medley.parts:[];
  const generalTone=String(medley.base_tone||"");
  const selections=parts.map((part,index)=>capoSelection(model.songs.find(s=>String(s.id)===String(part.song_id)),collectionCapos[collectionKey("medley",medley.id,index)]||"none"));
  const practiceParts=parts.map((part,index)=>({...part,shift:transpose+Number(part.shift||0)+selections[index].offset,capo:selections[index].chosen.position}));
  const plan=StudioCollections.plan(practiceParts,model.songs);
  const sequence=StudioCollections.sequencePlan(practiceParts,model.songs,medley.title);
  const pages=reading.mode==="sections"?readingPages(practiceParts.map(part=>({lyrics:part.lyrics||model.songs.find(s=>String(s.id)===String(part.song_id))?.lyrics||"Sin letra guardada.",shift:part.shift})),parseSong):[];
  const active=currentPage(pages,reading.page);
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
   renderMultiReadingControls(),h(Mode,reading),active?h(Pager,{...reading,pages}):null,
   !immersiveActive&&sequence?h(Pressable,{style:S.multiOriginalLink,accessibilityRole:"button",onPress:()=>{setStudioQueue(null);setStudioPayload(sequence)}},label("▶ Practicar popurrí completo",S.multiOriginalText)):null,
   !immersiveActive?renderStudioCollectionAction(plan,"Practicar fragmentos disponibles"):null,
   ...parts.map((part,index)=>{
    if(active&&active.partIndex!==index)return null;
    const original=model.songs.find(song=>String(song.id)===String(part.song_id));
    const fragmentTitle=part.title||part.song_title||original?.title||"Canto "+(index+1);
    const shift=Number(part.shift||0);
    const delta=transpose+(Number.isFinite(shift)?shift:0);
    const tone=part.tone||original?.tone||"";
    const capoPosition=Number(part.capo_position||original?.capo_position||0);
    const capoKey=String(part.capo_key||original?.capo_key||"").trim();
    const otherCapos=(original?._capos||[]).filter(v=>Number(v.capo_position)>0);
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
       tone?label("Tono "+transposeOne(tone,delta),S.multiPartDetail):null,
       capoPosition>0?label("Capo: traste "+capoPosition+
        (capoKey?" · Figuras en "+capoKey:""),S.multiPartCapo):null,
       otherCapos.length?label("Otros capos: "+otherCapos.map(c=>"traste "+c.capo_position+
        (c.capo_key?" · "+c.capo_key:"")).join(" / "),S.multiPartCapo):null)),
     original?h(CollectionCapo,{selection:selections[index],transpose:delta,onChange:id=>setCollectionCapo(collectionKey("medley",medley.id,index),id)}):null,
     active?renderAlignedScoreRows(active.rows,readerFont,"medley-section-"+index+"-"+active.sectionIndex,true):renderMultiReadingScore(part.lyrics||original?.lyrics||"Sin letra guardada.",delta+selections[index].offset,"medley-"+index),
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
   active?h(Pager,{...reading,pages}):null,
   !parts.length?h(SectionEmpty,{message:"Este popurrí todavía no tiene fragmentos."}):null
  );
 }

function SongReader({reading={},song,S,label,type,Chip,capo,transpose,likedIds,toggleLike,renderToneStepper,setReaderFont,capoExpanded,setCapoExpanded,setCapo,renderAlignedScoreRows,readerFont}){
  const {choices,chosen,offset:capoOffset}=capoSelection(song,capo);
  const toned=transpose?transposeOne(song.tone||"",transpose):song.tone||"—";
  const liked=hasFavorite(likedIds,song.id);
  const parsed=parseSong(song.lyrics||"Sin letra guardada.",transpose+capoOffset,true);
  const pages=reading.mode==="sections"?readingPages([{lyrics:song.lyrics||"Sin letra guardada.",shift:transpose+capoOffset}],parseSong):[];
  const active=currentPage(pages,reading.page);
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
       h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v-1)),
        accessibilityRole:"button",accessibilityLabel:"Reducir tamaño de letra",style:S.songFontButton},
        label("A−",S.songFontText)),
       h(Pressable,{onPress:()=>setReaderFont(v=>clampReaderFont(v+1)),
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
   h(Mode,reading),active?h(Pager,{...reading,pages}):null,
   h(View,{style:S.songScorePlain},
    renderAlignedScoreRows(active?active.rows:parsed,readerFont,"song-"+song.id+(active?"-section-"+active.sectionIndex:""),!!active)),active?h(Pager,{...reading,pages}):null
  );
 }

module.exports={RepertoireReader,MedleyReader,SongReader};
