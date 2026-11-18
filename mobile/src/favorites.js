// SHALOM: favoritos personales que no forman parte del catalogo de Supabase.
// Cada instalacion guarda sus identificadores en preferencias locales SQLite.
const FAVORITES_KEY="liked_song_ids_local_v1";
function parseFavorites(raw){
 try{
  const values=JSON.parse(String(raw||"[]"));
  if(!Array.isArray(values))return [];
  return [...new Set(values.filter(v=>typeof v==="string").map(v=>v.trim()).filter(Boolean))];
 }catch(_){return [];}
}
function hasFavorite(ids,id){
 return Array.isArray(ids)&&ids.includes(String(id||""));
}
function toggleFavorite(ids,id){
 const key=String(id||"").trim();
 if(!key)return [...ids];
 return hasFavorite(ids,key)?ids.filter(x=>x!==key):[...ids,key];
}
module.exports={FAVORITES_KEY,parseFavorites,hasFavorite,toggleFavorite};
