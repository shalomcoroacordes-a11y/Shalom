// Revisa sintaxis de TODOS los modulos, scripts y tests Android sin lista manual.
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");

function walkJavaScript(dir){
 if(!fs.existsSync(dir))throw new Error("Falta una carpeta del proyecto: "+dir);
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const current=path.join(dir,entry.name);
  if(entry.isDirectory())return walkJavaScript(current);
  return entry.isFile()&&entry.name.endsWith(".js")?[current]:[];
 });
}
function sources(){
 const files=[path.join(ROOT,"App.js")];
 for(const dir of ["src","scripts","tests"])
  files.push(...walkJavaScript(path.join(ROOT,dir)));
 return files.sort();
}
function main(){
 const files=sources();
 const failures=[];
 for(const file of files){
  const result=spawnSync(process.execPath,["--check",file],
   {cwd:ROOT,stdio:"inherit"});
  if(result.error||result.status!==0){
   failures.push(path.relative(ROOT,file));
   if(result.error)console.error(result.error);
  }
 }
 if(failures.length){
  console.error("SHALOM: error de sintaxis en "+failures.join(", "));
  process.exitCode=1;
 }else console.log("SHALOM: sintaxis correcta de "+files.length+" archivos Android.");
}
if(require.main===module)main();
module.exports=Object.freeze({walkJavaScript,sources});
