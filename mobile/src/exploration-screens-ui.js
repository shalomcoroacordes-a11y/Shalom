const React=require("react");
const {View}=require("react-native");
const {matchesSearch}=require("./navigation-core");
const h=React.createElement;
// Secondary exploration screens receive shared visual components and navigation callbacks.
function MoreScreen({S,SectionHero,SectionListCard,goTab,requestForm,setSettingsOpen,openWeb}){
  const cards=[
   ["Explorar música","Artistas, álbumes, categorías y popurrís","categories",()=>goTab("Explorar")],
   ["Solicitar canto o corrección","Envía una solicitud al administrador","request",()=>requestForm("song")],
   ["Configuración","Sincronización, respaldo e información","settings",()=>setSettingsOpen(true)],
   ["Mis me gusta","Tus cantos guardados en este teléfono","heart",()=>goTab("Canciones",{liked:true})],
   ["Acerca de SHALOM","Conoce el proyecto y su propósito","info",
    ()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/acerca.html")],
   ["Contacto","Envía comentarios o consultas","contact",
    ()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/contacto.html")],
   ["Donaciones","Apoya el crecimiento del cancionero","donation",
    ()=>openWeb("https://shalomcoroacordes-a11y.github.io/Shalom/donaciones.html")]
  ];
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Más opciones",subtitle:"Ayuda, preferencias y accesos",icon:"more"}),
   h(View,{style:S.repCards},
    ...cards.map(([name,subtitle,icon,action])=>h(SectionListCard,{key:name,title:name,
     subtitle,icon,onPress:action}))));
 }

function ExploreScreen({S,SectionHero,SectionListCard,goTab}){
  const cards=[
   ["Artistas","Busca coros, cantores y ministerios","artists",()=>goTab("Artistas")],
   ["Categorías","Encuentra cantos por tema o celebración","categories",()=>goTab("Categorías")],
   ["Álbumes","Colecciones musicales oficiales","albums",()=>goTab("Álbumes")],
   ["Popurrís oficiales","Varios cantos unidos por SHALOM","medleys",()=>goTab("Popurrís")]
  ];
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Explorar",subtitle:"Descubre música por artista, tema o colección",icon:"categories"}),
   h(View,{style:S.repCards},
    ...cards.map(([name,subtitle,icon,action])=>h(SectionListCard,{key:name,title:name,
     subtitle,icon,onPress:action}))));
 }

function AlbumsScreen({S,SectionHero,SectionListCard,SectionSearch,SectionEmpty,label,model,query,sectionSearchOpen,setQuery,openDetail}){
  const filtered=model.albums.filter(a=>
   matchesSearch([a.title,a.description,model.artistMap.get(a.artist_id)?.name],query));
  return h(View,{style:S.repPage},
   h(SectionHero,{title:"Álbumes",subtitle:"Colecciones de canciones y artistas",icon:"albums"}),
   sectionSearchOpen?h(SectionSearch,{value:query,onChangeText:setQuery,
    placeholder:"Buscar álbum o artista…"}):null,
   label(filtered.length+" "+(filtered.length===1?"álbum":"álbumes"),S.sectionResults),
   h(View,{style:S.repCards},
    ...filtered.map(a=>h(SectionListCard,{key:a.id,title:a.title,
     subtitle:model.songsForAlbum(a.id).length+" cantos",
     meta:model.artistMap.get(a.artist_id)?.name||a.description,
     icon:"albums",onPress:()=>openDetail({type:"album",id:a.id})})),
    !filtered.length?h(SectionEmpty,{message:"No hay álbumes que coincidan con tu búsqueda."}):null)
  );
 }

module.exports={MoreScreen,ExploreScreen,AlbumsScreen};
