"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process");
const browser=process.env.CHROME_BIN||["google-chrome","chromium","chromium-browser"].find(name=>cp.spawnSync(name,["--version"],{encoding:"utf8"}).status===0);
if(!browser)throw Error("Chrome/Chromium required for visual score regression");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"shalom-score-"));
try{
 const file=path.resolve(__dirname,"../tests/score-reader-browser.html");
 const result=cp.spawnSync(browser,["--headless","--no-sandbox","--disable-gpu","--allow-file-access-from-files","--user-data-dir="+temp,"--virtual-time-budget=10000","--dump-dom","file://"+file],{encoding:"utf8",timeout:45000,maxBuffer:4*1024*1024});
 if(result.error||result.status!==0||!/<p id="result">PASS: real browser Inter anchors/.test(result.stdout||""))throw Error(result.error?.message||((result.stdout||"").match(/<p id="result">[^<]+/)||[])[0]||result.stderr||"Browser did not finish");
 console.log("Browser: Inter loaded, chord alignment, collisions and zoom verified.");

 const publicScore=require("../mobile/src/web-score-html");
 const adminScore=require("../admin-mobile/src/web-score-html");
 const publicAssets=require("../mobile/src/score-reader-assets");
 const adminAssets=require("../admin-mobile/src/score-reader-assets");
 const assert=require("node:assert/strict");
 const {parseSong}=require("../mobile/src/chords");
 const rows=parseSong("[Coro]\n(Cmaj7)(G/B)Mi (Am)vida\nC    F#m   G/B\nÁbreme Señor\n(D)A & <B>",2,true);
 assert.deepEqual(publicAssets,adminAssets,"Both native apps use byte-identical Inter and renderer");
 const verifyScript='<script>'+ 
  '(function(){var attempts=0;function check(){var score=document.querySelector(".score-proportional");if(!score){if(attempts++<200){setTimeout(check,25);return;}document.body.dataset.result="FAIL-font";return;}try{if(!document.fonts.check("700 19px Inter"))throw Error("font");if(!score.textContent.includes("A & <B>"))throw Error("lyrics");for(const pair of score.querySelectorAll(".score-pair")){var lyric=pair.querySelector(".score-lyric");for(const note of pair.querySelectorAll(".score-chord")){var p=Number(note.dataset.position);if(p<=lyric.textContent.length){var r=document.createRange();r.setStart(lyric.firstChild,p);r.collapse(true);if(Math.abs(note.getBoundingClientRect().left-r.getBoundingClientRect().left)>1)throw Error("anchor");}}}document.body.dataset.result="PASS-native";}catch(e){document.body.dataset.result="FAIL-"+e.message;}}check();})();'+
  '</script>';
 for(const [name,make,assets,options] of [["public",publicScore,publicAssets,{}],["admin",adminScore,adminAssets,{scrollDocument:true}]]){
  const file=path.join(temp,name+".html");
  const document=make.scoreHtml(rows,19,assets,options);
  assert.ok(document.includes("font-src data:"),"Only embedded font sources permitted");
  fs.writeFileSync(file,document.replace("</body>",verifyScript+"</body>"));
  const result=cp.spawnSync(browser,["--headless","--no-sandbox","--disable-gpu","--user-data-dir="+temp,"--virtual-time-budget=10000","--dump-dom","file://"+file],{encoding:"utf8",timeout:45000,maxBuffer:4*1024*1024});
  assert.ok(!result.error&&result.status===0&&/<body[^>]*data-result="PASS-native"/.test(result.stdout||""),name+" local WebView document failed: "+((result.stdout||"").match(/data-result="FAIL-[^"]*"/)||[])[0]);
  console.log("Native "+name+": embedded Inter and real-browser chord anchors verified.");
 }

}finally{fs.rmSync(temp,{recursive:true,force:true});}
