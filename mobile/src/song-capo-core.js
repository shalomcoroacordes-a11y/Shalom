// El capo se resuelve de forma identica en lectura e impresion.
// Modulo puro, sin React Native, red o modificaciones del catalogo.
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
const rootOf=value=>String(value||"").match(/[A-G](?:#|b)?/)?.[0]||"";
const normRoot=value=>FLATS[value]||value;

function capoChoices(song){
 const choices=[{id:"none",label:"Sin capo",position:0,key:""}];
 if(Number(song?.capo_position)>0)choices.push({
  id:"main",label:"Capo "+song.capo_position,
  position:Number(song.capo_position),key:song.capo_key||""});
 for(const item of song?._capos||[])choices.push({
  id:item.id,label:item.label||"Capo "+item.capo_position,
  position:Number(item.capo_position||0),key:item.capo_key||""});
 return choices;
}
function capoSelection(song,selected="none"){
 const choices=capoChoices(song);
 const chosen=choices.find(c=>c.id===selected)||choices[0];
 let offset=0;
 if(chosen.id!=="none"){
  const from=NOTES.indexOf(normRoot(rootOf(song?.tone)));
  const to=NOTES.indexOf(normRoot(rootOf(chosen.key)));
  offset=from>=0&&to>=0?((to-from+12)%12):(-chosen.position||0);
  if(offset>6)offset-=12;
 }
 return {choices,chosen,offset};
}
// Collection preferences are keyed by occurrence, not song id.
function occurrenceKey(collection,index,part){return JSON.stringify([collection?.id,collection?.updated_at||"",index,part?.id||"",part?.song_id||part?.songId||""]);}
function collectionCapo(song,part,selected){
 const value=selected??part?.capoId??part?.capo_id??"none";
 return capoSelection(song,value);
}
module.exports=Object.freeze({capoChoices,capoSelection,occurrenceKey,collectionCapo});
