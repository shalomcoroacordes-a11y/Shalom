/* Geometría de lectura proporcional, independiente de plataforma y fuente.
 * Las medidas provienen del lector (p. ej. Range del DOM), no de columnas fijas.
 * Nunca desplaza un acorde horizontalmente para resolver colisiones.
 */
(function(root,factory){
 if(typeof module==="object"&&module.exports)module.exports=factory();
 else root.ShalomScoreLayout=factory();
})(typeof globalThis==="object"?globalThis:this,function(){
 "use strict";
 function layoutAnchors(lyrics,anchors,metrics,gap=4){
  if(typeof lyrics!=="string"||!Array.isArray(anchors)||!metrics||
   typeof metrics.anchorX!=="function"||typeof metrics.chordWidth!=="function"||
   !Number.isFinite(gap)||gap<0)throw new TypeError("Invalid score geometry");
  const positions=anchors.map((anchor,order)=>{
   const {position,chord}=anchor;
   if(!Number.isSafeInteger(position)||position<0||typeof chord!=="string"||!chord)
    throw new TypeError("Invalid chord anchor");
   const x=metrics.anchorX(lyrics,position),width=metrics.chordWidth(chord);
   if(!Number.isFinite(x)||x<0||!Number.isFinite(width)||width<0)throw new TypeError("Invalid measured geometry");
   return {position,chord,x,width,order};
  }).sort((a,b)=>a.x-b.x||a.order-b.order);
  const laneEnds=[];
  let width=metrics.anchorX(lyrics,lyrics.length);
  if(!Number.isFinite(width)||width<0)throw new TypeError("Invalid lyric width");
  const placed=positions.map(({order,...anchor})=>{
   let lane=laneEnds.findIndex(end=>end+gap<=anchor.x);
   if(lane<0)lane=laneEnds.length;
   const end=anchor.x+anchor.width;
   laneEnds[lane]=end;
   width=Math.max(width,end);
   return {...anchor,lane};
  });
  return {anchors:placed,lanes:laneEnds.length,width};
 }
 return Object.freeze({layoutAnchors});
});
