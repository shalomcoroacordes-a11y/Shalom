// Acciones simples para la biblioteca personal, sin migraciones ni acceso a Supabase.
const {newCollection,newEntry,importCode}=require("./personal-collections");
const KINDS=["misa","popurri","repertorio"];
const KIND_LABEL={misa:"misa",popurri:"popurrí",repertorio:"repertorio"};
function items(store,kind=null){
 if(kind!==null&&!KINDS.includes(kind))throw new Error("Tipo de composición incorrecto.");
 return (store?.collections||[]).flatMap(folder=>
  (folder.entries||[]).filter(entry=>!kind||entry.kind===kind)
   .map(entry=>({folder,entry})));
}
function targetFolder(collections,folderId,automaticName){
 if(folderId){
  const found=collections.find(c=>c.id===folderId);
  if(!found)throw new Error("La carpeta elegida ya no existe.");
  return found;
 }
 let found=collections.find(c=>c.name===automaticName);
 if(found)return found;
 if(collections.length>=100)throw new Error("Llegaste al máximo de carpetas.");
 found=newCollection(automaticName);
 collections.push(found);
 return found;
}
function createPersonal(store,kind,title,folderId=null){
 if(!KINDS.includes(kind))throw new Error("Selecciona misa, popurrí o repertorio.");
 const name=String(title||"").trim();
 if(!name)throw new Error("Escribe un nombre para continuar.");
 if(name.length>120)throw new Error("El nombre es demasiado largo.");
 const collections=store.collections.map(c=>({...c,entries:c.entries.slice()}));
 const folder=targetFolder(collections,folderId,"Mis creaciones");
 if(folder.entries.length>=100)throw new Error("Esta carpeta ya tiene demasiadas composiciones.");
 const entry=newEntry(kind,name);
 folder.entries.push(entry);
 return {store:{...store,collections},folder,entry};
}
function receivePersonal(store,message,folderId=null){
 const imported=importCode(message);
 const collections=store.collections.map(c=>({...c,entries:c.entries.slice()}));
 const folder=targetFolder(collections,folderId,"Recibidos");
 if(folder.entries.length>=100)throw new Error("Esta carpeta ya tiene demasiadas composiciones.");
 folder.entries.push(imported);
 return {store:{...store,collections},folder,entry:imported};
}
function codePreview(message,songs){
 const imported=importCode(message);
 const localIds=new Set((songs||[]).map(s=>String(s.id)));
 const missing=[...new Set(imported.parts.map(p=>String(p.songId)))].filter(id=>!localIds.has(id));
 return {entry:imported,missingCount:missing.length,count:imported.parts.length};
}
function kindName(kind){return KIND_LABEL[kind]||"composición";}
module.exports={KINDS,KIND_LABEL,items,createPersonal,receivePersonal,codePreview,kindName};
