// Home presentation. Personal state, downloads and navigation stay with the root.
const React=require("react"),h=React.createElement;
const {View,Text,TextInput,Pressable,Image}=require("react-native");
const {normalize,names}=require("./catalog");
const {personalCounts,officialHighlights,recentCatalog}=require("./home-spotlight");
const {InitialCover}=require("./visual-ui");
const {CoverArt}=require("./personal-cover-ui");
const {homeContext}=require("./liturgical-calendar");
const CalendarPanel=require("./calendar-panel-ui");
function HomeScreen({S,C,HOME_IMAGES,label,Btn,SongRow,homeSearch,setHomeSearch,homeMatches,lastRead,model,profile,personal,likedIds,goTab,selectSong,selectMedley,selectRepertoire,openMusician,openDetail,manualSync,busy,copy,setSettingsOpen,progress,error}){
  const [tab,setTab]=React.useState("Para ti");
  const context=homeContext(model);
  const term=normalize(homeSearch.trim());
  const found=homeMatches;
  const recent=lastRead?.type==="song"?model.songs.find(song=>song.id===lastRead.id):null;
  function goBanner(){
   switch(profile.bannerAction){
    case "repertorios":return goTab("Repertorios");
    case "favoritos":return goTab("Canciones",{liked:true});
    case "popurris":return goTab("Mis colecciones",{personalKind:"popurri"});
    case "recientes":return recent?selectSong(recent):goTab("Canciones");
    default:return goTab("Canciones");
   }
  }
  const counts=personalCounts(personal,likedIds);
  const official=officialHighlights(model,new Date());
  const recentSongs=recentCatalog(model.songs),recentArtists=recentCatalog(model.artists);
  const pressedStyle=style=>({pressed})=>[style,pressed&&S.homePressed];
  const shortcuts=[
   ["heart","Mis me gusta","Cantos favoritos",counts.likes,()=>goTab("Canciones",{liked:true})],
   ["medleys","Mis popurrís","Cantos enlazados",counts.medleys,()=>goTab("Mis colecciones",{personalKind:"popurri"})],
   ["mass","Mis misas","Celebraciones guardadas",counts.masses,()=>goTab("Mis colecciones",{personalKind:"misa"})],
   ["repertoires","Mis repertorios","Ensayos y selecciones",Math.max(0,counts.creations-counts.medleys-counts.masses),()=>goTab("Mis colecciones",{personalKind:"repertorio"})]
  ];
  const tabs=["Para ti","Liturgia","Ensayar","Mis cantos"];
  const tabBar=h(View,{style:S.smartTabs},...tabs.map(name=>h(Pressable,{key:name,style:[S.smartTab,tab===name&&S.smartTabActive],onPress:()=>{setHomeSearch("");setTab(name)},accessibilityRole:"tab",accessibilityState:{selected:tab===name},accessibilityLabel:name},h(Text,{style:S.smartTabText},name))));
  const accessGrid=h(View,{style:S.spotifyShortcuts},...shortcuts.map(([icon,name,subtitle,count,onPress])=>h(Pressable,{key:name,onPress,accessibilityRole:"button",accessibilityLabel:name+": "+count,style:({pressed})=>[S.spotifyShortcut,pressed&&S.smartShortcutPressed]},h(Image,{source:HOME_IMAGES[icon],resizeMode:"contain",style:S.spotifyShortcutImage,accessible:false}),label(name,S.spotifyShortcutName),count>0?label(count,S.spotifyShortcutCountText):null)));
  const eventRow=(event)=>h(Pressable,{key:String(event.id),style:pressedStyle(S.homeRecentCard),onPress:()=>selectRepertoire(event),accessibilityRole:"button",accessibilityLabel:"Abrir "+event.title},h(View,{style:{flex:1}},h(Text,{style:S.homeRecentTitle},event.title),h(Text,{style:S.homeRecentSubtitle},event.event_date+" · "+event.items.length+" cantos")),label("›",S.homeRecentArrow));
  if(tab!=="Para ti")return h(View,{style:S.homeContainer},tabBar,
   tab==="Liturgia"?h(CalendarPanel,{context,onOpen:selectRepertoire}):tab==="Ensayar"?h(View,{style:S.spotifyBlock},label("Próximos ensayos",S.spotifyHeading),...context.events.filter(e=>e.event_date>=context.today&&/^(ensayo|rehearsal|practica|practice)$/i.test(String(e.kind||""))).map(eventRow),h(Btn,{text:"Explorar repertorios",secondary:true,onPress:()=>goTab("Repertorios")}),recent?h(Btn,{text:"Volver al último canto",secondary:true,onPress:()=>selectSong(recent)}):null):h(View,{style:S.spotifyBlock},label("Tus accesos",S.spotifyHeading),accessGrid,h(Btn,{text:"Abrir biblioteca de cantos",secondary:true,onPress:()=>goTab("Canciones",{openLibrary:true})})));
  return h(View,{style:S.homeContainer},
   h(View,{style:S.spotifyWelcome},
    label(context.greeting,S.spotifyWelcomeTitle),
    label(context.subtitle,S.spotifyWelcomeText)),
   tabBar,
   h(View,{style:S.shalomToday},
    h(View,{style:S.shalomTodayHeader},
     h(View,{style:S.todayTitleWrap},
      h(Image,{source:HOME_IMAGES.calendar,style:S.todayTitleIcon,resizeMode:"contain",accessible:false}),label("Hoy en SHALOM",S.shalomTodayHeading)),
     h(Pressable,{onPress:manualSync,disabled:busy,style:S.shalomTodayRefresh,
      accessibilityRole:"button",accessibilityLabel:"Actualizar publicaciones del coro"},
      label(busy?"…":"↻",S.shalomTodayRefreshIcon))),
    
    ...official.map((item,index)=>h(Pressable,{key:item.type+"-"+item.id,
     style:[S.shalomTodayCard,index>0&&S.todayEntryDivider],onPress:()=>{
      if(item.type==="medley"){
       const medley=model.medleys.find(x=>String(x.id)===item.id);
       if(medley)selectMedley(medley);
      }else{
       const rep=model.repertoires.find(x=>String(x.id)===item.id);
       if(rep)selectRepertoire(rep);
      }
     },accessibilityRole:"button",accessibilityLabel:"Abrir "+item.label+": "+item.title},
     h(View,{style:S.todayEntryBody},
      h(Text,{style:S.shalomTodayLabel},item.label.toUpperCase()),
      h(Text,{style:S.shalomTodayTitle,numberOfLines:2},item.title),
      h(Text,{style:S.shalomTodayMeta,numberOfLines:2},
       [item.subtitle,item.count+" "+(item.count===1?"canto":"cantos")].filter(Boolean).join(" · ")),
      Number.isInteger(item.daysUntil)?h(Text,{style:S.todayCountdown},item.daysUntil===0?"Hoy":item.daysUntil===1?"Mañana":"En "+item.daysUntil+" días"):null),
     label("›",S.shalomTodayArrow))),
    context.current&&context.current.kind==="misa"&&openMusician?h(Pressable,{style:S.smartPrimary,onPress:()=>openMusician(context.current),accessibilityRole:"button",accessibilityLabel:"Iniciar modo músico"},h(Text,{style:S.smartPrimaryText},"Iniciar modo músico")):null,
    !official.length?h(View,{style:S.shalomTodayEmpty},
     label(copy?.syncedAt?
      "Aquí aparecerán las misas, repertorios y popurrís que publique el coro.":
      "Descarga el cancionero para ver las publicaciones oficiales de SHALOM.",S.shalomTodayEmptyText),
     label("Publicaciones oficiales",S.todayFootnote),
     !copy?.syncedAt?h(Btn,{text:"Descargar biblioteca",onPress:manualSync,
      disabled:busy,small:true}):null):null),
   h(View,{style:S.spotifyBlock},label("Pensado para ti",S.spotifyHeading),h(View,{style:S.spotifyShortcuts},...[
    [context.day?.seasonName?"Explora "+context.day.seasonName:"Calendario litúrgico","calendar","#354052",()=>setTab("Liturgia")],
    ["Vuelve a practicar","song","#29483e",()=>setTab("Ensayar")],
    ["Tu próxima celebración","mass","#314653",()=>context.next?selectRepertoire(context.next):setTab("Liturgia")],
    ["Descubre nuevos cantos","artists","#4a4135",()=>goTab("Canciones",{openLibrary:true})]
   ].map(([name,icon,color,onPress])=>h(Pressable,{key:name,style:({pressed})=>[S.smartSuggestion,{backgroundColor:color},pressed&&S.homePressed],onPress,accessibilityRole:"button",accessibilityLabel:name},h(Image,{source:HOME_IMAGES[icon],style:S.spotifyShortcutImage,resizeMode:"contain",accessible:false}),label(name,S.spotifyShortcutName))))),
   h(View,{style:S.homeSearchWrap},
    h(Image,{source:HOME_IMAGES.search,resizeMode:"contain",style:S.homeSearchIcon}),
    h(TextInput,{style:S.homeSearch,value:homeSearch,onChangeText:setHomeSearch,
     placeholder:"Buscar canto, artista o tema…",placeholderTextColor:C.muted,
     accessibilityLabel:"Buscar canto, artista o tema",returnKeyType:"search",
     onSubmitEditing:()=>{if(homeSearch.trim())goTab("Canciones",{search:homeSearch})}})),
   term?h(View,{style:S.homeResults},
    ...found.map(song=>h(SongRow,{key:song.id,song,onPress:()=>selectSong(song)})),
    !found.length?label("No se encontraron cantos.",S.empty):null,
    h(Btn,{text:"Ver todos los resultados",secondary:true,onPress:()=>goTab("Canciones",{search:homeSearch})})):null,
   h(View,{style:S.spotifyBlock},
    label("Continuar donde te quedaste",S.spotifyHeading),
    h(Pressable,{style:S.homeRecentCard,onPress:()=>recent?selectSong(recent):goTab("Canciones"),
     accessibilityRole:"button",accessibilityLabel:recent?"Continuar con "+recent.title:"Explorar cantos"},
     h(InitialCover,{title:recent?.title||"Cantos",size:36}),
     h(View,{style:{flex:1,minWidth:0}},
      h(Text,{style:S.homeRecentTitle,numberOfLines:1},
       recent?recent.title:"Abre un canto para comenzar"),
      recent?h(Text,{style:S.homeRecentSubtitle,numberOfLines:1},
       names(recent._artists)||"Último canto consultado"):null),
     label("›",S.homeRecentArrow))),
   h(View,{style:S.spotifyBlock},label("Tus accesos",S.spotifyHeading)),
   accessGrid,
   recentSongs.length?h(View,{style:S.spotifyBlock},label("Cantos recientes",S.spotifyHeading),
    ...recentSongs.map(song=>h(Pressable,{key:song.id,style:pressedStyle(S.homeRecentCard),accessibilityRole:"button",accessibilityLabel:"Abrir canto reciente "+song.title,onPress:()=>selectSong(song)},
     h(InitialCover,{title:song.title,size:36}),h(View,{style:{flex:1,minWidth:0}},h(Text,{style:S.homeRecentTitle,numberOfLines:1},song.title),h(Text,{style:S.homeRecentSubtitle,numberOfLines:1},names(song._artists)||"SHALOM")),label("›",S.homeRecentArrow)))):null,
   recentArtists.length?h(View,{style:S.spotifyBlock},label("Artistas nuevos y actualizados",S.spotifyHeading),
    ...recentArtists.map(artist=>h(Pressable,{key:artist.id,style:pressedStyle(S.homeRecentCard),accessibilityRole:"button",accessibilityLabel:"Abrir artista "+artist.name,onPress:()=>openDetail({type:"artist",id:artist.id})},
     h(InitialCover,{title:artist.name,size:36,round:true}),h(Text,{style:[S.homeRecentTitle,{flex:1}],numberOfLines:1},artist.name),label("›",S.homeRecentArrow)))):null,
   h(Pressable,{style:S.spotifyBannerMini,onPress:goBanner,accessibilityRole:"button",
    accessibilityLabel:"Destacado: "+(profile.bannerTitle||"Explorar cantos")},
    h(View,{style:S.spotifyBannerMiniCover},
     h(CoverArt,{preset:profile.bannerPreset,photo:profile.banner||profile.cover,
      color:C.green,height:53})),
    h(View,{style:{flex:1,minWidth:0}},
     label("DESTACADO DE TU PERFIL",S.spotifyBannerEyebrow),
     h(Text,{style:S.spotifyBannerMiniTitle,numberOfLines:1},profile.bannerTitle||"Cantos de SHALOM")),
    label("›",S.homeRecentArrow)),
   h(View,{style:S.spotifyBlock},
    label("Descubre más en SHALOM",S.spotifyHeading),
    h(View,{style:S.homeGrid},...[
     ["Explorar","Artistas, álbumes y categorías","categories","Explorar"],
     ["Popurrís oficiales","Cantos unidos por SHALOM","medleys","Popurrís"],
     ["Álbumes","Colecciones oficiales","albums","Álbumes"],
     ["Más opciones","Solicitudes y ajustes","more","Más"]
    ].map(([name,subtitle,icon,destination])=>h(Pressable,{
     key:name,onPress:()=>goTab(destination),style:pressedStyle(S.homeTile),accessibilityRole:"button"},
     h(View,{style:S.homeTileIcon},
      h(Image,{source:HOME_IMAGES[icon],style:S.homeTileImage,resizeMode:"contain"})),
     h(View,{style:{flex:1,minWidth:0}},label(name,S.homeTileName),label(subtitle,S.homeTileSubtitle)))))),

   !copy?.syncedAt?h(Pressable,{style:S.homeNeedsSync,onPress:()=>setSettingsOpen(true),accessibilityRole:"button"},
    label("↓ Descargar cancionero sin conexión  ›",S.homeSyncText)):null,
   busy?label("Sincronizando… "+progress,S.info):null,error?label(error,S.error):null);
 }

module.exports=HomeScreen;
