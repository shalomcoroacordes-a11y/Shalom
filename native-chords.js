// Native adapter for the canonical song-chords.js parser.
// Native transposition and column measurements remain platform-specific.
const shared=require("./song-chords.js");
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
function transposeOne(value,shift){
 const move=n=>{const i=NOTES.indexOf(FLATS[n]||n);return i<0?n:NOTES[(i+shift+120)%12]};
 return String(value).replace(/^([A-G](?:#|b)?)(.*)$/,(_,root,rest)=>move(root)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+move(bass)));
}
const chordRow=shared.isChordRow;
function parseSong(source,shift=0){
 return shared.parseRows(source,chord=>transposeOne(chord,shift)).map(row=>row.kind==="chords"?{kind:"chords",chordLine:row.chordLine,lyricLine:row.lyricLine}:row);
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
