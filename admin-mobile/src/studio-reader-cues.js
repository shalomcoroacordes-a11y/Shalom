/* Static reader projection of the canonical Studio arrangement. No audio or writes. */
(function(root,factory){
 const api=typeof module==="object"&&module.exports?factory(require("./studio-core"),require("./studio-codec")):factory(root.ShalomStudio,root.ShalomStudioCodec);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomReaderCues=api;
})(globalThis,function(core,codec){
 "use strict";
 function collect(sourceRows,arrangement){
  const byLine=new Map();
  if(!arrangement?.i?.length&&!arrangement?.j?.length)return byLine;
  try{
   const anchors=core.anchorsFromRows(sourceRows),config=arrangement.k==='lyrics'?{lyricCues:codec.decodeLyricCues(arrangement)}:codec.decode(anchors,arrangement);
   function add(line,cue){
    const row={kind:"cue",text:core.cueText(cue)};
    if(!byLine.has(line))byLine.set(line,[]);
    byLine.get(line).push(row);
   }
   for(const cue of core.normalizeCues(config.cues,config))add(anchors[cue.index].line,cue);
   for(const cue of core.normalizeLyricCues(config.lyricCues))if(core.validLyricCue(sourceRows,cue))add(cue.end,cue);
   return byLine;
  }catch{return new Map();}
 }
 function applyRows(byLine,rows){return byLine.size?rows.flatMap((row,i)=>[row,...(byLine.get(i)||[])]):rows;}
 function decorate(sourceRows,arrangement,displayRows=sourceRows){
  return sourceRows.length===displayRows.length?applyRows(collect(sourceRows,arrangement),displayRows):displayRows;
 }
 // Overrides belong to one collection occurrence, never to the song record.
 function normalizeOverride(value){
  if(value==null)return null;
  if(!value||value.v!==1||!["append","replace","hide"].includes(value.mode)||Object.keys(value).some(k=>!["v","mode","j"].includes(k)))throw Error("Personalización de indicaciones inválida.");
  const cues=codec.decodeLyricCues({v:1,k:"lyrics",j:value.j});
  if(value.mode==="hide"&&cues.length)throw Error("Ocultar no admite indicaciones adicionales.");
  return {v:1,mode:value.mode,j:codec.encodeLyricCues(cues).j};
 }
 function validateOverride(sourceRows,value){
  const local=normalizeOverride(value);
  if(local&&codec.decodeLyricCues({v:1,k:"lyrics",j:local.j}).some(c=>!core.validLyricCue(sourceRows,c)))throw Error("La letra cambió. Revisa las frases de las indicaciones.");
  return local;
 }
 function decorateCollection(sourceRows,arrangement,override,displayRows=sourceRows){
  if(sourceRows.length!==displayRows.length)return displayRows;
  let local;
  try{local=normalizeOverride(override);}catch{return decorate(sourceRows,arrangement,displayRows);}
  if(!local)return decorate(sourceRows,arrangement,displayRows);
  if(local.mode==="hide")return displayRows;
  const combined=local.mode==="append"?collect(sourceRows,arrangement):new Map();
  for(const [i,rows] of collect(sourceRows,{v:1,k:"lyrics",j:local.j})){
   const inherited=combined.get(i)||[];
   combined.set(i,[...inherited,...rows.filter(row=>!inherited.some(r=>r.text===row.text))]);
  }
  return applyRows(combined,displayRows);
 }
 return Object.freeze({decorate,normalizeOverride,validateOverride,decorateCollection});
});
