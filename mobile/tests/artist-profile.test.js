const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const mod={exports:{}};
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
vm.runInNewContext(fs.readFileSync("src/artist-profile-ui.js","utf8"),{module:mod,require(name){
 if(name==="react")return {createElement:h};
 if(name==="react-native")return Object.fromEntries(["View","Text","TextInput","Pressable","Image"].map(x=>[x,x]));
 if(name==="./catalog")return {safeWebUrl:s=>String(s||"").startsWith("https:")?s:null,normalize:s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()};
 if(name==="./library-ui")return {ArtistAvatar:"ArtistAvatar",LibrarySongRow:"LibrarySongRow"};
 if(/^\.\.\/assets\/social-[a-z]+\.png$/.test(name))return name;
 throw Error(name);
}});
const calls=[],song={id:"1",title:"María",tone:"D"},other={id:"2",title:"Gloria"};
const artist={id:"a",name:"Coro",youtube_url:"https://example.com",facebook_url:"javascript:bad"};
const album={id:"album-1",artist_id:"a",title:"Álbum de prueba"};
const props={S:{},C:{},artist,online:false,model:{songsForArtist:()=>[song,other],albums:[album,{id:"other",artist_id:"other",title:"Otro álbum"}],songsForAlbum:()=>[song]},search:"maria",countLimit:80,copy:{syncedAt:"yes"},likedSet:new Set(["1"]),type:()=>"Católico",Btn:"Btn",SectionEmpty:"Empty"};
for(const key of ["onSearch","onMore","selectSong","toggleLike","onOptions","openWeb","openDetail"])props[key]=(...args)=>calls.push([key,...args]);
const screen=mod.exports(props);
function all(n,p){return !n||typeof n!=="object"?[]:[...(p(n)?[n]:[]),...(n.children||[]).flatMap(c=>all(c,p))]}
const rows=all(screen,n=>n.type==="LibrarySongRow");assert.equal(rows.length,1);
assert.equal(rows[0].props.song,song);assert.equal(rows[0].props.liked,true);assert.equal(rows[0].props.compact,true);
rows[0].props.onOpen();rows[0].props.onLike();rows[0].props.onOptions();
assert.deepEqual(calls,[["selectSong",song],["toggleLike","1"],["onOptions",song]]);
assert.equal(all(screen,n=>n.props.accessibilityRole==="link").length,1);
const albums=all(screen,n=>n.type==="Pressable"&&n.props.accessibilityRole==="button");
assert.equal(albums.length,1,"Only albums owned by this artist appear");
albums[0].props.onPress();assert.equal(calls.at(-1)[0],"openDetail");
assert.equal(calls.at(-1)[1].type,"album");assert.equal(calls.at(-1)[1].id,album.id);
assert.equal(all(screen,n=>n.type==="ArtistAvatar")[0].props.online,false);
assert.equal(all(mod.exports({...props,search:"nothing"}),n=>n.type==="Empty").length,1);
const socialArtist={...artist,facebook_url:"https://facebook.com/coro",instagram_url:"https://instagram.com/coro",spotify_url:"https://open.spotify.com/artist/test",description:'Biografía <!--JHD_ARTIST_META:{"links":{"tiktok":"https://tiktok.com/@coro"}}-->'};
const socialScreen=mod.exports({...props,artist:socialArtist,C:{green:"#27c98b"}});
const socialLinks=all(socialScreen,n=>n.props.accessibilityRole==="link");
assert.equal(socialLinks.length,5);
for(const link of socialLinks){
 const image=link.children[0]({pressed:false});
 assert.equal(image.type,"Image");
 assert.match(image.props.source,/social-.*\.png$/);
 assert.equal(image.props.accessible,false);
 assert.equal(link.children[0]({pressed:true}).props.style[1].tintColor,"#27c98b");
}
const tt=socialLinks.find(n=>n.props.accessibilityLabel==="Abrir TikTok");
tt.props.onPress();assert.deepEqual(calls.at(-1),["openWeb","https://tiktok.com/@coro"]);
assert.equal(all(socialScreen,n=>n.type==="Text"&&n.children.includes("Biografía")).length,1);
assert.equal(all(socialScreen,n=>n.type==="Text"&&n.children.some(c=>typeof c==="string"&&c.includes("JHD_ARTIST_META"))).length,0);
assert.equal(all(mod.exports({...props,artist:{id:"empty",name:"Sin redes"}}),n=>n.props.accessibilityRole==="link").length,0);
const generator=fs.readFileSync("scripts/generate_icons.py","utf8");
for(const key of ["facebook","tiktok","instagram","youtube","spotify"]){assert.ok(generator.includes('"'+key+'"'));assert.match(fs.readFileSync("../social-icons/"+key+".svg","utf8"),/<svg[^>]*viewBox="0 0 24 24"/);}
console.log("Artist profile: search, offline avatar, safe monochrome social links and real song actions verified.");
