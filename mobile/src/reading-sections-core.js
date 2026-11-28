// Partition parsed rows, never split a chord/lyric pair or rewrite the saved source.
function splitRows(rows){
 const result=[];let current=[],title="Inicio";
 function flush(){if(current.some(row=>row.kind!=="space"))result.push({title,rows:current});current=[];}
 for(const row of rows||[]){
  if(row.kind==="section"){flush();title=row.text||"Sección";}
  current.push(row);
 }
 flush();
 return result.length?result:[{title:"Canto completo",rows:rows||[]}];
}
function readingPages(parts,parse){
 return parts.flatMap((part,partIndex)=>splitRows(parse(part.lyrics||"",part.shift||0,true)).map((section,index)=>({...section,partIndex,sectionIndex:index})));
}
function currentPage(pages,index){return pages.length?pages[Math.min(pages.length-1,Math.max(0,Number.isInteger(index)?index:0))]:null;}
module.exports={splitRows,readingPages,currentPage};
