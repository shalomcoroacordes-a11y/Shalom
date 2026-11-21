"use strict";
const {spawnSync}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path");
const dir=__dirname;
let count=0;
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith(".test.js")).sort()){
 const res=spawnSync(process.execPath,[path.join(dir,file)],{stdio:"inherit"});
 if(res.status!==0){console.error("Falló "+file);process.exit(1);}
 count++;
}
if(count<3)throw Error("Faltan pruebas obligatorias");
console.log("SHALOM Admin: "+count+" archivos de pruebas aprobados");
