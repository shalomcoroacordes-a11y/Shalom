const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const mod={exports:{}};
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
vm.runInNewContext(fs.readFileSync("src/artist-profile-ui.js","utf8"),{module:mod,require(name){
 if(name==="react")return {createElement:h};
 if(name==="react-native")return Object.fromEntries(["View","Text","TextInput","Pressable"].map(x=>[x,x]));
 if(name==="./catalog")return {safeWebUrl:s=>String(s||"").startsWith("https:"),normalize:s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()};
 if(name==="./library-ui")return {ArtistAvatar:"ArtistAvatar",LibrarySongRow:"LibrarySongRow"};
 throw Error(name);
}});
const calls=[],song={id:"1",title:"María",tone:"D"},other={id:"2",title:"Gloria"};
const artist={id:"a",name:"Coro",youtube_url:"https://example.com",facebook_url:"javascript:bad"};
const props={S:{},C:{},artist,online:false,model:{songsForArtist:()=>[song,other],albums:[],songsForAlbum:()=>[]},search:"maria",countLimit:80,copy:{syncedAt:"yes"},likedSet:new Set(["1"]),type:()=>"Católico",Btn:"Btn",SectionEmpty:"Empty"};
for(const key of ["onSearch","onMore","selectSong","toggleLike","onOptions","openWeb","openDetail"])props[key]=(...args)=>calls.push([key,...args]);
const screen=mod.exports(props);
function all(n,p){return !n||typeof n!=="object"?[]:[...(p(n)?[n]:[]),...(n.children||[]).flatMap(c=>all(c,p))]}
const rows=all(screen,n=>n.type==="LibrarySongRow");assert.equal(rows.length,1);
assert.equal(rows[0].props.song,song);assert.equal(rows[0].props.liked,true);assert.equal(rows[0].props.compact,true);
rows[0].props.onOpen();rows[0].props.onLike();rows[0].props.onOptions();
assert.deepEqual(calls,[["selectSong",song],["toggleLike","1"],["onOptions",song]]);
assert.equal(all(screen,n=>n.props.accessibilityRole==="link").length,1);
assert.equal(all(screen,n=>n.type==="ArtistAvatar")[0].props.online,false);
assert.equal(all(mod.exports({...props,search:"nothing"}),n=>n.type==="Empty").length,1);
console.log("Artist profile: search, offline avatar and real song actions verified.");
