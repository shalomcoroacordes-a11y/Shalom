// Estilo visual compartido por Canciones y Artistas. Solo usa datos reales del catálogo.
// Las canciones siempre muestran iniciales: no se inventan fotos ni duración de audio.
const React=require("react");
const {useState}=React;
const {View,Text,TextInput,Pressable,ScrollView,Image,StyleSheet}=require("react-native");
const {InitialCover}=require("./visual-ui");
const {safeWebUrl}=require("./catalog");
const h=React.createElement;
const T={green:"#27c98b",fg:"#f4f7f7",sub:"#c3d5d5",bg:"#0e1219"};
const txt=(text,style)=>h(Text,{style},String(text??""));
function LibraryHero({title,subtitle}){
 return h(View,{style:S.hero},
  h(Text,{style:S.heroTitle},title),
  h(Text,{style:S.heroSubtitle},subtitle));
}

function LibrarySearch({value,onChangeText,placeholder,showFilters=true,onFilters}){
 return h(View,{style:S.searchArea},
  h(View,{style:S.searchBox},
   txt("⌕",S.searchIcon),
   h(TextInput,{value,onChangeText,style:S.searchInput,placeholder,placeholderTextColor:"#b9caca",
    returnKeyType:"search",autoCorrect:false,accessibilityLabel:placeholder})),
  h(Pressable,{onPress:onFilters,style:[S.filterButton,showFilters&&S.filterActive],
   accessibilityRole:"button",accessibilityLabel:showFilters?"Ocultar filtros":"Mostrar filtros",
   accessibilityState:{expanded:showFilters}},
   txt("☷",S.filterText)));
}
function LibraryChipRow({options,value,onChange}){
 return h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
  style:S.filters,contentContainerStyle:S.filtersBody},
  ...options.map(([code,name])=>h(Pressable,{key:String(code),onPress:()=>onChange(code),
   accessibilityRole:"button",accessibilityLabel:"Filtrar: "+name,
   accessibilityState:{selected:code===value},
   style:[S.chip,code===value&&S.chipSelected]},
   txt(name,[S.chipText,code===value&&S.chipSelectedText]))));
}
function LibrarySongRow({song,artistName,tone,liked,onOpen,onLike,onOptions,compact=false}){
 const stop=(e,callback)=>{e?.stopPropagation?.();callback()};
 return h(Pressable,{style:compact?[S.songRow,S.compactSongRow]:S.songRow,onPress:onOpen,accessibilityRole:"button",
  accessibilityLabel:"Abrir "+(song.title||"Canto")},
  h(InitialCover,{title:song.title,size:compact?42:57}),
  h(View,{style:{flex:1,minWidth:0}},
   h(Text,{style:S.songTitle,numberOfLines:2},song.title||"Sin título"),
   (artistName||tone||!compact)?h(Text,{style:S.songMeta,numberOfLines:1},[artistName,tone?"Tono "+tone:""].filter(Boolean).join(" · ")||"SHALOM"):null),
  h(Pressable,{onPress:e=>stop(e,onLike),style:S.smallTouch,
   accessibilityRole:"button",accessibilityLabel:liked?"Quitar de Mis me gusta":"Agregar a Mis me gusta"},
   h(Text,{style:[S.heart,liked&&S.heartActive]},liked?"♥":"♡")),
  h(Pressable,{onPress:e=>stop(e,onOptions),style:S.menuTouch,accessibilityRole:"button",
   accessibilityLabel:"Opciones de "+(song.title||"canto")},
   txt("⋮",S.dots)));
}
function FavoriteSongCard({song,artistName,onOpen,onLike}){
 return h(Pressable,{style:S.favorite,onPress:onOpen,accessibilityRole:"button",
  accessibilityLabel:"Abrir favorito "+song.title},
  h(View,{style:S.favoriteCover},
   h(InitialCover,{title:song.title||"Canto",size:104,full:true}),
   h(Pressable,{style:S.favoriteHeart,onPress:e=>{e?.stopPropagation?.();onLike();},
    accessibilityRole:"button",accessibilityLabel:"Quitar de Mis me gusta"},
    txt("♥",S.favoriteHeartText))),
  h(View,{style:S.favoriteBottom},
   h(Text,{style:S.favoriteTitle,numberOfLines:2},song.title||"Canto"),
   h(Text,{style:S.favoriteArtist,numberOfLines:1},artistName||"SHALOM")));
}
function ArtistAvatar({artist,size=62,online=true}){
 const [failed,setFailed]=useState(null);
 const photo=online?safeWebUrl(artist?.image_url||artist?.photo_url||artist?.avatar_url||artist?.cover_url||""):null;
 if(!photo||failed===photo)return h(InitialCover,{title:artist?.name||"Artista",size,round:true});
 return h(Image,{source:{uri:photo},style:{width:size,height:size,borderRadius:size/2,
  borderWidth:1,borderColor:"#79c9a5"},onError:()=>setFailed(photo),resizeMode:"cover"});
}
function LibraryArtistCard({artist,count,type,onOpen}){
 return h(Pressable,{style:S.artistCard,onPress:onOpen,accessibilityRole:"button",
  accessibilityLabel:"Abrir artista "+(artist?.name||"")},
  h(View,{style:S.artistContent},
   h(ArtistAvatar,{artist,size:64}),
   h(Text,{style:S.artistTitle,numberOfLines:2},artist.name||"Sin nombre"),
   h(Text,{style:S.artistType,numberOfLines:1},type),
   h(Text,{style:S.artistCount,numberOfLines:1},count+" "+(count===1?"canto":"cantos"))));
}
const S=StyleSheet.create({
 hero:{gap:5,paddingHorizontal:1,paddingVertical:6,marginBottom:12},
 heroShade:{position:"absolute",top:0,bottom:0,left:0,right:0},
 heroText:{position:"absolute",left:16,right:16,bottom:18},
 heroTitle:{fontSize:25,fontWeight:"750",lineHeight:32,color:T.fg},
 heroSubtitle:{color:"#b0c0c7",fontSize:12.5,lineHeight:19,maxWidth:"100%"},
 searchArea:{flexDirection:"row",gap:8,alignItems:"center",marginBottom:14},
 searchBox:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",height:47,
  backgroundColor:"#181d24",borderColor:"#3a444c",borderWidth:1,borderRadius:14,
  paddingHorizontal:13},
 searchIcon:{fontSize:29,color:"#9eeac3",marginRight:9,lineHeight:33},
 searchInput:{fontSize:13,color:T.fg,flex:1,paddingVertical:7},
 filterButton:{width:48,height:47,borderRadius:14,borderColor:"#3a444c",borderWidth:1,
  alignItems:"center",justifyContent:"center",backgroundColor:"#23272e"},
 filterActive:{borderColor:"#67a98a"},
 filterText:{fontSize:24,color:T.green,lineHeight:29},
 filters:{marginBottom:5},
 filtersBody:{flexDirection:"row",gap:7,paddingVertical:2,paddingBottom:10},
 chip:{minHeight:39,borderRadius:99,borderWidth:1,borderColor:"#3a444c",
  paddingHorizontal:14,alignItems:"center",justifyContent:"center",backgroundColor:"#23272e"},
 chipSelected:{backgroundColor:T.green,borderColor:T.green},
 chipText:{fontSize:12,fontWeight:"750",color:T.fg},
 chipSelectedText:{color:"#052d1c"},
 songRow:{minHeight:75,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:8,
  paddingVertical:8,backgroundColor:"#23272e",borderRadius:14,
  borderWidth:1,borderColor:"#363f44"},
 compactSongRow:{backgroundColor:"transparent",borderWidth:0,borderBottomWidth:1,borderColor:"#354650",borderRadius:0,minHeight:60,paddingHorizontal:0},
 songTitle:{fontSize:14.5,fontWeight:"850",color:T.fg,lineHeight:19},
 songMeta:{color:T.sub,fontSize:11,marginTop:4},
 smallTouch:{width:44,height:45,alignItems:"center",justifyContent:"center"},
 heart:{fontSize:26,color:"#dfe9e5"},
 heartActive:{color:T.green},
 menuTouch:{width:44,height:44,alignItems:"center",justifyContent:"center"},
 dots:{fontSize:25,color:T.fg,lineHeight:29},
 favorite:{width:137,backgroundColor:"#1b2b34",borderWidth:1,borderColor:"#3a5e51",
  borderRadius:14,overflow:"hidden"},
 favoriteCover:{position:"relative"},
 favoriteHeart:{position:"absolute",right:6,top:3,minWidth:31,minHeight:31,
  alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,20,16,.55)",borderRadius:18},
 favoriteHeartText:{color:T.green,fontSize:24},
 favoriteBottom:{paddingHorizontal:9,paddingVertical:8,minHeight:56},
 favoriteTitle:{fontSize:12.5,fontWeight:"850",lineHeight:16,color:T.fg},
 favoriteArtist:{fontSize:10.5,color:T.sub,marginTop:3},
 artistCard:{width:"48.5%",minHeight:144,borderRadius:12,overflow:"hidden",
  borderWidth:1,borderColor:"#354650",backgroundColor:"#19222d"},
 artistContent:{flex:1,padding:10,alignItems:"center",justifyContent:"center",gap:7},
 artistTitle:{fontSize:13,fontWeight:"900",color:T.fg,textAlign:"center",lineHeight:17},
 artistType:{fontSize:11,color:T.sub,textAlign:"center"},
 artistCount:{fontSize:11,color:T.green,fontWeight:"800",textAlign:"center"}
});
module.exports={LibraryHero,LibrarySearch,LibraryChipRow,LibrarySongRow,FavoriteSongCard,LibraryArtistCard,ArtistAvatar};
