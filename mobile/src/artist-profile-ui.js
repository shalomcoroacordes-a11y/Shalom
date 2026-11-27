// Public artist profile. Catalog and personal actions remain owned by App.
const h=require("react").createElement;
const {View,Text,TextInput,Pressable,Image}=require("react-native");
const {safeWebUrl,normalize}=require("./catalog");
const {ArtistAvatar,LibrarySongRow}=require("./library-ui");
const SOCIALS=[
 ["Facebook","facebook",require("../assets/social-facebook.png")],
 ["TikTok","tiktok",require("../assets/social-tiktok.png")],
 ["Instagram","instagram",require("../assets/social-instagram.png")],
 ["YouTube","youtube",require("../assets/social-youtube.png")],
 ["Spotify","spotify",require("../assets/social-spotify.png")]
];
function legacyArtistProfile(description){
 const raw=String(description||"");
 const marker=raw.match(/<!--JHD_ARTIST_META:([\s\S]*?)-->\s*$/);
 let links={};
 try{links=marker?JSON.parse(marker[1])?.links||{}:{}}catch(_){}
 return {bio:marker?raw.slice(0,marker.index).trim():raw.trim(),links};
}
function ArtistProfile({S,C,artist,online,model,search,onSearch,countLimit,onMore,copy,likedSet,selectSong,toggleLike,onOptions,openWeb,openDetail,type,Btn,SectionEmpty}){
 const songs=model.songsForArtist(artist.id);
 const term=normalize(search.trim());
 const visible=term?songs.filter(song=>normalize(song.title||"").includes(term)):songs;
 const albums=model.albums.filter(album=>String(album.artist_id)===String(artist.id));
 const legacy=legacyArtistProfile(artist.description);
 const links=SOCIALS.map(([name,key,icon])=>({name,icon,url:safeWebUrl(artist[key+"_url"]||legacy.links[key])})).filter(link=>link.url);
 const bio=artist.bio||legacy.bio;
 return h(View,{style:S.artistProfilePage},
  h(View,{style:S.artistProfileHero},
   h(ArtistAvatar,{artist,online,size:100}),
   h(Text,{style:S.artistProfileName},artist.name||"Artista"),
   h(Text,{style:S.artistProfileMeta},[type(artist.artist_type),songs.length+" "+(songs.length===1?"canto":"cantos")].filter(Boolean).join(" · ")),
   links.length?h(View,{style:S.artistProfileLinks},...links.map(({name,url,icon})=>h(Pressable,{key:name,style:S.artistSocialButton,onPress:()=>openWeb(url),accessibilityRole:"link",accessibilityLabel:"Abrir "+name},
    ({pressed})=>h(Image,{source:icon,resizeMode:"contain",accessible:false,style:[S.artistSocialIcon,pressed&&{tintColor:C.green}]})))):null),
  bio?h(Text,{style:S.artistProfileBio},bio):null,
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
