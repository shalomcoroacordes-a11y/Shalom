// Respaldo PERSONAL de SHALOM. No incluye cantos oficiales, claves ni registros de Supabase.
const {COVER_FILE,parseStore}=require("./personal-collections");
const {parseProfile}=require("./profile-core");
const {parseFavorites}=require("./favorites");
const FORMAT="SHALOM-PERSONAL-BACKUP",VERSION=1;
// Limite de archivo para respaldos v1 (incluidas fotos). Se comprueba tambien en bytes reales al exportar.
const MAX_JSON_BYTES=64*1024*1024,MAX_IMAGE_B64=3*1024*1024,MAX_IMAGES=160;
const MAX_ITEMS=100; // límite del almacenamiento de colecciones existente
const MAX_FAVS=25000;
function referencedImages(profile,personal){
 const names=[profile.avatar,profile.cover,profile.banner,...personal.collections.map(c=>c.coverPhoto)]
  .filter(v=>v!=null);
 for(const name of names)if(typeof name!=="string"||!COVER_FILE.test(name))
  throw new Error("Una imagen tiene un nombre incorrecto.");
 return [...new Set(names)].sort();
}
function readLast(value){
 if(value==null||value==="")return null;
 if(!value||typeof value!=="object"||!["song","medley"].includes(value.type)||
   typeof value.id!=="string"||!value.id||value.id.length>128)return null;
 return {type:value.type,id:value.id};
}
function cleanPayload(source){
 if(!source||typeof source!=="object"||Array.isArray(source))throw new Error("Datos personales incorrectos.");
 if(!source.profile||source.profile.version!==1)throw new Error("El perfil no es compatible.");
 if(!source.personal||source.personal.version!==1||!Array.isArray(source.personal.collections)||
 source.personal.collections.length>MAX_ITEMS)throw new Error("Las colecciones no son compatibles.");
 if(!Array.isArray(source.likedIds)||source.likedIds.length>MAX_FAVS||
  source.likedIds.some(id=>typeof id!=="string"||!id.trim()||id.length>128))
  throw new Error("La lista de Mis me gusta es incorrecta.");
 const profile=parseProfile(JSON.stringify(source.profile));
 const personal=parseStore(JSON.stringify(source.personal));
 if(personal.collections.length!==source.personal.collections.length)
  throw new Error("El archivo contiene alguna colección que no se puede recuperar.");
 for(let index=0;index<personal.collections.length;index++){
  const incoming=source.personal.collections[index],safe=personal.collections[index];
  if(!Array.isArray(incoming.entries)||incoming.entries.length!==safe.entries.length)
   throw new Error("Una colección no está completa.");
  for(let e=0;e<safe.entries.length;e++){
   if(!Array.isArray(incoming.entries[e]?.parts)||incoming.entries[e].parts.length!==safe.entries[e].parts.length)
    throw new Error("Un repertorio, misa o popurrí está incompleto.");
  }
 }
 if(!source.profile.name||!source.profile.subtitle)throw new Error("El perfil está incompleto.");
 const likedIds=parseFavorites(JSON.stringify(source.likedIds));
 return {profile,personal,likedIds,lastRead:readLast(source.lastRead)};
}
function validImage(image){
 if(!image||typeof image.name!=="string"||!COVER_FILE.test(image.name)||
 typeof image.base64!=="string"||image.base64.length<16||image.base64.length>MAX_IMAGE_B64||
 image.base64.length%4!==0||!/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(image.base64))
  throw new Error("Una fotografía del respaldo está dañada.");
 return {name:image.name,base64:image.base64};
}
function checksum(text){
 // Detección accidental de corrupción; no es un mecanismo de cifrado ni autenticidad.
 let v=2166136261;
 for(let i=0;i<text.length;i++)v=Math.imul(v^text.charCodeAt(i),16777619)>>>0;
 return v.toString(16).padStart(8,"0");
}
function buildBackup(source,images,createdAt=new Date().toISOString()){
 const clean=cleanPayload(source);
 const references=referencedImages(clean.profile,clean.personal);
 if(!Array.isArray(images)||images.length!==references.length||images.length>MAX_IMAGES)
  throw new Error("No se pudieron reunir todas las portadas y fotografías.");
 const seen=new Set();
 const media=images.map(image=>{
  const value=validImage(image);
  if(seen.has(value.name)||!references.includes(value.name))
   throw new Error("Hay imágenes duplicadas o desconocidas.");
  seen.add(value.name);
  return value;
 }).sort((a,b)=>a.name.localeCompare(b.name));
 if(references.some(name=>!seen.has(name)))throw new Error("Falta una imagen del perfil o las colecciones.");
 if(!Number.isFinite(Date.parse(createdAt)))throw new Error("Fecha de respaldo incorrecta.");
 const body={format:FORMAT,version:VERSION,createdAt,profile:clean.profile,
  personal:clean.personal,likedIds:clean.likedIds,lastRead:clean.lastRead,images:media};
 const content=JSON.stringify(body);
 if(content.length>MAX_JSON_BYTES)throw new Error("El respaldo supera 64 MB. Reduce algunas portadas para continuar.");
 return JSON.stringify({...body,checksum:checksum(content)});
}
function readBackup(raw){
 if(typeof raw!=="string"||raw.length>MAX_JSON_BYTES||raw.length<40)
  throw new Error("El archivo excede el límite o está vacío.");
 let data;
 try{data=JSON.parse(raw);}catch(_){throw new Error("Este archivo no es un respaldo SHALOM válido.");}
 if(!data||data.format!==FORMAT||data.version!==VERSION)
  throw new Error("Este archivo no es un respaldo SHALOM compatible.");
 const {checksum:expected,...body}=data;
 if(typeof expected!=="string"||checksum(JSON.stringify(body))!==expected)
  throw new Error("El respaldo está incompleto o fue modificado.");
 const clean=cleanPayload(body);
 if(!Array.isArray(body.images)||body.images.length>MAX_IMAGES)
  throw new Error("El archivo tiene una cantidad incorrecta de imágenes.");
 const refs=referencedImages(clean.profile,clean.personal);
 if(refs.length!==body.images.length)throw new Error("Faltan imágenes de este respaldo.");
 const found=new Set();
 const images=body.images.map(item=>{
  const image=validImage(item);
  if(found.has(image.name)||!refs.includes(image.name))
   throw new Error("El respaldo contiene imágenes repetidas o desconocidas.");
  found.add(image.name);
  return image;
 });
 if(refs.some(r=>!found.has(r)))throw new Error("No están todas las fotografías.");
 return {...clean,images,createdAt:body.createdAt};
}
function remapPhotos(parsed,mapping){
 if(!parsed||!mapping||typeof mapping!=="object")throw new Error("El respaldo no se pudo preparar.");
 const photo=v=>v?(mapping[v]||null):null;
 const profile={...parsed.profile,avatar:photo(parsed.profile.avatar),cover:photo(parsed.profile.cover),
  banner:photo(parsed.profile.banner)};
 const personal={...parsed.personal,collections:parsed.personal.collections.map(c=>({
  ...c,coverPhoto:photo(c.coverPhoto)
 }))};
 if(referencedImages(profile,personal).length!==Object.keys(mapping).length)
  throw new Error("No se reconstruyeron correctamente las imágenes del respaldo.");
 return {profile,personal,likedIds:parsed.likedIds,lastRead:parsed.lastRead};
}
function summaryOf(parsed){
 return {favorites:parsed.likedIds.length,collections:parsed.personal.collections.length,
  misas:parsed.personal.collections.reduce((n,c)=>n+c.entries.filter(e=>e.kind==="misa").length,0),
  popurris:parsed.personal.collections.reduce((n,c)=>n+c.entries.filter(e=>e.kind==="popurri").length,0),
  repertorios:parsed.personal.collections.reduce((n,c)=>n+c.entries.filter(e=>e.kind==="repertorio").length,0),
  images:parsed.images.length};
}
module.exports={FORMAT,VERSION,MAX_JSON_BYTES,MAX_IMAGE_B64,MAX_IMAGES,
 referencedImages,buildBackup,readBackup,remapPhotos,summaryOf,checksum};
