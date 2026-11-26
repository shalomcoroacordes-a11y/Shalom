/* Funciones puras compartidas por repertorios de Misa y Ensayo. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.ShalomRepertoires=api;})(typeof window!=="undefined"?window:globalThis,function(){
 const MASS_STEPS=[
 ["entrada","Entrada"],["perdon","Señor, ten piedad"],["gloria","Gloria"],
 ["salmo","Salmo responsorial"],["aleluya","Aleluya / Aclamación"],
 ["ofertorio","Presentación de dones"],["santo","Santo"],
 ["cordero","Cordero de Dios"],["comunion","Comunión"],["salida","Salida"]
 ];
 const html=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
 const clean=s=>String(s??"").trim();
 const validDate=s=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const [year,month,day]=s.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return year>=1000&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
 };
 const formatDate=s=>s&&validDate(s)?new Date(s+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"}):"Sin fecha";
 const blank=(kind="misa")=>({title:"",kind,event_date:null,location:"",notes:"",items:[],is_published:false});
 function normalizeItems(items) {
  if(!Array.isArray(items)||items.length>45)throw Error("El repertorio admite hasta 45 cantos.");
  return items.map((it,i)=>{
   if(!it||typeof it!=="object"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(it.song_id||"")))
    throw Error("El canto "+(i+1)+" no tiene un identificador válido.");
   const moment=clean(it.moment).slice(0,90);
   const notes=clean(it.notes).slice(0,500);
   if(it.capo_id!=null&&(typeof it.capo_id!=="string"||!/^[a-zA-Z0-9_-]{1,128}$/.test(it.capo_id)))throw Error("Capo del canto inválido.");
   const item={song_id:String(it.song_id),moment,notes,...(it.capo_id&&it.capo_id!=="none"?{capo_id:it.capo_id}:{})};
   if(it.cue_override!=null)item.cue_override=(typeof module==="object"&&module.exports?require("./studio-reader-cues"):globalThis.ShalomReaderCues).normalizeOverride(it.cue_override);
   return item;
  });
 }
 function validate(d){
  const title=clean(d.title);
  if(title.length<2||title.length>160)throw Error("Escribe un nombre de 2 a 160 caracteres.");
  if(!["misa","ensayo"].includes(d.kind))throw Error("Selecciona Misa o Ensayo.");
  const items=normalizeItems(d.items);
  if(d.is_published&&!items.length)throw Error("Agrega al menos un canto antes de publicar.");
  if(clean(d.location).length>180||clean(d.notes).length>3000)throw Error("Las notas o el lugar son demasiado largos.");
  if(d.event_date&&!validDate(d.event_date))throw Error("La fecha debe ser una fecha real con formato AAAA-MM-DD.");
  return {title,kind:d.kind,event_date:d.event_date||null,location:clean(d.location),
    notes:clean(d.notes),items,is_published:!!d.is_published,updated_at:new Date().toISOString()};
 }
 const url=id=>"cancion.html?id="+encodeURIComponent(id);
 return Object.freeze({MASS_STEPS,html,clean,formatDate,blank,validate,normalizeItems,url});
});