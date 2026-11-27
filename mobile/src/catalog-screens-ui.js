// Read-only catalog screens. The root owns state and navigation, each screen owns its presentation.
const h=require("react").createElement;
const {View,Text,TextInput,Pressable,ScrollView,Image}=require("react-native");
const {normalize,names}=require("./catalog");
const {matchesSearch}=require("./navigation-core");
const {filterRepertoires}=require("./repertoire-ui");
const {InitialCover}=require("./visual-ui");
const {LibraryHero,LibrarySearch,LibraryChipRow,LibrarySongRow,LibraryArtistCard}=require("./library-ui");
const SONG_TYPES=[["","Todos"],["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"],["general","General"]];
function SongsScreen({S,C,icons={},label,type,Btn,SectionEmpty,onlyLiked,typeFilter,setOnlyLiked,setTypeFilter,setCountLimit,setSongLibraryOpen,query,setQuery,songLibraryOpen,goTab,copy,busy,manualSync,eligible,countLimit,likedSet,selectSong,toggleLike,setActionSongId}){
  const chosen=onlyLiked?"liked":typeFilter||"all";
  const options=[["all","Todos"],["catolico","Católicos"],
   ["cristiano","Cristianos"],["liked","Mis me gusta"]];
  const selectLibraryFilter=value=>{
   setOnlyLiked(value==="liked");
   setTypeFilter(value==="all"||value==="liked"?"":value);
   setCountLimit(80);
   setSongLibraryOpen(true);
  };
  const searchValue=h(View,{style:S.cantosSearch},
   label("⌕",S.cantosSearchIcon),
   h(TextInput,{value:query,onChangeText:value=>{setQuery(value);setCountLimit(80);},
    style:S.cantosSearchInput,placeholder:"Buscar letras, acordes y títulos",
    placeholderTextColor:C.muted,returnKeyType:"search",autoCorrect:false,
    accessibilityLabel:"Buscar letras, acordes y títulos",
    onSubmitEditing:()=>setSongLibraryOpen(true)}));
  return h(View,{style:S.cantosPage},
   songLibraryOpen?h(Pressable,{onPress:()=>{setSongLibraryOpen(false);setQuery("");setTypeFilter("");setOnlyLiked(false);},
    style:S.cantosBack,accessibilityRole:"button",accessibilityLabel:"Volver a la portada de Cantos"},
    label("‹  Cantos",S.cantosBackText)):null,
   label(songLibraryOpen?"Biblioteca de cantos":"Cantos",S.cantosPageTitle),
   searchValue,
   h(View,{style:S.cantosFilterRow},
    ...options.map(([value,name])=>h(Pressable,{key:value,
     style:[S.cantosFilterChip,value===chosen&&S.cantosFilterSelected],
     accessibilityRole:"button",accessibilityLabel:"Filtrar cantos: "+name,
     accessibilityState:{selected:value===chosen},onPress:()=>selectLibraryFilter(value)},
     label(name,[S.cantosFilterText,value===chosen&&S.cantosFilterTextSelected])))),
   !songLibraryOpen?h(View,{style:S.cantosOverviewContent},
    h(Pressable,{style:S.cantosLibraryCard,onPress:()=>setSongLibraryOpen(true),
     accessibilityRole:"button",accessibilityLabel:"Abrir Biblioteca de cantos"},
     h(View,{style:{flex:1,minWidth:0}},
      label("Biblioteca de cantos",S.cantosLibraryTitle),
      label("Listado de canciones disponibles con su artista y opciones.",S.cantosLibraryDescription)),
     label("♫",S.cantosLibraryIcon)),
    h(View,{style:S.cantosExploreSection},
     label("Explorar también por",S.cantosExploreHeading),
     h(View,{style:S.cantosExploreGrid},
      ...[["Artistas","Artistas"],["Categorías","Categorías"],["Álbumes","Álbumes"],
       ["Popurrís oficiales","Popurrís"]].map(([name,dest])=>
       h(Pressable,{key:name,onPress:()=>goTab(dest),style:S.cantosExploreTile,
        accessibilityRole:"button",accessibilityLabel:"Explorar "+name},
        label(name,S.cantosExploreTileText))))),
    !copy?.syncedAt?h(View,{style:S.cantosOfflinePrompt},
     label("Descarga el cancionero para consultar todos los cantos sin conexión.",S.librarySubtitle),
     h(Btn,{text:busy?"Descargando…":"Descargar biblioteca",onPress:manualSync,disabled:busy})):null
   ):h(View,{style:S.cantosLibraryResults},
    h(View,{style:S.libraryTitleRow},
     label(onlyLiked?"Mis me gusta":typeFilter==="catolico"?"Cantos católicos":
      typeFilter==="cristiano"?"Cantos cristianos":"Todos los cantos",S.librarySectionTitle),
     label(eligible.length+" "+(eligible.length===1?"canto":"cantos"),S.libraryCount)),
    h(View,{style:S.libraryList},
     ...eligible.slice(0,countLimit).map(song=>h(LibrarySongRow,{icons,key:song.id,song,
      artistName:names(song._artists)||type(song.song_type),tone:song.tone,
      liked:likedSet.has(String(song.id)),onOpen:()=>selectSong(song),
      onLike:()=>toggleLike(song.id),onOptions:()=>setActionSongId(String(song.id))})),
     eligible.length>countLimit?h(Btn,{text:"Mostrar más cantos",secondary:true,
      onPress:()=>setCountLimit(v=>v+80)}):null,
     !eligible.length?h(SectionEmpty,{message:copy?.syncedAt?
      "No hay cantos que coincidan con tu búsqueda.":"Descarga la biblioteca para ver los cantos."}):null),
    !copy?.syncedAt?h(Btn,{text:"Descargar cancionero",onPress:manualSync,disabled:busy}):null));
 }

