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
}finally{fs.rmSync(temp,{recursive:true,force:true});}
