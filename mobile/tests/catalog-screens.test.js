// Execute each real screen with a minimal native element renderer.
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const moduleForTest={exports:{}};
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
const library=Object.fromEntries(["LibraryHero","LibrarySearch","LibraryChipRow","LibrarySongRow","LibraryArtistCard"].map(name=>[name,name]));
const stub={normalize:s=>String(s||"").toLowerCase(),names:()=>"Coro"};
vm.runInNewContext(fs.readFileSync("src/catalog-screens-ui.js","utf8"),{module:moduleForTest,require(name){
 if(name==="react")return{createElement:h};
 if(name==="react-native")return Object.fromEntries(["View","Text","TextInput","Pressable","ScrollView","Image"].map(n=>[n,n]));
 if(name==="./catalog")return stub;
 if(name==="./navigation-core")return{matchesSearch:(values,term)=>values.join(" ").toLowerCase().includes(term.toLowerCase())};
 if(name==="./repertoire-ui")return{filterRepertoires:rows=>rows};
 if(name==="./visual-ui")return{InitialCover:"InitialCover"};
 if(name==="./library-ui")return library;
 throw Error(name);
}});
const screens=moduleForTest.exports,calls=[];
const song={id:"s",title:"Gloria",tone:"C"},artist={id:"a",name:"Coro"},cat={id:"c",name:"Misa",song_type:"catolico"},rep={id:"r",title:"Domingo",items:[{song_id:"s"}]},medley={id:"m",title:"Alabanza",parts:[{}]};
const props={S:{},C:{},HOME_IMAGES:{},label:(text,style)=>h("Label",{text,style}),type:x=>x||"General",Btn:"Btn",SectionEmpty:"SectionEmpty",SectionHero:"SectionHero",SectionFilterBar:"SectionFilterBar",SectionSearch:"SectionSearch",SectionListCard:"SectionListCard",model:{songsForArtist:()=>[song],categoryMap:new Map([["c",cat]]),categories:[cat],children:()=>[],songsForCategory:()=>[song],categoryPath:()=>cat.name,repertoires:[rep],medleys:[medley]},eligible:[song],filteredArtists:[artist],query:"",typeFilter:"",onlyLiked:false,songLibraryOpen:true,countLimit:80,likedSet:new Set(["s"]),copy:{syncedAt:"saved"},folderId:"c",folderType:"catolico",medleyTypeFilter:"",repertoireFilter:"todos"};
for(const key of ["setOnlyLiked","setTypeFilter","setCountLimit","setSongLibraryOpen","setQuery","goTab","manualSync","selectSong","toggleLike","setActionSongId","setLibraryFiltersVisible","setArtistTypeFilter","openDetail","setFolderType","setFolderId","setRepertoireFilter","selectRepertoire","requestForm","setRequestTitle","setMedleyTypeFilter","selectMedley"])props[key]=(...args)=>calls.push([key,...args]);
function find(node,predicate){if(!node||typeof node!=="object")return null;if(predicate(node))return node;for(const child of node.children||[]){const found=find(child,predicate);if(found)return found}return null}
const songs=screens.SongsScreen(props),songRow=find(songs,n=>n.type==="LibrarySongRow");assert.ok(songRow);assert.equal(songRow.props.liked,true);assert.equal(songRow.props.compact,true);songRow.props.onOpen();songRow.props.onLike();assert.equal(calls.at(-2)[0],"selectSong");assert.equal(calls.at(-1)[0],"toggleLike");
const artists=screens.ArtistsScreen(props);find(artists,n=>n.type==="LibraryArtistCard").props.onOpen();assert.equal(calls.at(-1)[1].id,"a");
const categories=screens.CategoriesScreen(props);find(categories,n=>n.type==="SectionListCard"&&n.props.title==="Gloria").props.onPress();assert.equal(calls.at(-1)[0],"selectSong");
const reps=screens.RepertoiresScreen(props);find(reps,n=>n.props.accessibilityLabel==="Domingo, 1 cantos").props.onPress();assert.equal(calls.at(-1)[0],"selectRepertoire");
const medleys=screens.MedleysScreen(props);find(medleys,n=>n.type==="SectionListCard"&&n.props.title==="Alabanza").props.onPress();assert.equal(calls.at(-1)[0],"selectMedley");
console.log("Catalog screens: all five actual renderers, data and navigation callbacks verified.");
