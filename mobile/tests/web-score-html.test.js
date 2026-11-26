const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {parseSong,transposeOne}=require("../src/chords");
const {scoreHtml,scoreMarkup,estimateScoreHeight,wrapScoreColumns}=require("../src/web-score-html");

const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,"../../song-chords.js"),"utf8"),context);
const web=context.window.ShalomChords;
const source=[
 "[Verso 1]",
 "G                  D",
 "Ahí en la Eucaristía",
 "   C       Am     D",
 "Está tu presencia, Señor",
 "G                  D",
 "Ahí en la Eucaristía",
 "     C              Am      D",
 "Está la prueba de que tú vives, Cristo",
 "",
 "[Coro]",
 "G         Em",
 "Tu cuerpo, tu sangre",
 "   C  Am      C  D",
 "Me da vida, Señor, me da vida"
].join("\n");
const decode=s=>s.replace(/&amp;/g,"&").replace(/&lt;/g,"<")
 .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#039;/g,"'");
const pairs=markup=>[...markup.matchAll(/<span class="chord-line">([\s\S]*?)<\/span><span class="lyric-line">([\s\S]*?)<\/span>/g)]
 .map(m=>({chordLine:decode(m[1]),lyricLine:decode(m[2])}));

for(const shift of [0,2,-3]){
 const rows=parseSong(source,shift);
 const actual=scoreMarkup(rows);
 const website=web.render(source,{transpose:chord=>transposeOne(chord,shift)});
 assert.deepEqual(pairs(actual),pairs(website),
  "Android Chromium must receive exactly the same chord and lyric strings as SHALOM web/admin");
 assert.equal(pairs(actual)[0].chordLine.indexOf(shift===0?"D":shift===2?"E":"B"),19,
  "The second chord must stay at the same saved character column after transposing");
 assert.equal(pairs(actual)[0].lyricLine,"Ahí en la Eucaristía");
 for(const fontSize of [13,15,18,22]){
  const html=scoreHtml(rows,fontSize);
  assert.match(html,new RegExp("font-size:"+fontSize+"px"),"Font-size buttons update one shared CSS font");
  assert.match(html,/font-family:"Courier New",Courier,monospace!important/,
   "The exact same font stack as website/admin");
  assert.match(html,/font-variant-ligatures:none/);
  assert.match(html,/letter-spacing:0!important/);
  assert.match(html,/white-space:pre!important/,"Chord and lyric rows preserve all original spaces");
  assert.match(html,/overflow-x:auto/,"Long lines scroll horizontally without rewrapping");
  assert.match(html,/class="score-scroll"/);
  assert.match(html,/window.ReactNativeWebView.postMessage/,
   "Native container gets actual Chromium layout height");
  assert.ok(estimateScoreHeight(rows,fontSize)>100);
 }
}
const dangerous=parseSong("[Coro]\nG  D\n<tag> & malicioso \"texto\" 'sí'");
const safe=scoreHtml(dangerous,15);
assert.ok(safe.includes("&lt;tag&gt; &amp; malicioso &quot;texto&quot; &#039;sí&#039;"));
assert.ok(!safe.includes("<tag>"));
assert.match(safe,/Content-Security-Policy/,"Embedded offline page forbids remote resources");
assert.match(safe,/default-src &#39;none&#39;/);
const blank=scoreHtml(parseSong(""),15);
assert.ok(estimateScoreHeight(parseSong(""),15)>=80);
assert.doesNotMatch(blank,/<iframe|<img|https?:\/\//i);
const bridge=fs.readFileSync("src/aligned-score-ui.js","utf8");
assert.match(bridge,/const source=useMemo\(\(\)=>\(\{html\}\),\[html\]\)/,"Keep the bundled document source stable on height updates");
assert.match(bridge,/\bsource,\s*originWhitelist/,"Use bundled HTML, never the public URL");
assert.match(bridge,/scrollEnabled:false/,"Native outer screen controls vertical scrolling");
assert.match(bridge,/onError:\(\)=>setFailed\(true\)/,"Keep a fallback for devices without WebView");
assert.match(bridge,/LegacyScore/,"Keep readable native fallback");
assert.match(bridge,/scoreHtml\(rows,safeFont\)/);
console.log("SHALOM: native offline browser text matches web/admin chords and lyrics at all font sizes.");

const longChords="A              Em A7                Dm        B7",longLyric="Rey coronado de amor, de justicia y de paz eterna";
const wrapped=wrapScoreColumns(longChords,longLyric,20);
assert.ok(wrapped.length>1);
assert.equal(wrapped.map(p=>p.chords).join(""),longChords);
assert.equal(wrapped.map(p=>p.lyric).join(""),longLyric);
assert.ok(wrapped.every(p=>p.chords.length<=20&&p.lyric.length<=20));
for(const [a,b] of [["G     Am7    D","Letra sin espacios"],["  F#maj7", "Un nombre"],["", "Una frase sin acordes"],["A", ""],["", ""]]){
 const chunks=wrapScoreColumns(a,b,8);assert.equal(chunks.map(x=>x.chords).join(""),a);assert.equal(chunks.map(x=>x.lyric).join(""),b);
}
assert.deepEqual(wrapScoreColumns("A        Em A7","Emmanuel, Pan que das vida",15).map(p=>p.chords).join(""),"A        Em A7");
const auto=scoreHtml([{kind:"chords",chordLine:longChords,lyricLine:longLyric}],15,{mode:"auto",height:400});
assert.match(auto,/target.scrollWidth<=width\+1/);
assert.match(auto,/target.scrollLeft=0/);
assert.match(auto,/fitWrapped\(zoom\)/);
assert.match(auto,/-webkit-text-size-adjust:none/);
assert.match(bridge,/textZoom:100/);
console.log("Aligned overflow projection preserves both original rows and measures the actual visible width.");
