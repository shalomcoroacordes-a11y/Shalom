// Prepara un lector continuo sin acoplar datos del canto a los componentes React.
const {resolvePart}=require("./personal-collections");
const {transposeOne}=require("./chords");
function readingRows(entry,catalog,readerShift=0){
 if(!entry||!Array.isArray(entry.parts))return [];
 return entry.parts.map((part,index)=>{
  const song=catalog.get(part.songId);
  const resolved=resolvePart(song,part);
  const shift=part.shift+readerShift;
  return {part,index,song,resolved,shift,
   tone:song?.tone?transposeOne(song.tone,shift):null};
 });
}
module.exports=Object.freeze({readingRows});
