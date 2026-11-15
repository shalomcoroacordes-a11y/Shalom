const {SUPABASE_URL,PUBLISHABLE_KEY}=require("./config");
const {safeWebUrl}=require("./catalog");
// Misma tabla de mensajes que usa el formulario web Solicitar canto.
// Sólo se envían solicitudes; no se permite editar canciones directamente.
const TYPES={
 song:"Solicitud de canto",
 lyrics:"Corrección de letra",
 chords:"Corrección de acordes o tono",
 other:"Otra sugerencia"
};
async function sendRequest({kind="song",song=null,title="",artist="",reference="",details="",name="",email=""}) {
 const type=TYPES[kind];
 if(!type)throw new Error("Selecciona el tipo de solicitud.");
 const cleanTitle=String(title||song?.title||"").trim().slice(0,160);
 const cleanDetails=String(details||"").trim().slice(0,2500);
 if(!cleanTitle && kind!=="other") throw new Error("Indica el nombre del canto.");
 if(cleanDetails.length<3) throw new Error("Describe tu solicitud con al menos tres caracteres.");
 const link=String(reference||"").trim();
 if(link && !safeWebUrl(link))throw new Error("El enlace debe empezar por https:// o http://.");
 const mail=String(email||"").trim().slice(0,160);
 if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))throw new Error("El correo no tiene un formato válido.");
 const linkedSong=song?.id?("Canto relacionado: "+song.id+"\n"):"";
 const body={
  message_type:type,
  song_title:cleanTitle||null,
  artist_name:String(artist||"").trim().slice(0,160)||null,
  source_url:link||null,
  details:linkedSong+cleanDetails,
  contact_name:String(name||"").trim().slice(0,120)||null,
  contact_email:mail||null,
  page_url:song?.id?"shalom-android://cancion/"+song.id:"shalom-android://solicitudes",
  user_agent:"SHALOM Android",
  status:"pendiente"
 };
 const response=await fetch(SUPABASE_URL+"/rest/v1/contact_messages",{
  method:"POST",
  headers:{
   apikey:PUBLISHABLE_KEY,
   "Content-Type":"application/json",
   Accept:"application/json",
   Prefer:"return=minimal"
  },
  body:JSON.stringify(body)
 });
 if(!response.ok){
  let detail="HTTP "+response.status;
  try{const data=await response.json();detail=data?.message||detail}catch(_){}
  throw new Error("No se pudo enviar la solicitud: "+detail);
 }
 return true;
}
module.exports={sendRequest,TYPES};