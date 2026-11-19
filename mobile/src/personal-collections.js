// Colecciones y partituras personales: siempre locales, sin escrituras a Supabase.
// El código contiene referencias a cantos publicados, no letras ni acordes nuevos.
const STORE_KEY="shalom_personal_collections_v1";
const COLORS=["#27c98b","#2e84d7","#a078e1","#dba13a","#e66b91","#58a7a0","#ec9952","#105c8f","#7e3d93","#c85262"];
const COVER_PRESETS=["dove","sunrise","guitar","adoration","book","flowers","choir","music"];
const COVER_FILE=/^cover-[a-z0-9-]+\.jpg$/;
const MOMENTS=["Entrada","Señor ten piedad","Gloria","Salmo","Aleluya","Ofertorio","Santo","Cordero","Comunión","Salida","Otro"];
const PREFIX="SHALOM1-";
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LIMIT_PARTS=30;
const text=(value,max)=>String(value==null?"":value).trim().slice(0,max);
const makeId=()=> "local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
const emptyStore=()=>({version:1,collections:[]});
function partFrom(input,forceId=false){
 if(!input||typeof input!=="object")throw new Error("Fragmento incorrecto.");
 const songId=text(input.songId,128);
 if(!songId||/\s/.test(songId))throw new Error("Hay un canto sin identificador válido.");
 const sectionIndex=input.sectionIndex==null?null:Number(input.sectionIndex);
 if(sectionIndex!==null&&(!Number.isInteger(sectionIndex)||sectionIndex<0||sectionIndex>250))
  throw new Error("La estrofa seleccionada no es válida.");
 const shift=Number(input.shift||0);
 if(!Number.isInteger(shift)||shift< -11||shift>11)throw new Error("El tono está fuera del rango permitido.");
 return {id:forceId?makeId():text(input.id,80)||makeId(),songId,
  sectionIndex,sectionTitle:sectionIndex===null?"":text(input.sectionTitle,100),
  shift,moment:text(input.moment,60)};
}
function entryFrom(input,forceId=false){
 if(!input||!["misa","popurri","repertorio"].includes(input.kind))throw new Error("Tipo de composición no válido.");
 const title=text(input.title,120);
 if(!title)throw new Error("Escribe un nombre para la misa o el popurrí.");
 if(!Array.isArray(input.parts)||input.parts.length>LIMIT_PARTS)
  throw new Error("Se permiten hasta 30 fragmentos por composición.");
 return {id:forceId?makeId():text(input.id,80)||makeId(),kind:input.kind,title,
  parts:input.parts.map(p=>partFrom(p,forceId))};
}
function collectionFrom(input){
 if(!input||typeof input!=="object")throw new Error("Colección incorrecta.");
 const name=text(input.name,90);
 if(!name)throw new Error("Escribe el nombre de la colección.");
 const color=COLORS.includes(input.color)?input.color:COLORS[0];
 if(!Array.isArray(input.entries)||input.entries.length>100)
  throw new Error("La colección admite hasta 100 composiciones.");
 const coverPreset=COVER_PRESETS.includes(input.coverPreset)?input.coverPreset:"dove";
 const coverPhoto=typeof input.coverPhoto==="string"&&COVER_FILE.test(input.coverPhoto)?input.coverPhoto:null;
 return {id:text(input.id,80)||makeId(),name,color,coverPreset,coverPhoto,
  entries:input.entries.map(e=>entryFrom(e))};
}
function parseStore(raw){
 try {
  const obj=JSON.parse(String(raw||""));
  if(obj.version!==1||!Array.isArray(obj.collections)||obj.collections.length>100)return emptyStore();
  return {version:1,collections:obj.collections.map(collectionFrom)};
 } catch(_){return emptyStore();}
}
function newCollection(name,color=COLORS[0],coverPreset="dove"){return collectionFrom({name,color,coverPreset,entries:[]});}
function newEntry(kind,title){return entryFrom({kind,title,parts:[]});}
function newPart(songId,moment=""){return partFrom({songId,moment,sectionIndex:null,shift:0});}
function songSections(lyrics){
 const lines=String(lyrics||"").replace(/\r\n?/g,"\n").split("\n");
 const sections=[];
 let title="Inicio",block=[];
 const flush=()=>{
  if(block.join("").trim())sections.push({index:sections.length,title,text:block.join("\n").trim()});
  block=[];
 };
 for(const line of lines){
  const match=line.trim().match(/^\[([^\]]+)\]$/);
  if(match){flush();title=text(match[1],100);block.push(line);}
  else block.push(line);
 }
 flush();
 return sections.length?sections:[{index:0,title:"Canto completo",text:String(lyrics||"").trim()}];
}
function resolvePart(song,part){
 if(!song)return {lyrics:null,error:"Este canto no se encuentra en la biblioteca descargada."};
 if(part.sectionIndex==null)return {lyrics:song.lyrics||"",section:"Canto completo"};
 const sections=songSections(song.lyrics);
 const title=text(part.sectionTitle,100).toLowerCase();
 let section=sections[part.sectionIndex];
 if(!section|| (title && section.title.toLowerCase()!==title)){
  const matches=sections.filter(s=>s.title.toLowerCase()===title);
  section=matches.length===1?matches[0]:null;
 }
 if(!section)return {lyrics:null,error:"Esta estrofa ya no coincide con el canto actualizado. Revisa la composición."};
 return {lyrics:section.text,section:section.title};
}
function toBytes(value){
 const escaped=encodeURIComponent(value),bytes=[];
 for(let i=0;i<escaped.length;i++){
  if(escaped[i]==="%"){bytes.push(parseInt(escaped.slice(i+1,i+3),16));i+=2;}
  else bytes.push(escaped.charCodeAt(i));
 }
 return bytes;
}
function fromBytes(bytes){return decodeURIComponent(bytes.map(v=>"%"+v.toString(16).padStart(2,"0")).join(""));}
function encode64(bytes){
 let out="";
 for(let i=0;i<bytes.length;i+=3){
  const a=bytes[i],b=bytes[i+1],c=bytes[i+2];
  out+=ALPHABET[a>>2]+ALPHABET[((a&3)<<4)|((b||0)>>4)];
  if(b!==undefined)out+=ALPHABET[((b&15)<<2)|((c||0)>>6)];
  if(c!==undefined)out+=ALPHABET[c&63];
 }
 return out;
}
function decode64(value){
 const bytes=[];
 for(let i=0;i<value.length;i+=4){
  const chunk=[...value.slice(i,i+4)].map(c=>ALPHABET.indexOf(c));
  if(chunk.some(n=>n<0))throw new Error("Código con caracteres inválidos.");
  bytes.push((chunk[0]<<2)|(chunk[1]>>4));
  if(chunk.length>2)bytes.push(((chunk[1]&15)<<4)|(chunk[2]>>2));
  if(chunk.length>3)bytes.push(((chunk[2]&3)<<6)|chunk[3]);
 }
 return bytes;
}
function signature(bytes){
 let hash=2166136261;
 for(const byte of bytes){hash=Math.imul(hash^byte,16777619)>>>0;}
 return hash.toString(16).padStart(8,"0");
}
function exportCode(entry){
 const valid=entryFrom(entry);
 if(!valid.parts.length)throw new Error("Agrega al menos un canto antes de compartir.");
 const data=["SHALOM",1,valid.kind,valid.title,
  valid.parts.map(p=>[p.songId,p.sectionIndex==null?-1:p.sectionIndex,p.sectionTitle,p.shift,p.moment])];
 const bytes=toBytes(JSON.stringify(data));
 if(bytes.length>9000)throw new Error("La composición es demasiado grande para compartir por código.");
 return PREFIX+encode64(bytes)+"-"+signature(bytes);
}
function importCode(message){
 const raw=String(message||"");
 if(raw.length>20000)throw new Error("El mensaje es demasiado largo.");
 const match=raw.match(/SHALOM1-([A-Za-z0-9_-]+)-([a-fA-F0-9]{8})/);
 if(!match)throw new Error("No se encontró un código de SHALOM válido.");
 if(match[1].length>12000)throw new Error("El código supera el tamaño permitido.");
 const bytes=decode64(match[1]);
 if(signature(bytes)!==match[2].toLowerCase())throw new Error("El código está incompleto o fue modificado.");
 let data;
 try{data=JSON.parse(fromBytes(bytes));}catch(_){throw new Error("No se pudo leer este código.");}
 if(!Array.isArray(data)||data.length!==5||data[0]!=="SHALOM"||data[1]!==1)
  throw new Error("Código de otra aplicación o versión incompatible.");
 if(!Array.isArray(data[4])||!data[4].length||data[4].length>LIMIT_PARTS)
  throw new Error("La composición no tiene una cantidad válida de fragmentos.");
 const parts=data[4].map(p=>{
  if(!Array.isArray(p)||p.length!==5)throw new Error("El código contiene un fragmento incorrecto.");
  return partFrom({songId:p[0],sectionIndex:p[1]===-1?null:p[1],
   sectionTitle:p[2],shift:p[3],moment:p[4]},true);
 });
 return entryFrom({kind:data[2],title:data[3],parts},true);
}
module.exports={STORE_KEY,COLORS,COVER_PRESETS,COVER_FILE,MOMENTS,LIMIT_PARTS,emptyStore,parseStore,newCollection,newEntry,newPart,
 songSections,resolvePart,entryFrom,exportCode,importCode};
