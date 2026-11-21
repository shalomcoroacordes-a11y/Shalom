"use strict";
// Vista previa sin dependencias web: acordes monoespaciados sobre la letra.
const CHORD=/^[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add|[0-9]|\/|[+#()-])*$/;
function lineIsChord(s){
 const t=String(s||"").trim().split(/\s+/).filter(Boolean);
 return t.length>0&&t.every(x=>CHORD.test(x));
}
function renderLines(text){
 const lines=String(text||"").replace(/\r\n?/g,"\n").split("\n");
 const result=[];
 for(const row of lines){
  if(/^\[[^\]]+\]$/.test(row.trim()))result.push({type:"section",text:row.trim().slice(1,-1)});
  else if(lineIsChord(row))result.push({type:"chords",text:row});
  else result.push({type:"lyrics",text:row||" "});
 }
 return result;
}
module.exports={renderLines,lineIsChord};
