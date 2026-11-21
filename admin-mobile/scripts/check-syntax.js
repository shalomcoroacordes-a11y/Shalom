"use strict";
const fs=require("node:fs"),path=require("node:path"),{spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const list=[path.join(root,"App.js")];
for(const folder of ["src","scripts","tests"]){
 for(const file of fs.readdirSync(path.join(root,folder)))if(file.endsWith(".js"))list.push(path.join(root,folder,file));
}
for(const file of list){
 const check=spawnSync(process.execPath,["--check",file],{stdio:"inherit"});
 if(check.status!==0)process.exit(1);
}
console.log("SHALOM Admin: sintaxis verificada en "+list.length+" archivos");