function ArtistsScreen({S,icons={},label,type,Btn,SectionEmpty,filteredArtists,query,setQuery,setCountLimit,libraryFiltersVisible,setLibraryFiltersVisible,artistTypeFilter,setArtistTypeFilter,countLimit,model,openDetail}){
  const filtered=filteredArtists;
  return h(View,{style:S.repPage},
   h(LibraryHero,{title:"Artistas",
    subtitle:"Coros, ministerios y cantores de alabanza.",preset:"choir"}),
   h(LibrarySearch,{icons,value:query,onChangeText:v=>{setQuery(v);setCountLimit(80)},
    placeholder:"Buscar artistas o ministerios…",showFilters:libraryFiltersVisible,
    onFilters:()=>setLibraryFiltersVisible(v=>!v)}),
   libraryFiltersVisible?h(LibraryChipRow,{options:SONG_TYPES,value:artistTypeFilter,
    onChange:val=>{setArtistTypeFilter(val);setCountLimit(80)}}):null,
   h(View,{style:S.libraryTitleRow},
    label("Nuestros artistas",S.librarySectionTitle),
    label(filtered.length+" "+(filtered.length===1?"artista":"artistas"),S.libraryCount)),
   h(View,{style:S.artistGrid},
    ...filtered.slice(0,countLimit).map(a=>{
     const count=model.songsForArtist(a.id).length;
     return h(LibraryArtistCard,{key:a.id,artist:a,count,type:type(a.artist_type),
      onOpen:()=>openDetail({type:"artist",id:a.id})});
    })),
   filtered.length>countLimit?h(Btn,{text:"Mostrar más artistas",secondary:true,
    onPress:()=>setCountLimit(v=>v+80)}):null,
   !filtered.length?h(SectionEmpty,{message:"No hay artistas que coincidan con tu búsqueda."}):null);
 }

