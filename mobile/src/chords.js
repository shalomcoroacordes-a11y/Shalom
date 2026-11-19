// Render de acordes nativo: algoritmo equivalente a song-chords.js (web y admin).
// Los índices de columna dependen del texto original, nunca de píxeles ni de anchura de pantalla.
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
const CHORD=/^[A-G](?:#|b)?(?:maj(?:7|9|11|13)?|m(?:maj7|[0-9]*)?|min(?:[0-9]*)?|sus[24]?|add\d+|dim7?|aug|\+|-|[0-9]*)?(?:\/[A-G](?:#|b)?)?$/;
const unwrap=token=>String(token||"").replace(/^\(([^)]+)\)$/,"$1");
const isChord=token=>CHORD.test(unwrap(token));
const isChordGroup=text=>{
 const tokens=String(text||"").trim().split(/\s+/).filter(Boolean);
 return tokens.length>0&&tokens.every(isChord);
};
function transposeOne(value,shift){
 const move=n=>{const i=NOTES.indexOf(FLATS[n]||n);return i<0?n:NOTES[(i+shift+120)%12]};
 return String(value).replace(/^([A-G](?:#|b)?)(.*)$/,(_,root,rest)=>move(root)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+move(bass)));
}
function chordRow(line){
 return Boolean(String(line).trim()&&!/^\s*\[[^\]]+\]\s*$/.test(line)&&isChordGroup(line));
}
// Al transponer se conservan íntegros los espacios de separación del editor.
function transposeRow(line,shift){
 return String(line).replace(/\S+/g,t=>isChord(t)?transposeOne(unwrap(t),shift):t);
}
function inline(line,shift){
 let lyricLine="",chordLine="",last=0,hasChords=false,match;
 const rx=/\(([^)]+)\)/g;
 while((match=rx.exec(line))!==null){
  lyricLine+=line.slice(last,match.index);
  if(isChordGroup(match[1])){
   const converted=transposeRow(match[1],shift);
   const position=Math.max(lyricLine.length,chordLine.length?chordLine.length+1:0);
   chordLine=chordLine.padEnd(position," ")+converted;
   hasChords=true;
  }else lyricLine+=match[0];
  last=rx.lastIndex;
 }
 lyricLine+=line.slice(last);
 return {chordLine,lyricLine,hasChords};
}
function merge(upper,lower){
 const chords=[];
 for(const line of [upper,lower]){
  for(const m of String(line).matchAll(/\S+/g))chords.push({position:m.index,chord:m[0]});
 }
 chords.sort((a,b)=>a.position-b.position);
 let result="";
 for(const {position,chord} of chords){
  const start=Math.max(position,result.length?result.length+1:0);
  result=result.padEnd(start," ")+chord;
 }
 return result;
}
function parseSong(source,shift=0){
 const lines=String(source??"").replace(/\r\n?/g,"\n").replace(/\t/g,"    ").split("\n");
 const rows=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(!line.trim()){rows.push({kind:"space"});continue;}
  const heading=line.trim().match(/^\[([^\]]+)\]$/);
  if(heading){rows.push({kind:"section",text:heading[1]});continue;}
  if(chordRow(line)){
   const next=lines[i+1]||"";
   if(next.trim()&&!/^\s*\[[^\]]+\]\s*$/.test(next)&&!chordRow(next)){
    const lower=inline(next,shift),upper=transposeRow(line,shift);
    rows.push({kind:"chords",
     chordLine:lower.hasChords?merge(upper,lower.chordLine):upper,
     lyricLine:lower.hasChords?lower.lyricLine:next});
    i++;
   }else rows.push({kind:"chordsOnly",text:transposeRow(line,shift)});
   continue;
  }
  const parsed=inline(line,shift);
  rows.push(parsed.hasChords?
   {kind:"chords",chordLine:parsed.chordLine,lyricLine:parsed.lyricLine}:
   {kind:"lyric",text:line});
 }
 return rows;
}
// NBSP evita que Android colapse o redistribuya columnas y hace que todo el
// renglón permanezca sin saltos, incluso dentro de scroll horizontal.
const preserveColumns=text=>String(text??"").replace(/ /g,"\u00A0");
function scoreColumns(rows){
 return Math.max(24,...rows.map(row=>row.kind==="chords"?
  Math.max(row.chordLine.length,row.lyricLine.length):
  row.kind==="chordsOnly"||row.kind==="lyric"?row.text.length:0));
}
// Margen pequeño por diferencias de medición de glifos; nunca reduce las columnas.
const scoreWidth=(rows,fontSize)=>Math.ceil(scoreColumns(rows)*fontSize*0.65+18);
module.exports={parseSong,transposeOne,chordRow,preserveColumns,scoreColumns,scoreWidth};
