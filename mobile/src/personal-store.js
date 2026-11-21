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
module.exports=Object.freeze({updateCollection,updateComposition,reorderParts});
