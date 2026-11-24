/* Shared collection planning: no audio, no storage, no invented accompaniment. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomStudioCollections=api;})(globalThis,function(){
"use strict";
const normalized=v=>String(v??"").replace(/\r\n?/g,"\n").trim();
function sections(lyrics){
 const result=[];let title="Inicio",lines=[];
 function flush(){if(lines.join("").trim())result.push({index:result.length,title,text:normalized(lines.join("\n"))});lines=[]}
 for(const line of normalized(lyrics).split("\n")){const match=line.trim().match(/^\[([^\]]+)\]$/);if(match){flush();title=match[1].trim()}lines.push(line)}
 flush();return result;
}
function validRange(range,total){
 return !!range&&Number.isInteger(range.start)&&Number.isInteger(range.end)&&range.start>=0&&range.end>range.start&&range.end<=total;
}
function resolve(song,part={}){
 const arrangement=song?._studio;
 if(!song||!song.updated_at||arrangement?.v!==1)return {ready:false,reason:"Sin acompañamiento publicado"};
 const lyrics=normalized(song.lyrics);
 if(!lyrics)return {ready:false,reason:"Sin letra disponible"};
 if(part.lyrics===null)return {ready:false,reason:"Fragmento no disponible"};
 const fragment=part.lyrics===undefined?lyrics:normalized(part.lyrics);
 const move=Number(part.shift||0),capo=Number(part.capo||0);
 if(!Number.isInteger(move)||Math.abs(move)>24||!Number.isInteger(capo)||capo<0||capo>12)return {ready:false,reason:"Tono o capo inválido"};
 let range=null;
 if(fragment!==lyrics){
  const matches=sections(lyrics).filter(s=>s.text===fragment);
  if(matches.length!==1)return {ready:false,reason:"Fragmento modificado o ambiguo"};
  const authored=(arrangement.f||[]).find(r=>r.index===matches[0].index);
  if(!validRange(authored,arrangement.n))return {ready:false,reason:"Fragmento sin sincronización publicada"};
  range={start:authored.start,end:authored.end,title:matches[0].title};
 }
 return {ready:true,payload:{type:"shalom-studio-init",mode:"public",song:{id:song.id,title:song.title,lyrics:song.lyrics||"",revision:song.updated_at},arrangement,range,shift:((move%12)+12)%12>6?((move%12)+12)%12-12:((move%12)+12)%12,capo}};
}
function plan(parts,songs){
 const index=new Map((songs||[]).map(s=>[String(s.id),s]));
 const entries=(parts||[]).map((part,i)=>{const song=index.get(String(part.song_id||part.songId));return {index:i,title:part.title||part.song_title||song?.title||"Canto no disponible",moment:part.moment||"",...resolve(song,part)}});
 return {entries,ready:entries.filter(e=>e.ready),total:entries.length};
}
return Object.freeze({sections,validRange,resolve,plan});
});