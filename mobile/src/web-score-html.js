const palette=require("./palette");
// HTML autosuficiente para dibujar canciones como la web pública de SHALOM.
// React Native Text no reproduce de manera consistente las columnas de Courier New
// con acentos y espacios; Chromium utiliza las mismas reglas que el administrador.
const {clampReaderFont,MIN_READER_FONT,MAX_READER_FONT,DEFAULT_READER_FONT}=require("./score-zoom");
const {cueMarkup}=require("./studio-reader-cues");
const {chooseFitFont}=require("./section-reader-core");
const escapeHTML=value=>String(value??"")
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
function scoreMarkup(rows){
 return (rows||[]).map(row=>{
  if(row.kind==="cue")return cueMarkup(row,escapeHTML);
  if(row.kind==="space")return '<span class="song-empty-line"></span>';
  if(row.kind==="section")return '<span class="song-section-label">'+escapeHTML(row.text)+'</span>';
  if(row.kind==="chords")return '<span class="song-line song-stacked-chords"'+(Array.isArray(row.anchors)?' data-chord-anchors="'+escapeHTML(JSON.stringify(row.anchors))+'"':'')+'><span class="chord-line">'+
   escapeHTML(row.chordLine||" ")+'</span><span class="lyric-line">'+
   escapeHTML(row.lyricLine||" ")+'</span></span>';
  if(row.kind==="chordsOnly")return '<span class="song-standalone-chords">'+escapeHTML(row.text||" ")+'</span>';
  return '<span class="song-plain-line">'+escapeHTML(row.text||" ")+'</span>';
 }).join("");
}
// Split paired rows at the same character column; prefer a lyric word boundary
// that does not split a chord symbol. This is a display projection, not an edit.
function wrapScoreColumns(chords,lyric,columns){
 const a=String(chords||""),b=String(lyric||""),limit=Math.max(1,Math.floor(columns)||1),length=Math.max(a.length,b.length),out=[];
 const boundary=(line,n)=>n>=line.length||/\s/.test(line[n-1]||" ")||/\s/.test(line[n]||" ");
 for(let start=0;start<length;){
  let end=Math.min(length,start+limit);
  if(end<length){
   let preferred=end;
   while(preferred>start&&(!boundary(a,preferred)||!boundary(b,preferred)))preferred--;
   if(preferred>start)end=preferred;
   else{
    let chordBoundary=end;
    while(chordBoundary>start&&!boundary(a,chordBoundary))chordBoundary--;
    if(chordBoundary>start)end=chordBoundary;
   }
  }
  out.push({chords:a.slice(start,end),lyric:b.slice(start,end)});
  start=end;
 }
 return out.length?out:[{chords:a,lyric:b}];
}
function estimateScoreHeight(rows,fontSize){
 const font=Number(fontSize)||15;
 let units=0;
 for(const row of rows||[]){
  if(row.kind==="chords")units+=2*font*1.22+3;
  else if(row.kind==="cue")units+=font*1.5;
  else if(row.kind==="space")units+=font*1.45;
  else if(row.kind==="section")units+=font*1.22+13;
  else units+=font*1.22;
 }
 return Math.max(80,Math.ceil(units+16));
}
function scoreHtml(rows,fontSize=15,fit={},assets=null){
 const proportional=!!(assets?.font&&assets?.css&&assets?.layout&&assets?.reader&&(rows||[]).every(row=>row.kind!=="chords"||Array.isArray(row.anchors)));
 const size=clampReaderFont(fontSize);
 const fitMode=fit.mode==="auto"||fit.mode==="width"?fit.mode:"manual";
 const fitHeight=fitMode==="auto"&&Number.isFinite(fit.height)&&fit.height>0?Math.floor(fit.height):0;
 // CSS reproduce las reglas de song-chords.css en admin y la web pública.
 const css=[
  'html,body{margin:0;padding:0;border:0;background:'+palette.bg+';color:'+palette.text+';-webkit-text-size-adjust:none;text-size-adjust:none;}',
  'body{overflow:hidden;}',
  '.score-scroll{width:100%;max-width:100vw;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;}',
  '.song-lyrics{font-family:"Courier New",Courier,monospace!important;font-size:'+size+'px;',
  'font-variant-ligatures:none;letter-spacing:0!important;line-height:1.22;',
  'white-space:pre;width:max-content;min-width:100%;padding:5px 4px 12px;',
  'box-sizing:border-box;color:'+palette.text+';}',
  '.song-line{display:block;margin-bottom:3px;break-inside:avoid;}',
  '.chord-line,.lyric-line,.song-plain-line,.song-standalone-chords{',
  'display:block;min-height:0;white-space:pre!important;line-height:1.22!important;',
  'font-size:1em;font-family:inherit;letter-spacing:0!important;}',
  '.chord-line,.song-standalone-chords{color:'+palette.green+'!important;font-weight:850;}',
  '.lyric-line,.song-plain-line{font-weight:400;}',
  '.song-section-label{display:block;color:'+palette.green+'!important;font-weight:850;margin:10px 0 3px;}',
  '.song-empty-line{display:block;height:1.45em;}',
  '.song-lyrics.score-wrapped{width:100%;min-width:0;}',
  '.score-wrapped .song-section-label{white-space:normal;overflow-wrap:anywhere;}',
  '.song-reader-cue{display:block;font-family:system-ui,sans-serif;font-size:.85em;font-style:italic;color:var(--cue-dark,#d1d5db)!important;white-space:normal;overflow-wrap:anywhere;max-width:100vw;margin:.35em 0 .15em;}'
 ].join("");
 // Se informa únicamente la altura; el scroll vertical es de React Native.
 const measure=[
  '(function(){',
  'var target=document.getElementById("score");var previous=0;var measurePending=false;',
  'function send(){',
  'if(!target||!window.ReactNativeWebView)return;',
  'var h=Math.ceil(target.getBoundingClientRect().height+2);',
  'if(h>0&&Math.abs(previous-h)>1){previous=h;',
  'window.ReactNativeWebView.postMessage(JSON.stringify({type:"score-height",height:h}));}',
  '}',
  'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",send);',
  'window.addEventListener("load",send);',
  'window.addEventListener("resize",send);',
  'if(document.fonts&&document.fonts.ready)document.fonts.ready.then(send);',
  'function scheduleMeasure(){if(measurePending)return;measurePending=true;requestAnimationFrame(function(){measurePending=false;send();});}',
  'scheduleMeasure();',
  'var lyrics=target&&target.querySelector(".song-lyrics");var preparing='+JSON.stringify(proportional)+';var interScore=null;',
  'var zoom='+size+';var reportedZoom=zoom;var startZoom=zoom;var startDistance=0;var pinching=false;',
  'function clampZoom(v){return Math.min('+MAX_READER_FONT+',Math.max('+MIN_READER_FONT+',Math.round(v*10)/10));}',
  'var fitMode='+JSON.stringify(fitMode)+';var fitHeight='+fitHeight+';',
  'var chooseFitFont='+chooseFitFont.toString()+';',
  'var wrapScoreColumns='+wrapScoreColumns.toString()+';',
  'var originalMarkup=lyrics?lyrics.innerHTML:"";var wrapped=false;',
  'function restoreRows(){if(!wrapped)return;lyrics.innerHTML=originalMarkup;lyrics.classList.remove("score-wrapped");wrapped=false;}',
  'function fitsWidth(){var width=Math.min(target.clientWidth,document.documentElement.clientWidth||target.clientWidth);return target.scrollWidth<=width+1&&lyrics.getBoundingClientRect().width<=width+0.5;}',
  'function fitsHeight(){return !fitHeight||lyrics.getBoundingClientRect().height+2<=fitHeight;}',
  'function columnLimit(){var sample=document.createElement("span");sample.style.cssText="position:absolute;visibility:hidden;white-space:pre;font-weight:850";sample.textContent="MMMMMMMMMM";lyrics.appendChild(sample);var unit=sample.getBoundingClientRect().width/10;sample.remove();return Math.max(1,Math.floor((target.clientWidth-9)/Math.max(1,unit)));}',
  'function wrapRows(columns){restoreRows();var rows=Array.from(lyrics.children);lyrics.classList.add("score-wrapped");wrapped=true;',
  'rows.forEach(function(row){var chord=row.querySelector(".chord-line"),text=row.querySelector(".lyric-line");',
  'if(chord&&text){var pieces=wrapScoreColumns(chord.textContent,text.textContent,columns);if(pieces.length<2)return;var fragment=document.createDocumentFragment();pieces.forEach(function(piece){var copy=row.cloneNode(true);copy.querySelector(".chord-line").textContent=piece.chords||" ";copy.querySelector(".lyric-line").textContent=piece.lyric||" ";fragment.appendChild(copy);});row.replaceWith(fragment);}',
  'else if(row.classList.contains("song-plain-line")||row.classList.contains("song-standalone-chords")){var parts=wrapScoreColumns("",row.textContent,columns);if(parts.length<2)return;var fragment=document.createDocumentFragment();parts.forEach(function(piece){var copy=row.cloneNode(true);copy.textContent=piece.lyric||" ";fragment.appendChild(copy);});row.replaceWith(fragment);}});}',
  'function fitWrapped(n){restoreRows();lyrics.style.fontSize=n+"px";var columns=columnLimit();wrapRows(columns);while(!fitsWidth()&&columns>1){columns=Math.max(1,Math.floor(columns*.85));wrapRows(columns);}return fitsWidth()&&fitsHeight();}',
  'function fitScore(){if(preparing||fitMode==="manual"||!lyrics||!target||!target.clientWidth||pinching)return;',
  'if(interScore){var result=ShalomScoreReader.fitSection(lyrics,interScore,{width:target.clientWidth,height:fitHeight?Math.max(1,fitHeight-2):1000000,min:12,max:'+DEFAULT_READER_FONT+'});if(result){zoom=result.fontSize;reportedZoom=zoom;target.scrollLeft=0;send();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:"score-fit",fontSize:zoom}));}return;}',
  'restoreRows();lyrics.style.fontSize="12px";',
  'if(fitsWidth()){zoom=chooseFitFont(12,'+DEFAULT_READER_FONT+',function(n){lyrics.style.fontSize=n+"px";return fitsWidth()&&fitsHeight();});lyrics.style.fontSize=zoom+"px";}',
  'else{zoom=chooseFitFont(12,'+DEFAULT_READER_FONT+',fitWrapped);fitWrapped(zoom);}',
  'target.scrollLeft=0;reportedZoom=zoom;send();',
  'if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:"score-fit",fontSize:zoom}));}',
  'if(fitMode!=="manual"){window.addEventListener("resize",fitScore);window.addEventListener("load",fitScore);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitScore);fitScore();}',
  proportional?'(async function(){var original=Array.from(lyrics.childNodes);try{if(await ShalomScoreReader.loadFont()){interScore=ShalomScoreReader.buildMarkup(lyrics.innerHTML);lyrics.replaceChildren(interScore);ShalomScoreReader.relayout(interScore);}}catch(e){interScore=null;lyrics.replaceChildren(...original);console.warn("SHALOM: retained original score",e);}finally{preparing=false;try{fitScore();}finally{target.style.visibility="";scheduleMeasure();}}})();':'',
  "function dist(a,b){var x=a.clientX-b.clientX;var y=a.clientY-b.clientY;return Math.sqrt(x*x+y*y);}",
  "function pinchBegin(e){",
  "if(preparing||!lyrics||e.touches.length!==2)return;",
  "var d=dist(e.touches[0],e.touches[1]);if(d<8)return;",
  "pinching=true;startDistance=d;startZoom=zoom;",
  "}",
  "function pinchMove(e){",
  "if(!pinching){if(e.touches.length===2)pinchBegin(e);return;}",
  "if(e.touches.length!==2)return;",
  "e.preventDefault();",
  "var d=dist(e.touches[0],e.touches[1]);",
  "var next=clampZoom(startZoom*d/startDistance);",
  "if(Math.abs(next-zoom)<0.05)return;",
  "fitMode=\"manual\";restoreRows();zoom=next;lyrics.style.fontSize=next+\"px\";scheduleMeasure();",
  "}",
  "function pinchEnd(e){",
  "if(!pinching)return;",
  "if(e.touches.length>=2){startDistance=dist(e.touches[0],e.touches[1]);startZoom=zoom;return;}",
  "pinching=false;send();",
  'if(window.ReactNativeWebView&&Math.abs(zoom-reportedZoom)>=0.05){',
  "window.ReactNativeWebView.postMessage(JSON.stringify({type:\"score-zoom\",fontSize:zoom}));reportedZoom=zoom;",
  "}",
  "}",
  "if(target){",
  "target.addEventListener(\"touchstart\",pinchBegin,{passive:true});",
  "target.addEventListener(\"touchmove\",pinchMove,{passive:false});",
  "target.addEventListener(\"touchend\",pinchEnd,{passive:true});",
  "target.addEventListener(\"touchcancel\",pinchEnd,{passive:true});",
  "}",
  '})();'
 ].join("");
 return '<!doctype html><html lang="es"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; script-src &#39;unsafe-inline&#39;; font-src data:;">'+
  '<style>'+css+(proportional?'@font-face{font-family:Inter;src:url(data:font/woff2;base64,'+assets.font+') format("woff2");font-weight:100 900;font-style:normal;}'+assets.css+':root{--gold:'+palette.green+';}':'')+'</style></head><body>'+
  '<div id="score" class="score-scroll"'+(proportional?' style="visibility:hidden"':'')+'><div class="song-lyrics">'+scoreMarkup(rows)+'</div></div>'+
  (proportional?'<script>'+assets.layout+'\n'+assets.reader+'</script>':'')+'<script>'+measure+'</script></body></html>';
}
module.exports={scoreHtml,scoreMarkup,estimateScoreHeight,escapeHTML,wrapScoreColumns};
