// Edición local pura de colecciones y composiciones (sin efectos secundarios).
function updateCollection(store,folderId,apply){
 return {...store,collections:store.collections.map(folder=>
  folder.id===folderId?apply(folder):folder)};
}
function updateComposition(store,folderId,entryId,apply){
 return updateCollection(store,folderId,folder=>({...folder,
  entries:folder.entries.map(entry=>entry.id===entryId?apply(entry):entry)}));
}
function reorderParts(entry,index,delta){
 if(!entry||!Array.isArray(entry.parts)||!Number.isInteger(index)||!Number.isInteger(delta))return entry;
 const target=index+delta;
 if(index<0||index>=entry.parts.length||target<0||target>=entry.parts.length||index===target)return entry;
 const parts=entry.parts.slice();
 [parts[index],parts[target]]=[parts[target],parts[index]];
 return {...entry,parts};
}
// Reject stale or missing occurrences instead of overwriting another part.
function updateOccurrenceCues(store,target,song,expectedLyrics,expectedOverride,value){
 const {resolvePart}=require("./personal-collections"),{normalizeOverride}=require("./studio-reader-cues"),core=require("./studio-core"),codec=require("./studio-codec"),{parseSong}=require("./chords");
 const entry=store.collections.find(f=>f.id===target.folderId)?.entries.find(e=>e.id===target.entryId);
 const part=entry?.parts.find(p=>p.id===target.partId);
 if(!part||String(part.songId)!==String(song.id)||resolvePart(song,part).lyrics!==expectedLyrics||JSON.stringify(part.cueOverride??null)!==JSON.stringify(expectedOverride??null))throw Error("La composición cambió. Abre de nuevo las indicaciones.");
 const next=normalizeOverride(value);
 if(next&&codec.decodeLyricCues({v:1,k:"lyrics",j:next.j}).some(c=>!core.validLyricCue(parseSong(expectedLyrics,0),c)))throw Error("Revisa las frases seleccionadas: la letra cambió.");
 return updateComposition(store,target.folderId,target.entryId,e=>({...e,parts:e.parts.map(p=>{
  if(p.id!==target.partId)return p;
  const copy={...p};if(next)copy.cueOverride=next;else delete copy.cueOverride;return copy;
 })}));
}
module.exports=Object.freeze({updateCollection,updateComposition,reorderParts,updateOccurrenceCues});
