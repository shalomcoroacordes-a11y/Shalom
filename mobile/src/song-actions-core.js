// Composiciones del dispositivo, sin cambios en el catálogo oficial de Supabase.
// Un repertorio personal es una lista de cantos locales (no un repertorio publicado).
const {newCollection,newEntry,newPart,LIMIT_PARTS}=require("./personal-collections");
const KINDS=["repertorio","misa","popurri"];
const NAMES={repertorio:"repertorio",misa:"misa",popurri:"popurrí"};
function entriesOf(store,kind){
 if(!KINDS.includes(kind))throw new Error("Tipo de lista incorrecto.");
 return (store?.collections||[]).flatMap(folder=>
  (folder.entries||[]).filter(e=>e.kind===kind).map(entry=>({
   folderId:folder.id,folderName:folder.name,entryId:entry.id,title:entry.title,
   count:entry.parts?.length||0,exists:true
  })));
}
function addToPersonal(store,songId,kind,choice={}){
 if(!store||!Array.isArray(store.collections)||store.version!==1)throw new Error("Almacenamiento local incorrecto.");
 if(!KINDS.includes(kind))throw new Error("Tipo de lista incorrecto.");
 const id=String(songId||"").trim();
 if(!id||/\s/.test(id)||id.length>128)throw new Error("Este canto no tiene un identificador válido.");
 const collections=store.collections.map(folder=>({...folder,entries:folder.entries.map(e=>({...e,parts:e.parts.slice()}))}));
 let targetFolder=choice.folderId?collections.find(c=>c.id===choice.folderId):null;
 if(choice.folderId&&!targetFolder)throw new Error("La colección ya no existe.");
 if(!targetFolder && !choice.folderId){
  targetFolder=collections.find(c=>c.name==="Mis colecciones")||collections[0];
  if(!targetFolder){
   if(collections.length>=100)throw new Error("Llegaste al límite de colecciones.");
   targetFolder=newCollection("Mis colecciones");
   collections.push(targetFolder);
  }
 }
 let target=choice.entryId?targetFolder.entries.find(e=>e.id===choice.entryId):null;
 if(choice.entryId&&!target)throw new Error("La composición ya no existe.");
 if(target && target.kind!==kind)throw new Error("Esta composición es de otro tipo.");
 if(!target){
  const title=String(choice.title||"").trim().slice(0,120);
  if(!title)throw new Error("Escribe un nombre para tu "+NAMES[kind]+".");
  if(targetFolder.entries.length>=100)throw new Error("Esta colección ya tiene demasiadas composiciones.");
  target=newEntry(kind,title);
  targetFolder.entries.push(target);
 }
 if(target.parts.some(p=>p.songId===id && p.sectionIndex===null))return {store,added:false,already:true,entry:target,folder:targetFolder};
 if(target.parts.length>=LIMIT_PARTS)throw new Error("Esta composición admite hasta "+LIMIT_PARTS+" fragmentos.");
 target.parts.push(newPart(id));
 return {store:{...store,collections},added:true,already:false,entry:target,folder:targetFolder};
}
module.exports={KINDS,NAMES,entriesOf,addToPersonal};
