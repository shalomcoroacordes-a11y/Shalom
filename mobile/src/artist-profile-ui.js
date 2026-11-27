// Public artist profile. Catalog and personal actions remain owned by App.
const h=require("react").createElement;
const {View,Text,TextInput,Pressable}=require("react-native");
const {safeWebUrl,normalize}=require("./catalog");
const {ArtistAvatar,LibrarySongRow}=require("./library-ui");
function ArtistProfile({S,C,artist,online,model,search,onSearch,countLimit,onMore,copy,likedSet,selectSong,toggleLike,onOptions,openWeb,openDetail,type,Btn,SectionEmpty}){
 const songs=model.songsForArtist(artist.id);
 const term=normalize(search.trim());
 const visible=term?songs.filter(song=>normalize(song.title||"").includes(term)):songs;
 const albums=model.albums.filter(album=>String(album.artist_id)===String(artist.id));
 const links=[["YouTube",artist.youtube_url],["Spotify",artist.spotify_url],["Instagram",artist.instagram_url],["Facebook",artist.facebook_url]].filter(([,url])=>safeWebUrl(url));
 const bio=artist.bio||artist.description;
 return h(View,{style:S.artistProfilePage},
  h(View,{style:S.artistProfileHero},
   h(ArtistAvatar,{artist,online,size:100}),
   h(Text,{style:S.artistProfileName},artist.name||"Artista"),
   h(Text,{style:S.artistProfileMeta},[type(artist.artist_type),songs.length+" "+(songs.length===1?"canto":"cantos")].filter(Boolean).join(" · "))),
  bio?h(Text,{style:S.artistProfileBio},bio):null,
  links.length?h(View,{style:S.artistProfileLinks},...links.map(([name,url])=>h(Pressable,{key:name,style:S.artistProfileLink,onPress:()=>openWeb(url),accessibilityRole:"link",accessibilityLabel:"Abrir "+name},
   h(Text,{style:S.artistProfileLinkText},name+" ↗")))):null,
  h(View,{style:S.libraryTitleRow},h(Text,{style:S.librarySectionTitle},"Cancionero"),h(Text,{style:S.libraryCount},String(visible.length))),
  h(TextInput,{style:S.artistProfileSearch,value:search,onChangeText:onSearch,placeholder:"Buscar cantos de "+(artist.name||"este artista"),placeholderTextColor:C.muted,accessibilityLabel:"Buscar dentro del artista",returnKeyType:"search"}),
  h(View,{style:S.artistProfileList},...visible.slice(0,countLimit).map(song=>h(LibrarySongRow,{key:song.id,song,tone:song.tone,compact:true,liked:likedSet.has(String(song.id)),
   onOpen:()=>selectSong(song),onLike:()=>toggleLike(song.id),onOptions:()=>onOptions(song)}))),
  visible.length>countLimit?h(Btn,{text:"Mostrar más cantos",secondary:true,onPress:onMore}):null,
  !visible.length?h(SectionEmpty,{message:term?"No hay cantos que coincidan con la búsqueda.":copy?.syncedAt?"Este artista todavía no tiene cantos.":"Descarga la biblioteca para consultar sus cantos."}):null,
  albums.length?h(Text,{style:S.librarySectionTitle},"Álbumes"):null,
  ...albums.map(album=>h(Pressable,{key:album.id,style:S.artistProfileLink,onPress:()=>openDetail({type:"album",id:album.id}),accessibilityRole:"button"},
   h(Text,{style:S.artistProfileLinkText},album.title||"Álbum"),h(Text,{style:S.artistProfileMeta},model.songsForAlbum(album.id).length+" cantos")))
 );
}
module.exports=ArtistProfile;
