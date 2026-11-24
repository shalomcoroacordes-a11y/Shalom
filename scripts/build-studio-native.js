"use strict";
// Bundle the single canonical Web Audio/Studio implementation for both native apps.
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
function bundle(read){
 let html=read("studio-lab.html").replace('<link rel="stylesheet" href="studio.css">',()=>'<style>'+read("studio.css")+'</style>');
 html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\';">');
 html=html.replace(/<script defer src="([^"]+)"><\/script>/g,(_,name)=>{
  let code=read(name);
  if(name==="studio-lab.js"){
   code=code.replace("embedded=window.parent!==window","embedded=true");
   code=code.replace('window.parent.postMessage({type:"shalom-studio-publish",arrangement},location.origin);','window.ReactNativeWebView.postMessage(JSON.stringify({type:"shalom-studio-publish",arrangement}));');
   code=code.replace('localStorage.setItem(storageKey,JSON.stringify(mode==="admin"?{revision:baseRevision,config}:{source:$("source").value,config}));finishSave(true,"Borrador guardado en este dispositivo; no publicado.");','window.ReactNativeWebView.postMessage(JSON.stringify({type:"shalom-studio-draft",arrangement}));note("Guardando borrador…");');
   code=code.replace('window.addEventListener("message",e=>{if(e.origin!==location.origin||e.source!==window.parent)return;const d=e.data||{};','function receive(d){d=d||{};');
   code=code.replace('note(err.message)}});\n window.parent.postMessage({type:"shalom-studio-ready"},location.origin);','note(err.message)}}\n window.__shalomStudioReceive=receive;receive(window.__shalomStudioInit);');
   code=code.replace('const published=d.arrangement?','if(d.draft)draft=window.ShalomStudioCodec.decode(anchors,d.draft);const published=d.arrangement?');
   if(!code.includes("receive(window.__shalomStudioInit)")||!code.includes("shalom-studio-draft"))throw Error("Studio bridge changed; update bundle adapter.");
  }
  return '<script>'+code.replace(/<\/script/gi,"<\\/script")+'</script>';
 });
 // Inline scripts now run at the end of the body, after the controls exist.
 const scripts=[...html.matchAll(/<script>[\s\S]*?<\/script>/g)].map(m=>m[0]);
 html=html.replace(/<script>[\s\S]*?<\/script>/g,"").replace("</body>",()=>'<script>window.__shalomStudioInit=__STUDIO_PAYLOAD__;</script>'+scripts.join("")+"</body>");
 return '"use strict";\n// Generated from canonical Studio sources. Run node scripts/build-studio-native.js.\nconst template='+JSON.stringify(html)+';\nmodule.exports=function makeStudioHtml(payload){const json=JSON.stringify(payload).replace(/</g,"\\\\u003c").replace(/\\u2028/g,"\\\\u2028").replace(/\\u2029/g,"\\\\u2029");return template.replace("__STUDIO_PAYLOAD__",()=>json);};\n';
}
if(require.main===module){const result=bundle(read);for(const app of ["mobile","admin-mobile"])fs.writeFileSync(path.join(root,app,"src/studio-bundle.js"),result);}
module.exports={bundle};
