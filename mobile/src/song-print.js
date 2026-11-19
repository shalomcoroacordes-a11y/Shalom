// Impresión directa de los datos ya descargados: no necesita abrir SHALOM web.
const {parseSong,transposeOne}=require("./chords");
const esc=value=>String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function readerShiftForPrint(song,transpose=0,capo="none"){
 const choices=[{id:"none",position:0,key:""}];
 if(Number(song?.capo_position)>0)choices.push({id:"main",position:Number(song.capo_position),key:song.capo_key||""});
 for(const item of song?._capos||[])choices.push({id:item.id,position:Number(item.capo_position||0),key:item.capo_key||""});
 const chosen=choices.find(c=>c.id===capo)||choices[0];
 if(chosen.id==="none")return transpose;
 const root=str=>String(str||"").match(/[A-G](?:#|b)?/)?.[0]||"";
 const flat={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
 const norm=str=>flat[str]||str;
 const notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
 const from=notes.indexOf(norm(root(song?.tone)));
 const to=notes.indexOf(norm(root(chosen.key)));
 let offset=from>=0&&to>=0?((to-from+12)%12):(-chosen.position||0);
 if(offset>6)offset-=12;
 return transpose+offset;
}
function buildPrintableSong(song,shift=0){
 if(!song||!song.id)throw new Error("Selecciona un canto guardado.");
 const title=esc(song.title||"Canto de SHALOM");
 const artists=esc((song._artists||[]).map(a=>a.name).filter(Boolean).join(" · ")||"");
 const tone=esc(song.tone?transposeOne(song.tone,shift):"");
 const rows=parseSong(song.lyrics||"",shift);
 const html=rows.map(row=>{
  if(row.kind==="space")return '<div class="space"></div>';
  if(row.kind==="section")return '<div class="section">'+esc(row.text)+'</div>';
  if(row.kind==="chords")return '<div class="pair"><pre class="chords">'+esc(row.chordLine)+'</pre><pre>'+esc(row.lyricLine)+'</pre></div>';
  if(row.kind==="chordsOnly")return '<pre class="chords">'+esc(row.text)+'</pre>';
  return '<pre>'+esc(row.text)+'</pre>';
 }).join("");
 return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>@page{size:A4;margin:12mm 13mm}body{font-family:Arial,sans-serif;color:#111;margin:0}h1{font-size:19pt;margin:0 0 3mm}'+
  '.meta{font-size:9pt;color:#555;margin-bottom:7mm}.section{font-size:11pt;font-weight:700;margin:5mm 0 2mm;page-break-after:avoid}'+
  '.pair{page-break-inside:avoid}pre{font-family:monospace;font-size:10pt;line-height:1.35;white-space:pre;overflow:visible;margin:0}'+
  '.chords{color:#126044;font-weight:700}.space{height:3mm}</style></head><body>'+
  '<h1>'+title+'</h1><div class="meta">'+artists+(tone?' · Tono '+tone:'')+' · SHALOM</div>'+html+'</body></html>';
}
module.exports={buildPrintableSong,readerShiftForPrint};