function CategoriesScreen({S,label,type,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty,model,folderId,folderType,query,setFolderType,setFolderId,setQuery,sectionSearchOpen,selectSong}){
  const current=model.categoryMap.get(folderId);
  const typeChoices=[["","Todas",null],["catolico","Católico",null],
   ["cristiano","Cristiano",null],["mixto","Mixto",null],["general","General",null]];
  const term=normalize(query.trim());
  const countFolders=code=>model.categories.filter(c=>(normalize(c.song_type)||"general")===code).length;
  const typeNames={catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto",general:"General"};
  const rootTypes=["catolico","cristiano","mixto","general"];
  const allMatches=model.categories.filter(c=>
   matchesSearch([c.name,c.description],query)&&
   (!folderType||(normalize(c.song_type)||"general")===folderType));
  const children=current?model.children(current.id):model.children("",folderType);
  const visibleChildren=term?children.filter(c=>matchesSearch([c.name,c.description],query)):children;
  const songs=current?model.songsForCategory(current.id):[];
  const visibleSongs=term?songs.filter(song=>matchesSearch([song.title,names(song._artists)],query)):songs;
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Categorías",subtitle:"Explora por tema o celebración",icon:"categories"}),
   h(SectionFilterBar,{options:typeChoices,value:folderType,
    onChange:val=>{setFolderType(val);setFolderId("");setQuery("")}}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,placeholder:"Buscar carpetas o temas…"}):null,
   current?h(View,{style:S.categoryPath},
    h(Pressable,{onPress:()=>setFolderId(""),accessibilityRole:"button",
     accessibilityLabel:"Volver a categorías principales",style:S.categoryBack},
     label("‹  "+(typeNames[folderType]||"Categorías"),S.categoryBackText)),
    label(model.categoryPath(current),S.categoryPathText)):null,
   h(View,{style:S.repCards},
    ...(!folderType&&!term?rootTypes.map(code=>h(SectionListCard,{key:code,
     title:typeNames[code],subtitle:countFolders(code)+" "+(countFolders(code)===1?"carpeta":"carpetas"),
     icon:"categories",onPress:()=>{setFolderType(code);setFolderId("");setQuery("")}})):[]),
    ...(!folderType&&term?allMatches.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:(typeNames[normalize(c.song_type)]||"General")+" · "+
      model.songsForCategory(c.id).length+" cantos",icon:"categories",
     onPress:()=>{setFolderType(normalize(c.song_type)||"general");setFolderId(c.id);setQuery("")}})):[]),
    ...(folderType?visibleChildren.map(c=>h(SectionListCard,{key:c.id,title:c.name,
     subtitle:model.songsForCategory(c.id).length+" cantos · "+
      model.children(c.id).length+" subcarpetas",icon:"categories",
     onPress:()=>{setFolderId(c.id);setQuery("")}})):[]),
    current?h(View,{style:S.categorySongHeading},
     label("Cantos de "+current.name,S.categorySongTitle),
     label(visibleSongs.length+" cantos",S.sectionSupporting)):null,
    ...(current?visibleSongs.map(song=>h(SectionListCard,{key:song.id,title:song.title,
     subtitle:names(song._artists)||type(song.song_type),meta:song.tone?"Tono "+song.tone:null,
     icon:"song",onPress:()=>selectSong(song)})):[]),
    ((folderType&&!visibleChildren.length&&!current)||
     (term&&!allMatches.length&&!folderType)||
     (current&&!visibleChildren.length&&!visibleSongs.length))
     ?h(SectionEmpty,{message:"No se encontraron categorías o cantos en esta sección."}):null)
  );
 }

