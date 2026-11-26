/* Static reader projection of the canonical Studio arrangement. No audio or writes. */
(function(root,factory){
 const api=typeof module==="object"&&module.exports?factory(require("./studio-core"),require("./studio-codec")):factory(root.ShalomStudio,root.ShalomStudioCodec);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomReaderCues=api;
})(globalThis,function(core,codec){
 "use strict";
 function decorate(sourceRows,arrangement,displayRows=sourceRows){
  if(!Array.isArray(arrangement?.i)||!arrangement.i.length||sourceRows.length!==displayRows.length)return displayRows;
  try{
   const anchors=core.anchorsFromRows(sourceRows),config=codec.decode(anchors,arrangement);
   const byLine=new Map(),m=core.resolution(config.meter,config.division),size=m.beats*m.division;
   for(const cue of core.normalizeCues(config.cues,config)){
    const line=anchors[cue.index].line;
    const label=[core.cueActions[cue.action],core.cueAudiences[cue.audience],cue.text].filter(Boolean).join(" · ");
    const row={kind:"cue",text:"Compás "+(Math.floor(cue.step/size)+1)+" · "+label};
    if(!byLine.has(line))byLine.set(line,[]);
    byLine.get(line).push(row);
   }
   return displayRows.flatMap((row,i)=>[...(byLine.get(i)||[]),row]);
  }catch{return displayRows;}
 }
 return Object.freeze({decorate});
});
