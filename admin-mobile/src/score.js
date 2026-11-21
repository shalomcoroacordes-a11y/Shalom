"use strict";
// Mismo analizador de acordes que SHALOM público: columnas e inserciones (D) compatibles.
const {parseSong}=require("./chords");
function renderLines(text){
 const out=[];
 for(const row of parseSong(text,0)){
  if(row.kind==="chords"){out.push({type:"chords",text:row.chordLine||" "});out.push({type:"lyrics",text:row.lyricLine||" "});}
  else if(row.kind==="chordsOnly")out.push({type:"chords",text:row.text||" "});
  else if(row.kind==="section")out.push({type:"section",text:row.text});
  else out.push({type:"lyrics",text:row.text||" "});
 }
 return out;
}
module.exports={renderLines};