function RepertoiresScreen({S,C,HOME_IMAGES,label,model,repertoireFilter,query,setRepertoireFilter,repertoireSearchOpen,setQuery,selectRepertoire,copy,requestForm,setRequestTitle}){
  const sections=[
   ["todos","Todos",null],
   ["misa","Misa","mass"],
   ["ensayo","Ensayo","artists"],
   ["otras","Otras","calendar"]
  ];
  const visible=filterRepertoires(model.repertoires,repertoireFilter,query);
  return h(View,{style:S.repPage},
   h(View,{style:S.repHeading},
    h(View,{style:{flex:1,minWidth:0}},
     h(Text,{style:S.repTitle,numberOfLines:1,adjustsFontSizeToFit:true,minimumFontScale:.8},"Repertorios"),
     label("Publicados por SHALOM · Misas, ensayos y celebraciones",S.repSubtitle))),
   h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
    contentContainerStyle:S.repFilters},
    ...sections.map(([code,name,icon])=>{
     const active=repertoireFilter===code;
     return h(Pressable,{key:code,accessibilityRole:"button",accessibilityLabel:"Filtrar: "+name,
      accessibilityState:{selected:active},onPress:()=>setRepertoireFilter(code),
      style:[S.repFilterChip,active&&S.repFilterActive]},
      icon?h(Image,{source:HOME_IMAGES[icon],resizeMode:"contain",
       style:[S.repFilterIcon,{tintColor:active?C.bg:C.text}]}):null,
      label(name,[S.repFilterText,active&&S.repFilterTextActive]));
    })),
   repertoireSearchOpen?h(TextInput,{style:S.repSearchInput,value:query,onChangeText:setQuery,
    placeholder:"Buscar por repertorio, fecha o lugar…",placeholderTextColor:C.muted,
    accessibilityLabel:"Buscar repertorios",autoCorrect:false}):null,
   h(View,{style:S.repCards},
    ...visible.map(rep=>{
     const count=Array.isArray(rep.items)?rep.items.length:0;
     return h(Pressable,{key:rep.id,onPress:()=>selectRepertoire(rep),
      accessibilityRole:"button",accessibilityLabel:(rep.title||"Repertorio")+", "+count+" cantos",
      style:S.repCard},
      h(InitialCover,{title:rep.title||"Repertorio",size:53}),
      h(View,{style:{flex:1,minWidth:0}},
       h(Text,{style:S.repCardTitle,numberOfLines:2},rep.title||"Repertorio sin título"),
       label(count+" "+(count===1?"canto":"cantos"),S.repCardCount),
       (rep.event_date||rep.location)?h(Text,{style:S.repCardMeta,numberOfLines:1},
        [rep.event_date,rep.location].filter(Boolean).join(" · ")):null),
      label("›",S.repArrow));
    }),
    !visible.length?h(View,{style:S.repEmptyCard},
     h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repEmptyLogo}),
     label(!copy?.syncedAt?"Todavía no hay repertorios descargados. Actualiza el cancionero desde Ajustes.":"No hay repertorios que coincidan con esta selección.",S.repEmptyText)):null
   ),
   h(Pressable,{style:S.repSuggest,onPress:()=>{
     requestForm("other");setRequestTitle("Sugerencia de repertorio");
    },accessibilityRole:"button",accessibilityLabel:"Sugerir un repertorio al administrador"},
    label("＋",S.repSuggestIcon),
    label("Sugerir un repertorio",S.repSuggestCaption),
    label("›",S.homeRecentArrow))
  );
 }

function MedleysScreen({S,label,type,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty,model,medleyTypeFilter,query,setMedleyTypeFilter,sectionSearchOpen,setQuery,selectMedley,copy}){
  const filtered=model.medleys.filter(m=>
   (!medleyTypeFilter||normalize(type(m.song_type))===medleyTypeFilter)
   &&matchesSearch([m.title,m.description,m.song_type],query));
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Popurrís",subtitle:"Varios cantos unidos en una sola lectura",icon:"medleys"}),
   h(SectionFilterBar,{options:SONG_TYPES.map(([code,name])=>[code,name,null]),
    value:medleyTypeFilter,onChange:setMedleyTypeFilter}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,
    placeholder:"Buscar popurrí o celebración…"}):null,
   label(filtered.length+" "+(filtered.length===1?"popurrí":"popurrís"),S.sectionResults),
   h(View,{style:S.repCards},
    ...filtered.map(m=>{
     const fragments=Array.isArray(m.parts)?m.parts.length:0;
     return h(SectionListCard,{key:m.id,title:m.title||"Popurrí",
      subtitle:fragments+" "+(fragments===1?"fragmento":"fragmentos")+" · "+type(m.song_type),
      icon:"medleys",onPress:()=>selectMedley(m)});
    }),
    !filtered.length?h(SectionEmpty,{message:copy?.syncedAt?
     "Todavía no hay popurrís publicados con estos filtros.":
     "Actualiza el cancionero para consultar los popurrís."}):null)
  );
 }

module.exports={SongsScreen,ArtistsScreen,CategoriesScreen,RepertoiresScreen,MedleysScreen};
