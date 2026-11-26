/* Static reader projection of the canonical Studio arrangement. No audio or writes. */
(function(root,factory){
 const api=typeof module==="object"&&module.exports?factory(require("./studio-core"),require("./studio-codec")):factory(root.ShalomStudio,root.ShalomStudioCodec);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomReaderCues=api;
})(globalThis,function(core,codec){
 "use strict";
 function decorate(sourceRows,arrangement,displayRows=sourceRows){
  if((!arrangement?.i?.length&&!arrangement?.j?.length)||sourceRows.length!==displayRows.length)return displayRows;
  try{
   const anchors=core.anchorsFromRows(sourceRows),config=arrangement.k==='lyrics'?{lyricCues:codec.decodeLyricCues(arrangement)}:codec.decode(anchors,arrangement),byLine=new Map();
   function add(line,cue){
    const row={kind:"cue",text:core.cueText(cue)};
    if(!byLine.has(line))byLine.set(line,[]);
    byLine.get(line).push(row);
   }
   for(const cue of core.normalizeCues(config.cues,config))add(anchors[cue.index].line,cue);
   for(const cue of core.normalizeLyricCues(config.lyricCues))if(core.validLyricCue(sourceRows,cue))add(cue.end,cue);
   return byLine.size?displayRows.flatMap((row,i)=>[row,...(byLine.get(i)||[])]):displayRows;
  }catch{return displayRows;}
 }
 return Object.freeze({decorate});
});
