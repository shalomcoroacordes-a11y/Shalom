// Comprobación sin red: identidad de SHALOM y continuidad Android antes de compilar.
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const PROJECT="ehpvsasyzlrlypjjpzuk";
const PACKAGE="com.shalomcoroacordes.cancionero";
function checkReleaseConfig(config,pkg,exists=()=>true){
 const app=config?.expo||{};
 const android=app.android||{};
 const errors=[];
 const version=String(app.version||"");
 if(!/^\d+\.\d+\.\d+$/.test(version))errors.push("Versión de Expo inválida");
 if(pkg?.version!==version)errors.push("Versiones app.json y package.json diferentes");
 if(android.package!==PACKAGE)errors.push("Identificador Android distinto al de SHALOM");
 if(app.ios?.bundleIdentifier!==PACKAGE)errors.push("Identificador iOS distinto al esperado");
 if(app.extra?.source!==PROJECT)errors.push("Fuente Supabase distinta al proyecto SHALOM");
 if(app.scheme!=="shalom")errors.push("Deep link de SHALOM cambiado");
 if(!Number.isInteger(android.versionCode)||android.versionCode<1)
  errors.push("android.versionCode debe ser un entero positivo");
 if(!exists(app.icon||""))errors.push("Falta el icono SHALOM");
 if(!exists(android.adaptiveIcon?.foregroundImage||""))
  errors.push("Falta el icono adaptable con la paloma original");
 if(!Array.isArray(app.plugins)||!app.plugins.some(p=>Array.isArray(p)
  &&p[0]==="expo-image-picker"&&p[1]?.cameraPermission===false
  &&p[1]?.microphonePermission===false))
  errors.push("Permisos de cámara o micrófono distintos a la versión verificada");
 return errors;
}
function main(){
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,"app.json"),"utf8"));
 const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,"package.json"),"utf8"));
 const errors=checkReleaseConfig(config,pkg,relative=>{
  if(!relative||relative.includes("..")||path.isAbsolute(relative))return false;
  return fs.existsSync(path.join(ROOT,relative));
 });
 if(errors.length){for(const e of errors)console.error("SHALOM: "+e);process.exitCode=1;}
 else console.log("SHALOM: versión "+pkg.version+", paquete, base de datos, paloma y permisos verificados.");
}
if(require.main===module)main();
module.exports=Object.freeze({checkReleaseConfig,PROJECT,PACKAGE});
