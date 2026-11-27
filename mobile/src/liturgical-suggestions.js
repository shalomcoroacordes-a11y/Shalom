const {normalize}=require("./catalog");
const TAGS={advent:["adviento"],christmas:["navidad","natividad"],lent:["cuaresma"],triduum:["triduo pascual","semana santa"],easter:["pascua","resurreccion"],ordinary:["tiempo ordinario"]};
function seasonalSongs(songs,day,reading,limit=6){
 if(!day)return [];
 const tags=reading?.title==="Nuestra Señora de Guadalupe"?["guadalupe","nuestra senora de guadalupe","virgen de guadalupe"]:TAGS[day.season]||[];
 const wanted=new Set(tags);
 return (Array.isArray(songs)?songs:[]).filter(song=>normalize(song.song_type)==="catolico"&&song.is_published!==false&&Array.isArray(song._categories)&&song._categories.some(c=>wanted.has(normalize(c?.name))))
 .slice().sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"es")).slice(0,limit);
}
module.exports={seasonalSongs};
