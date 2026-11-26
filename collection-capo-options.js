/* Collection capo choices for official editors. No song writes. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomCollectionCapoOptions=api;})(globalThis,function(){
"use strict";
function options(song,selected="none"){
 const variants=[{id:"none",label:"Sin capo"}];
 if(Number(song?.capo_position)>0)variants.push({id:"main",label:"Capo "+song.capo_position+(song.capo_key?" · "+song.capo_key:"")});
 for(const c of song?._capos||[])if(c.id&&Number(c.capo_position)>0&&Number(c.capo_position)<=12)variants.push({id:String(c.id),label:(c.label||"Capo "+c.capo_position)+(c.capo_key?" · "+c.capo_key:"")});
 if(selected&&!variants.some(c=>c.id===selected))variants.push({id:selected,label:"Versión no disponible · revisar"});
 return variants;
}
return Object.freeze({options});
});
