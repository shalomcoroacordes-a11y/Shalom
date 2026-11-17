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
 const formatDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"}):"Sin fecha";
 const blank=(kind="misa")=>({title:"",kind,event_date:null,location:"",notes:"",items:[],is_published:false});
 function normalizeItems(items) {
  if(!Array.isArray(items)||items.length>45)throw Error("El repertorio admite hasta 45 cantos.");
  return items.map((it,i)=>{
   if(!it||typeof it!=="object"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(it.song_id||"")))
    throw Error("El canto "+(i+1)+" no tiene un identificador válido.");
   const moment=clean(it.moment).slice(0,90);
   const notes=clean(it.notes).slice(0,500);
   const item={song_id:String(it.song_id),moment,notes};
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
  if(d.event_date&&!/^\d{4}-\d{2}-\d{2}$/.test(d.event_date))throw Error("La fecha debe tener formato válido.");
  return {title,kind:d.kind,event_date:d.event_date||null,location:clean(d.location),
    notes:clean(d.notes),items,is_published:!!d.is_published,updated_at:new Date().toISOString()};
 }
 const url=id=>"cancion.html?id="+encodeURIComponent(id);
 return Object.freeze({MASS_STEPS,html,clean,formatDate,blank,validate,normalizeItems,url});
});