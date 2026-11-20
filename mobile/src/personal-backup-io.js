// Respaldo en archivo local: el usuario elige dónde compartirlo. Sin Supabase ni subida automática.
const {File,Directory,Paths}=require("expo-file-system");
const Sharing=require("expo-sharing");
const DocumentPicker=require("expo-document-picker");
const {referencedImages,buildBackup,readBackup,remapPhotos,MAX_JSON_BYTES}=require("./personal-backup-core");
const COVER_DIR="shalom-personal-covers";
function privateCover(name){return new File(Paths.document,COVER_DIR,name);}
async function exportPersonalBackup(source){
 const names=referencedImages(source.profile,source.personal);
 const images=[];
 for(const name of names){
  const file=privateCover(name);
  if(!file.exists)throw new Error("No se encontró la fotografía "+name+". Reemplaza la portada o recupérala antes de respaldar.");
  if(!file.size||file.size>3*1024*1024)throw new Error("La portada "+name+" es demasiado grande o está vacía.");
  images.push({name,base64:await file.base64()});
 }
 const contents=buildBackup(source,images);
 const verified=readBackup(contents);
 if(verified.images.length!==images.length)throw new Error("No se pudo verificar el respaldo.");
 const filename="SHALOM-respaldo-"+new Date().toISOString().slice(0,10)+".shalom.json";
 const file=new File(Paths.cache,filename);
 file.create({overwrite:true});
 await file.write(contents);
 if(!file.exists||file.size<100)throw new Error("No se pudo generar el archivo de respaldo.");
 // El límite al importar mide bytes UTF-8; el del JSON en memoria mide caracteres.
 // Verificar el tamaño real impide exportar archivos que luego SHALOM rechazaría.
 if(file.size>MAX_JSON_BYTES){file.delete();throw new Error("El respaldo supera 64 MB. Reduce algunas portadas para continuar.");}
 if(!await Sharing.isAvailableAsync())throw new Error("Este teléfono no tiene un método para compartir archivos.");
 await Sharing.shareAsync(file.uri,{mimeType:"application/json",dialogTitle:"Guardar o compartir respaldo SHALOM"});
 return {filename,summary:{images:images.length}};
}
async function pickPersonalBackup(){
 const selection=await DocumentPicker.getDocumentAsync({type:"*/*",copyToCacheDirectory:true,multiple:false});
 if(selection.canceled||!selection.assets?.length)return null;
 const asset=selection.assets[0];
 if(typeof asset.size==="number"&&asset.size>MAX_JSON_BYTES)
  throw new Error("Este respaldo excede el límite permitido de 64 MB.");
 if(!asset.uri)throw new Error("No se pudo abrir el archivo seleccionado.");
 const file=new File(asset.uri);
 if(!file.exists)throw new Error("No se pudo leer el archivo desde tu dispositivo.");
 if(file.size>MAX_JSON_BYTES)throw new Error("Este respaldo es demasiado grande.");
 return readBackup(await file.text());
}
function safeRestoreName(){
 return "cover-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,11)+".jpg";
}
async function stageRestoredPhotos(parsed){
 const folder=new Directory(Paths.document,COVER_DIR);
 folder.create({idempotent:true,intermediates:true});
 const mapping=Object.create(null),created=[];
 const cleanup=()=>{
  for(const name of created){
   try{const file=privateCover(name);if(file.exists)file.delete();}catch(_){}
  }
 };
 try{
  for(const image of parsed.images){
   let filename=safeRestoreName(),attempts=0;
   while(privateCover(filename).exists&&attempts++<6)filename=safeRestoreName();
   if(privateCover(filename).exists)throw new Error("No se pudo asignar un nombre seguro a la fotografía.");
   const dest=privateCover(filename);
   dest.create();
   created.push(filename);
   await dest.write(image.base64,{encoding:"base64"});
   if(!dest.exists||dest.size<=0||dest.size>3*1024*1024)
    throw new Error("No se pudo restaurar una fotografía.");
   // Leer nuevamente asegura que no se dejó un archivo truncado.
   if(await dest.base64()!==image.base64)throw new Error("Una fotografía no se copió correctamente.");
   mapping[image.name]=filename;
  }
  return {data:remapPhotos(parsed,mapping),cleanup};
 }catch(e){cleanup();throw e;}
}
module.exports={exportPersonalBackup,pickPersonalBackup,stageRestoredPhotos};
