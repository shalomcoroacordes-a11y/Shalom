// Modelo de navegación nativa del mismo catálogo público de SHALOM.
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const byTitle = (a,b) => String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "es");
const names = rows => (rows||[]).map(item=>item?.name || item?.title).filter(Boolean).join(" · ");
const typeLabel = v => ({catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto"})[normalize(v)] || "General";
const index = (rows) => new Map((rows || []).map(x => [String(x.id),x]));
const relationship = (rows) => {
 const map = new Map();
 for(const row of rows || []) {
  const key=String(row.song_id||"");
  if(!key)continue;
  if(!map.has(key))map.set(key,[]);
  map.get(key).push(row);
 }
 return map;
};
function buildCatalog(data={}) {
 const artists=index(data.artists), categories=index(data.categories), albums=index(data.albums);
 const songArtists=relationship(data.song_artists), songCats=relationship(data.song_categories);
 const songAlbums=relationship(data.album_songs), songLinks=relationship(data.song_links);
 const songCapos=relationship(data.song_capo_versions);
 const uniqueById=(rows)=>[...new Map(rows.filter(Boolean).map(row=>[row.id,row])).values()];
 const songs=(data.songs||[]).map(song=>{
  const pick=(map,key,store)=>uniqueById((map.get(String(song.id))||[]).map(link=>store.get(String(link[key]))));
  const _artists=pick(songArtists,"artist_id",artists);
  if(!_artists.length && song.artist_id && artists.has(String(song.artist_id)))_artists.push(artists.get(String(song.artist_id)));
  const _categories=pick(songCats,"category_id",categories);
  if(!_categories.length&&song.category_id&&categories.has(String(song.category_id)))_categories.push(categories.get(String(song.category_id)));
  return {...song,_artists,_categories,
   _albums:pick(songAlbums,"album_id",albums),
   _links:[...(songLinks.get(String(song.id))||[])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)),
   _capos:[...(songCapos.get(String(song.id))||[])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))};
 }).sort(byTitle);

 function ancestors(item) {
  const path=[],seen=new Set();
  while(item&&!seen.has(String(item.id))) {
   seen.add(String(item.id));path.unshift(item);item=categories.get(String(item.parent_id));
  }
  return path;
 }
 function categoryPath(category) {
  const path=ancestors(category),top=path[0]||category;
  return [typeLabel(top?.song_type),...path.map(x=>x.name||"Carpeta")].join(" › ");
 }
 function descendants(id) {
  const included=new Set([String(id)]);
  let change=true;
  while(change) {
   change=false;
   for(const item of categories.values()) {
    if(included.has(String(item.parent_id))&&!included.has(String(item.id))) {
     included.add(String(item.id));change=true;
    }
   }
  }
  return included;
 }
 const artistRows=[...artists.values()].sort(byTitle);
 const categoryRows=[...categories.values()].sort((a,b)=>
  categoryPath(a).localeCompare(categoryPath(b),"es"));
 const albumRows=[...albums.values()].sort(byTitle);
 function songsForArtist(id) {
  return songs.filter(song=>song._artists.some(a=>String(a.id)===String(id)));
 }
 function songsForCategory(id) {
  const ids=descendants(id);
  return songs.filter(song=>song._categories.some(a=>ids.has(String(a.id))));
 }
 function songsForAlbum(id) {
  return songs.filter(song=>song._albums.some(a=>String(a.id)===String(id)));
 }
 function children(parentId,type) {
  return categoryRows.filter(category=>
   String(category.parent_id||"")===String(parentId||"")&&
   (!type||normalize(category.song_type)===type)
  ).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||byTitle(a,b));
 }
 return {songs,artists:artistRows,categories:categoryRows,albums:albumRows,
  artistMap:artists,categoryMap:categories,albumMap:albums,
  names,normalize,typeLabel,categoryPath,ancestors,children,descendants,
  songsForArtist,songsForCategory,songsForAlbum};
}
function safeWebUrl(value) {
 try {const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:null}
 catch(_) {return null;}
}
module.exports={buildCatalog,normalize,names,typeLabel,safeWebUrl};