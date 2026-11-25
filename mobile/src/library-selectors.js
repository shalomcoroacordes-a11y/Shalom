// Selectores puros de los listados descargados de SHALOM.
const {normalize,names,typeLabel}=require("./catalog");
const {matchesSearch}=require("./navigation-core");

function favoriteSongs(model,likedSet){
 return model.songs.filter(song=>likedSet.has(String(song.id)));
}

function filterSongs(model,{query="",typeFilter="",categoryId="",onlyLiked=false,likedSet=new Set()}={}){
 const term=normalize(String(query??"").trim());
 // Evita recorrer el arbol de categorias una vez por cada canto.
 const descendants=categoryId?model.descendants(categoryId):null;
 return model.songs.filter(song=>{
  if(onlyLiked&&!likedSet.has(String(song.id)))return false;
  if(typeFilter&&song.song_type!==typeFilter)return false;
  if(descendants&&!song._categories.some(c=>descendants.has(String(c.id))))return false;
  if(!term)return true;
  return matchesSearch([song.title,song.tone,song.lyrics,
   names(song._artists),names(song._categories)],term);
 });
}

function filterArtists(model,{query="",type=""}={}){
 return model.artists.filter(artist=>
  (!type||normalize(typeLabel(artist.artist_type))===type)
  &&matchesSearch([artist.name,artist.description,artist.artist_type],query));
}

function searchHomeSongs(model,query="",limit=6){
 const term=normalize(String(query??"").trim());
 if(!term)return [];
 return model.songs.filter(song=>matchesSearch([
  song.title,song.lyrics,names(song._artists),names(song._categories)
 ],term)).slice(0,limit);
}

// Keep the original distinction between a closed detail (null) and a missing record (undefined).
function selectDetailRecords(model,detail){
 const active=detail?.type==="song"?model.songs.find(s=>s.id===detail.id):null;
 const focusedArtist=detail?.type==="artist"?model.artistMap.get(detail.id):null;
 const focusedAlbum=detail?.type==="album"?model.albumMap.get(detail.id):null;
 const focusedMedley=detail?.type==="medley"?model.medleys.find(x=>x.id===detail.id):null;
 const focusedRepertoire=detail?.type==="repertoire"?model.repertoires.find(x=>x.id===detail.id):null;
 return {active,focusedArtist,focusedAlbum,focusedMedley,focusedRepertoire};
}
function selectActionSong(model,actionSongId){
 const actionSong=actionSongId?model.songs.find(song=>String(song.id)===String(actionSongId)):null;
 return actionSong;
}
module.exports=Object.freeze({favoriteSongs,filterSongs,filterArtists,searchHomeSongs,selectDetailRecords,selectActionSong});
