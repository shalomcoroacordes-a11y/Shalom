const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
const CHORD=/^[A-G](?:#|b)?(?:maj(?:7|9|11|13)?|m(?:maj7|[0-9]*)?|min(?:[0-9]*)?|sus[24]?|add\d+|dim7?|aug|\+|-|[0-9]*)?(?:\/[A-G](?:#|b)?)?$/;
function transposeOne(value,shift){
 const move=n=>{const i=NOTES.indexOf(FLATS[n]||n);return i<0?n:NOTES[(i+shift+120)%12]};
 return String(value).replace(/^([A-G](?:#|b)?)(.*)$/,(_,root,rest)=>move(root)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+move(bass)));
}
function chordRow(line){
 const s=line.trim();return Boolean(s&&!/^\[[^\]]+\]$/.test(s)&&s.split(/\s+/).every(t=>CHORD.test(t.replace(/^\(([^)]+)\)$/,"$1"))));
}
function transposeRow(line,shift){return String(line).replace(/\S+/g,t=>CHORD.test(t.replace(/^\(([^)]+)\)$/,"$1"))?transposeOne(t.replace(/^\(([^)]+)\)$/,"$1"),shift):t)}
function inline(line,shift){
 let lyric="",chords="",last=0,valid=false,match;const rx=/\(([^)]+)\)/g;
 while((match=rx.exec(line))){
  lyric+=line.slice(last,match.index);
  const tokens=match[1].trim().split(/\s+/);
  if(tokens.length&&tokens.every(t=>CHORD.test(t))){
   const converted=tokens.map(t=>transposeOne(t,shift)).join(" ");
   chords=chords.padEnd(Math.max(lyric.length,chords?chords.length+1:0)," ")+converted;valid=true;
  }else lyric+=match[0];
  last=rx.lastIndex;
 }
 return {lyric:lyric+line.slice(last),chords,valid};
}
function merge(upper,lower){
 const pos=[];for(const line of [upper,lower])for(const m of line.matchAll(/\S+/g))pos.push([m.index,m[0]]);
 pos.sort((a,b)=>a[0]-b[0]);let out="";
 for(const [at,chord] of pos)out=out.padEnd(Math.max(at,out?out.length+1:0)," ")+chord;
 return out;
}
function parseSong(source,shift=0){
 const lines=String(source||"").replace(/\r\n?/g,"\n").replace(/\t/g,"    ").split("\n"),rows=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i],s=line.trim();
  if(!s){rows.push({kind:"space"});continue;}
  const h=s.match(/^\[([^\]]+)\]$/);
  if(h){rows.push({kind:"section",text:h[1]});continue;}
  if(chordRow(line)){
   const next=lines[i+1]||"";
   if(next.trim()&&!chordRow(next)&&!/^\[[^\]]+\]$/.test(next.trim())){
    const v=inline(next,shift),upper=transposeRow(line,shift);
    rows.push({kind:"chords",chordLine:v.valid?merge(upper,v.chords):upper,lyricLine:v.lyric});i++;
   } else rows.push({kind:"chordsOnly",text:transposeRow(line,shift)});
   continue;
  }
  const v=inline(line,shift);rows.push(v.valid?{kind:"chords",chordLine:v.chords,lyricLine:v.lyric}:{kind:"lyric",text:line});
 }
 return rows;
}
module.exports={parseSong,transposeOne,chordRow};