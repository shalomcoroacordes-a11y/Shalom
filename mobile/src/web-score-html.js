const palette=require("./palette");
// HTML autosuficiente para dibujar canciones como la web pública de SHALOM.
// React Native Text no reproduce de manera consistente las columnas de Courier New
// con acentos y espacios; Chromium utiliza las mismas reglas que el administrador.
const {clampReaderFont,MIN_READER_FONT,MAX_READER_FONT,DEFAULT_READER_FONT}=require("./score-zoom");
const escapeHTML=value=>String(value??"")
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
function scoreMarkup(rows){
 return (rows||[]).map(row=>{
  if(row.kind==="space")return '<span class="song-empty-line"></span>';
  if(row.kind==="section")return '<span class="song-section-label">'+escapeHTML(row.text)+'</span>';
  if(row.kind==="chords")return '<span class="song-line song-stacked-chords"'+(Array.isArray(row.anchors)?' data-chord-anchors="'+escapeHTML(JSON.stringify(row.anchors))+'"':"")+'><span class="chord-line">'+
   escapeHTML(row.chordLine||" ")+'</span><span class="lyric-line">'+
   escapeHTML(row.lyricLine||" ")+'</span></span>';
  if(row.kind==="chordsOnly")return '<span class="song-standalone-chords">'+escapeHTML(row.text||" ")+'</span>';
  return '<span class="song-plain-line">'+escapeHTML(row.text||" ")+'</span>';
 }).join("");
}
function estimateScoreHeight(rows,fontSize){
 const font=Number(fontSize)||15;
 let units=0;
 for(const row of rows||[]){
  if(row.kind==="chords")units+=2*font*1.22+3;
  else if(row.kind==="space")units+=font*1.45;
  else if(row.kind==="section")units+=font*1.22+13;
  else units+=font*1.22;
 }
 return Math.max(80,Math.ceil(units+16));
}
function scoreHtml(rows,fontSize=15,assets=null,options={}){
 const proportional=!!assets&&rows.every(row=>row.kind!=="chords"||Array.isArray(row.anchors));
 const size=clampReaderFont(fontSize);
 const fitHeight=Number.isFinite(options.fitHeight)&&options.fitHeight>0?Math.round(options.fitHeight):0;
 // CSS reproduce las reglas de song-chords.css en admin y la web pública.
 const css=[
  'html,body{margin:0;padding:0;border:0;background:'+palette.bg+';color:'+palette.text+';}',
  options.scrollDocument?'body{overflow:auto;}':'body{overflow:hidden;}',
  '.score-scroll{width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;}',
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
  '.song-empty-line{display:block;height:1.45em;}'
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
  'var lyrics=target&&target.querySelector(".song-lyrics");',
  'var zoom='+size+';var reportedZoom=zoom;var startZoom=zoom;var startDistance=0;var pinching=false;',
  'if(window.addEventListener)window.addEventListener("shalom-score-fit",function(e){zoom=e.detail.fontSize;reportedZoom=zoom;startZoom=zoom;scheduleMeasure();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:"score-fit",fontSize:zoom}));});',
  'function clampZoom(v){return Math.min('+MAX_READER_FONT+',Math.max('+MIN_READER_FONT+',Math.round(v*10)/10));}',
  "function dist(a,b){var x=a.clientX-b.clientX;var y=a.clientY-b.clientY;return Math.sqrt(x*x+y*y);}",
  "function pinchBegin(e){",
  "if(!lyrics||e.touches.length!==2)return;",
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
  "zoom=next;lyrics.style.fontSize=next+\"px\";scheduleMeasure();",
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
  '<div id="score" class="score-scroll"><div class="song-lyrics">'+scoreMarkup(rows)+'</div></div>'+
  '<script>'+measure+'</script>'+(proportional?'<script>'+assets.layout+'\n'+assets.reader+'\n'+
  '(async function(){var wrapper=document.querySelector(".song-lyrics");try{if(!await ShalomScoreReader.loadFont())return;var score=ShalomScoreReader.buildMarkup(wrapper.innerHTML);var original=Array.from(wrapper.childNodes);wrapper.replaceChildren(score);try{ShalomScoreReader.relayout(score);}catch(e){wrapper.replaceChildren(...original);throw e;}var budget='+fitHeight+';if(budget>0){var result=ShalomScoreReader.fitSection(wrapper,score,{width:document.getElementById("score").clientWidth,height:budget,min:12,max:'+DEFAULT_READER_FONT+'});if(result)window.dispatchEvent(new CustomEvent("shalom-score-fit",{detail:result}));}window.dispatchEvent(new Event("resize"));}catch(e){console.warn("SHALOM: retained original score",e);}})();'+
  '</script>':'')+'</body></html>';
}
module.exports={scoreHtml,scoreMarkup,estimateScoreHeight,escapeHTML};
