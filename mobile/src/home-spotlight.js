// Inicio SHALOM: distingue creaciones privadas de las publicaciones oficiales del admin.
// No crea tablas ni modifica Supabase; utiliza únicamente el catálogo descargado.
const {repertoireType}=require("./repertoire-ui");

const localDay=(value=new Date())=>{
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))return "";
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),
  String(date.getDate()).padStart(2,"0")].join("-");
};
const timestamp=item=>Date.parse(item?.updated_at||item?.created_at||"")||0;
function daysUntil(date,today=new Date()){
 const day=localDay(today);
 if(!day||!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return null;
 const difference=(Date.parse(date+"T00:00:00Z")-Date.parse(day+"T00:00:00Z"))/86400000;
 return Number.isInteger(difference)&&difference>=0?difference:null;
}
function recentCatalog(items,limit=3){
 return (Array.isArray(items)?items:[]).filter(item=>timestamp(item)>0)
  .sort((a,b)=>timestamp(b)-timestamp(a)).slice(0,limit);
}
function personalCounts(store,likedIds=[]){
 const entries=(store?.collections||[]).flatMap(c=>Array.isArray(c.entries)?c.entries:[]);
 const valid=new Set(Array.isArray(likedIds)?likedIds.map(String):[]);
 return {likes:valid.size,medleys:entries.filter(e=>e.kind==="popurri").length,
  masses:entries.filter(e=>e.kind==="misa").length,creations:entries.length};
}
function officialHighlights({repertoires=[],medleys=[]}={},today=new Date()){
 const day=localDay(today);
 const publishedRepertoires=(Array.isArray(repertoires)?repertoires:[]).filter(r=>
  r?.is_published===true&&Array.isArray(r.items)&&r.items.length>0&&
  (!r.event_date||/^\d{4}-\d{2}-\d{2}$/.test(r.event_date)&&r.event_date>=day));
 const scheduled=publishedRepertoires.filter(r=>r.event_date).sort((a,b)=>
  a.event_date.localeCompare(b.event_date)||timestamp(b)-timestamp(a));
 const unscheduled=publishedRepertoires.filter(r=>!r.event_date).sort((a,b)=>timestamp(b)-timestamp(a));
 const chosenRepertoire=scheduled[0]||unscheduled[0]||null;
 const publishedMedleys=(Array.isArray(medleys)?medleys:[]).filter(m=>
  m?.is_published===true&&Array.isArray(m.parts)&&m.parts.length>0)
  .sort((a,b)=>timestamp(b)-timestamp(a)||String(a.title||"").localeCompare(String(b.title||"")));
 const selected=[];
 if(chosenRepertoire){
  const kind=repertoireType(chosenRepertoire);
  const when=chosenRepertoire.event_date;
  const title=kind==="misa"?(when===day?"Misa de hoy":when?"Próxima misa":"Misa publicada"):
   kind==="ensayo"?(when===day?"Ensayo de hoy":when?"Próximo ensayo":"Ensayo de SHALOM"):
   (when===day?"Repertorio de hoy":when?"Próximo repertorio":"Repertorio publicado");
  selected.push({id:String(chosenRepertoire.id),type:"repertoire",kind,
   label:title,title:chosenRepertoire.title||"Repertorio SHALOM",
   subtitle:[when?when.split("-").reverse().join("/"):"",chosenRepertoire.location||""].filter(Boolean).join(" · "),
   count:chosenRepertoire.items.length,date:when||null,daysUntil:daysUntil(when,today)});
 }
 if(publishedMedleys.length){
  const m=publishedMedleys[0];
  selected.push({id:String(m.id),type:"medley",kind:"popurri",label:"Popurrí de SHALOM",
   title:m.title||"Popurrí de alabanza",subtitle:"Para cantar y ensayar",
   count:m.parts.length,date:null});
 }
 return selected;
}
module.exports={localDay,personalCounts,officialHighlights,recentCatalog,daysUntil};
