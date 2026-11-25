// Pure reconciliation. An unversioned legacy value is older than any confirmed write.
const REVISION_KEY="__shalom_preference_revisions__";
function validRevisions(data,revisions){
 return Boolean(revisions&&typeof revisions==="object"&&!Array.isArray(revisions)&&
 Object.entries(revisions).every(([key,value])=>Object.hasOwn(data,key)&&Number.isSafeInteger(value)&&value>0));
}
function mergePreferences(native,file){
 const data={},revisions={};
 for(const key of new Set([...Object.keys(native.data),...Object.keys(file.data)])){
  if(key==="last_sync"||key===REVISION_KEY)continue;
  const n=native.revisions?.[key]||0,f=file.revisions?.[key]||0;
  const useNative=Object.hasOwn(native.data,key)&&(!Object.hasOwn(file.data,key)||n>=f);
  const value=useNative?native.data[key]:file.data[key],revision=useNative?n:f;
  if(typeof value!=="string")continue;
  Object.defineProperty(data,key,{value,enumerable:true,writable:true,configurable:true});
  if(revision)Object.defineProperty(revisions,key,{value:revision,enumerable:true,writable:true,configurable:true});
 }
 return {data,revisions};
}
function updatePreferences(previous,changes,clock=Date.now()){
 if(!changes||typeof changes!=="object"||Array.isArray(changes))throw Error("Preferencias inválidas");
 const entries=Object.entries(changes);
 if(!entries.length||entries.some(([key])=>!key||key==="last_sync"||key===REVISION_KEY||key==="__proto__"||key==="constructor"||key==="prototype"))throw Error("Clave de preferencia inválida");
 const revision=Math.max(clock,1,...Object.values(previous.revisions).map(value=>value+1));
 if(!Number.isSafeInteger(revision))throw Error("Revisión de preferencia inválida");
 return {data:{...previous.data,...Object.fromEntries(entries.map(([k,v])=>[k,String(v)]))},revisions:{...previous.revisions,...Object.fromEntries(entries.map(([k])=>[k,revision]))}};
}
module.exports={REVISION_KEY,validRevisions,mergePreferences,updatePreferences};
