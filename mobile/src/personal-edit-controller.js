// Optimistic local edits, with one ordered writer per independent preference.
const {STORE_KEY}=require("./personal-collections");
const {PROFILE_KEY,parseProfile}=require("./profile-core");
const {FAVORITES_KEY,toggleFavorite}=require("./favorites");
function createWriter({ref,apply,write,key,onError}){
 let tail=Promise.resolve(),pending=0,confirmed,sequence=0;
 function save(next){
  if(!pending)confirmed=ref.current;
  const previous=ref.current,version=++sequence,payload=JSON.stringify(next);
  pending++;
  ref.current=next;apply(next);
  const task=tail.then(async()=>{await write(key,payload);confirmed=next});
  tail=task.catch(error=>{
   // Roll back to the last confirmed value, not another failed optimistic edit.
   if(version===sequence&&ref.current===next){ref.current=confirmed;apply(confirmed)}
   onError(error);
  }).finally(()=>{pending--});
  return previous;
 }
 return {save,settled:()=>tail};
}
function totals(value){
 const groups=value?.collections||[];
 return {folders:groups.length,entries:groups.reduce((n,c)=>n+c.entries.length,0)};
}
function createPersonalEditController({personalRef,profileRef,likedRef,setPersonal,setProfile,setLikedIds,write,notice,clearNotice,alert}){
 function failure(title,fallback,suffix=""){return error=>{clearNotice();alert(title,(error?.message||fallback)+suffix)}}
 const personal=createWriter({ref:personalRef,apply:setPersonal,write,key:STORE_KEY,onError:failure("No se guardó la colección","Revisa el espacio del teléfono."," Tus cantos oficiales no se modificaron.")});
 const profile=createWriter({ref:profileRef,apply:setProfile,write,key:PROFILE_KEY,onError:failure("No se guardó el perfil","Revisa el almacenamiento privado del teléfono.")});
 const favorites=createWriter({ref:likedRef,apply:setLikedIds,write,key:FAVORITES_KEY,onError:failure("No se guardó Me gusta","Revisa el almacenamiento del teléfono."," No se modificó el catálogo.")});
 function savePersonal(next,options={}){
  const previous=personal.save(next);
  if(!options.quiet){
   const old=totals(previous),current=totals(next);
   const message=options.notice||(current.folders>old.folders?"Colección creada":current.entries>old.entries?"Composición guardada":null);
   if(message)notice(message,()=>{if(personalRef.current===next)savePersonal(previous,{quiet:true})});
  }
 }
 function saveProfile(next,options={}){
  const clean=parseProfile(JSON.stringify(next)),previous=profile.save(clean);
  if(!options.quiet)notice("Perfil guardado",()=>{if(profileRef.current===clean)saveProfile(previous,{quiet:true})});
 }
 function setFavoritesLocal(next){return favorites.save(next);}
 function toggleLike(songId){
  const next=toggleFavorite(likedRef.current,songId),previous=setFavoritesLocal(next);
  notice(next.includes(String(songId))?"Agregado a Mis me gusta":"Quitado de Mis me gusta",()=>{if(likedRef.current===next)setFavoritesLocal(previous)});
 }
 async function waitForWrites(){await Promise.all([personal.settled(),profile.settled(),favorites.settled()]);}
 return Object.freeze({savePersonal,saveProfile,toggleLike,waitForWrites});
}
module.exports={createWriter,createPersonalEditController};
