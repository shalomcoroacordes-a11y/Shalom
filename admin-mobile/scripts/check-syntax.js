"use strict";
const fs=require("node:fs"),path=require("node:path"),{spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
function walk(folder){
 return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const target=path.join(folder,entry.name);
  return entry.isDirectory()?walk(target):target.endsWith(".js")?[target]:[];
 });
}
const list=[path.join(root,"App.js"),...walk(path.join(root,"src")),...walk(path.join(root,"scripts")),...walk(path.join(root,"tests"))];
for(const file of list){
 const check=spawnSync(process.execPath,["--check",file],{stdio:"inherit"});
 if(check.status!==0)process.exit(1);
}
console.log("SHALOM Admin: sintaxis verificada en "+list.length+" archivos");
