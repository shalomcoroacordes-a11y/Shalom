// Cuadrícula de columnas compartida por los lectores nativos.
// El índice de cada acorde viene directamente del texto guardado en Admin.
// No usar NBSP ni calcular la separación con anchuras de espacios de Android:
// Android puede representar el espacio no separable con otra fuente/anchura.
function anchoredTokens(source){
 const value=String(source??"");
 return [...value.matchAll(/\S+/g)].map(match=>({
  column:match.index,text:match[0]
 }));
}
function columnCount(rows){
 let longest=24;
 for(const row of rows||[]){
  if(row.kind==="chords")longest=Math.max(longest,String(row.chordLine||"").length,String(row.lyricLine||"").length);
  else if(row.kind==="chordsOnly"||row.kind==="lyric")
   longest=Math.max(longest,String(row.text||"").length);
 }
 return longest;
}
function initialCellWidth(fontSize){
 return Number(fontSize)*0.602;
}
function measuredCellWidth(sampleWidth,sampleLength,fontSize){
 if(!Number.isFinite(sampleWidth)||sampleWidth<=0||!Number.isFinite(sampleLength)||sampleLength<1)
  return initialCellWidth(fontSize);
 const cell=sampleWidth/sampleLength;
 // Rechazar dimensiones espurias de un Text que ocupa toda la pantalla.
 return cell>=Number(fontSize)*0.4&&cell<=Number(fontSize)*0.9?cell:initialCellWidth(fontSize);
}
function tokenPositions(source,cellWidth){
 return anchoredTokens(source).map(token=>({...token,x:token.column*cellWidth}));
}
module.exports={anchoredTokens,columnCount,initialCellWidth,measuredCellWidth,tokenPositions};
