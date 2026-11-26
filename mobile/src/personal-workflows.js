// Acciones simples para la biblioteca personal, sin migraciones ni acceso a Supabase.
const {newCollection,newEntry,importCode,entryFrom,songSections,LIMIT_PARTS}=require("./personal-collections");
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
// Copy from the official catalog into a new independent local composition.
// Never silently omit a modified fragment or exceed the personal part limit.
function copyOfficial(store,official,kind,songs,folderId=null){
 if(!KINDS.includes(kind)||!official||official.is_published===false)throw Error("Colección oficial no disponible.");
 const source=kind==="popurri"?official.parts:official.items;
 if(!Array.isArray(source)||!source.length||source.length>LIMIT_PARTS)throw Error("La copia personal admite de 1 a 30 cantos o fragmentos.");
 const catalog=new Map((songs||[]).map(s=>[String(s.id),s]));
 const normalized=value=>String(value??"").replace(/\r\n?/g,"\n").trim();
 const parts=source.map((item,index)=>{
  const songId=String(item.song_id||""),song=catalog.get(songId);
  if(!song)throw Error("Descarga primero el canto "+(index+1)+".");
  let sectionIndex=null,sectionTitle="";
  if(kind==="popurri"&&normalized(item.lyrics)!==normalized(song.lyrics)){
   const matches=songSections(song.lyrics).filter(s=>normalized(s.text)===normalized(item.lyrics));
   if(matches.length!==1)throw Error("El fragmento "+(index+1)+" fue modificado o es ambiguo. No se puede copiar sin cambiar su contenido.");
   sectionIndex=matches[0].index;sectionTitle=matches[0].title;
  }
  return {songId,sectionIndex,sectionTitle,shift:item.shift||0,moment:item.moment||"",notes:item.notes||"",cueOverride:item.cue_override??null};
 });
 const entry=entryFrom({kind,title:official.title,parts},true);
 const created=createPersonal(store,kind,entry.title,folderId);
 created.folder.entries[created.folder.entries.length-1]=entry;
 return {...created,entry};
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
module.exports={KINDS,KIND_LABEL,items,createPersonal,copyOfficial,receivePersonal,codePreview,kindName};
