// Un solo punto de entrada para todas las pruebas Android: cada archivo corre
// en un proceso aislado, como antes en GitHub Actions.
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const TESTS=path.join(ROOT,"tests");

function listTests(dir=TESTS){
 return fs.readdirSync(dir,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith(".test.js"))
  .map(entry=>entry.name).sort();
}

function main(){
 const files=listTests();
 if(!files.length){
  console.error("SHALOM: no hay pruebas Android. Verifica la carpeta mobile/tests.");
  process.exitCode=1;return;
 }
 const failures=[];
 for(const [index,file] of files.entries()){
  process.stdout.write("\nSHALOM: prueba "+(index+1)+"/"+files.length+" · "+file+"\n");
  const result=spawnSync(process.execPath,[path.join(TESTS,file)],
   {cwd:ROOT,stdio:"inherit"});
  if(result.error||result.status!==0){
   failures.push(file);
   if(result.error)console.error(result.error);
  }
 }
 if(failures.length){
  console.error("\nSHALOM: fallaron "+failures.length+" de "+files.length+
   " pruebas: "+failures.join(", "));
  process.exitCode=1;
 }else console.log("\nSHALOM: "+files.length+" pruebas Android aprobadas.");
}
if(require.main===module)main();
module.exports=Object.freeze({listTests});
