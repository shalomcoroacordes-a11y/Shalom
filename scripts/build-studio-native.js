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
   code=code.replace('const published=d.arrangement?','if(d.draft)draft=decodeConfig(d.draft);const published=d.arrangement?');
   if(!code.includes("receive(window.__shalomStudioInit)")||!code.includes("shalom-studio-draft"))throw Error("Studio bridge changed; update bundle adapter.");
  }
  return '<script>'+code.replace(/<\/script/gi,"<\\/script")+'</script>';
 });
 // Inline scripts now run at the end of the body, after the controls exist.
 const scripts=[...html.matchAll(/<script>[\s\S]*?<\/script>/g)].map(m=>m[0]);
 html=html.replace(/<script>[\s\S]*?<\/script>/g,"").replace("</body>",()=>'<script>window.__shalomStudioInit=__STUDIO_PAYLOAD__;</script>'+scripts.join("")+"</body>");
 return '"use strict";\n// Generated from canonical Studio sources. Run node scripts/build-studio-native.js.\nconst template='+JSON.stringify(html)+';\nmodule.exports=function makeStudioHtml(payload){const json=JSON.stringify(payload).replace(/</g,"\\\\u003c").replace(/\\u2028/g,"\\\\u2028").replace(/\\u2029/g,"\\\\u2029");return template.replace("__STUDIO_PAYLOAD__",()=>json);};\n';
}
function screen(read,admin=false){
 const source=read("studio-native-screen.js");
 const trailer="module.exports=createStudioScreen;\n";
 if(!source.endsWith(trailer))throw Error("Studio screen factory export changed.");
 const options=admin?', "✓ Acompañamiento guardado y publicado."':"";
 return "// Generated from studio-native-screen.js. Run node scripts/build-studio-native.js.\n"+source.slice(0,-trailer.length)+'module.exports=createStudioScreen(require("./studio-bundle")'+options+');\n';
}
function outputs(read){
 const html=bundle(read);
 return {
  "mobile/src/studio-bundle.js":html,
  "admin-mobile/src/studio-bundle.js":html,
  "mobile/src/studio-collections.js":read("studio-collections.js"),
  "mobile/src/studio-core.js":read("studio-core.js"),
  "mobile/src/studio-codec.js":read("studio-codec.js"),
  "mobile/src/studio-reader-cues.js":read("studio-reader-cues.js"),
  "mobile/src/studio-screen.js":screen(read),
  "admin-mobile/src/studio-screen.js":screen(read,true)
 };
}
function sync({read,write,check=false}){
 for(const [name,value] of Object.entries(outputs(read))){
  if(check){if(read(name)!==value)throw Error(name+" differs from canonical Studio sources. Run node scripts/build-studio-native.js.");}
  else write(name,value);
 }
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&args[0]!=="--check"))throw Error("Usage: node scripts/build-studio-native.js [--check]");
 sync({read,write:(name,value)=>fs.writeFileSync(path.join(root,name),value),check:args[0]==="--check"});
 console.log("Native Studio sources "+(args[0]==="--check"?"verified":"generated")+".");
}
module.exports={bundle,screen,outputs,sync};
