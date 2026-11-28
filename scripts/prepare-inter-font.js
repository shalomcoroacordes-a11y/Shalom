"use strict";
// Materializa una versión fija de Inter para desarrollo y empaquetado offline.
// No usa CDN durante la lectura ni modifica el binario de la fuente.
const fs=require("node:fs/promises"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const revision="e3a3d4c57d5ecc01453a575621882a384c1995a3";
const assets=[
 {source:"docs/font-files/InterVariable.woff2",target:"assets/fonts/InterVariable.woff2",sha:"5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212",size:352240},
 {source:"LICENSE.txt",target:"assets/fonts/Inter-OFL.txt",sha:"9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea",size:4380}
];
function verify(bytes,asset){
 const hash=crypto.createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 if(bytes.length!==asset.size||hash!==asset.sha)throw Error("Inter integrity mismatch: "+asset.source);
}
async function prepare(check=false){
 for(const asset of assets){
  const target=path.join(root,asset.target);
  let bytes;
  try{bytes=await fs.readFile(target);}catch(error){if(error.code!=="ENOENT")throw error;}
  if(bytes){verify(bytes,asset);continue;}
  if(check)throw Error("Missing local Inter asset: "+asset.target);
  const response=await fetch("https://raw.githubusercontent.com/rsms/inter/"+revision+"/"+asset.source,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error("Inter download failed: "+response.status);
  bytes=Buffer.from(await response.arrayBuffer());verify(bytes,asset);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,bytes,{flag:"wx"});
 }
 console.log("Inter assets verified ("+revision+").");
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&args[0]!=="--check")){console.error("Usage: node scripts/prepare-inter-font.js [--check]");process.exitCode=1;}
 else prepare(args[0]==="--check").catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={verify,assets,revision,prepare};
