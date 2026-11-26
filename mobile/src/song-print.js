// Impresión directa de los datos ya descargados: no necesita abrir SHALOM web.
const {parseSong,transposeOne}=require("./chords");
const {capoSelection}=require("./song-capo-core");
const ReaderCues=require("./studio-reader-cues");
const {cueAppearance}=require("./studio-core");
const esc=value=>String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function readerShiftForPrint(song,transpose=0,capo="none"){
 return transpose+capoSelection(song,capo).offset;
}
function buildPrintableSong(song,shift=0,showReaderCues=true,override=null){
 if(!song||!song.id)throw new Error("Selecciona un canto guardado.");
 const title=esc(song.title||"Canto de SHALOM");
 const artists=esc((song._artists||[]).map(a=>a.name).filter(Boolean).join(" · ")||"");
 const tone=esc(song.tone?transposeOne(song.tone,shift):"");
 const parsed=parseSong(song.lyrics||"",shift);
 const rows=showReaderCues?ReaderCues.decorateCollection(parseSong(song.lyrics||"",0),song._studio,override,parsed):parsed;
 const html=rows.map(row=>{
  if(row.kind==="cue")return '<div class="cue">'+esc(cueAppearance(row.action).symbol+" "+row.text)+'</div>';
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
  '.chords{color:#126044;font-weight:700}.space{height:3mm}.cue{font-size:9pt;font-style:italic;color:#333;margin:2mm 0 1mm;page-break-after:avoid}</style></head><body>'+
  '<h1>'+title+'</h1><div class="meta">'+artists+(tone?' · Tono '+tone:'')+' · SHALOM</div>'+html+'</body></html>';
}
module.exports={buildPrintableSong,readerShiftForPrint};
