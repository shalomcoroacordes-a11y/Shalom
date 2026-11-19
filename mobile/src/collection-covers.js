// Portadas: solo almacenamiento privado del dispositivo. Nada se sube a Supabase.
const {File,Directory,Paths}=require("expo-file-system");
const ImagePicker=require("expo-image-picker");
const {ImageManipulator,SaveFormat}=require("expo-image-manipulator");
const {COVER_FILE}=require("./personal-collections");
const DIR="shalom-personal-covers";
function destination(name){
 if(typeof name!=="string"||!COVER_FILE.test(name))return null;
 return new File(Paths.document,DIR,name);
}
function photoUri(name){
 try{
  const file=destination(name);
  return file&&file.exists?file.uri:null;
 }catch(_){return null;}
}
async function chooseCover(options={}){
 const aspect=Array.isArray(options.aspect)&&options.aspect.length===2?options.aspect:[4,3];
 const width=Number(options.width)>0?Math.min(1600,Math.round(options.width)):960;
 const selection=await ImagePicker.launchImageLibraryAsync({
  mediaTypes:["images"],allowsEditing:true,aspect,quality:.9,
  allowsMultipleSelection:false
 });
 if(selection.canceled||!selection.assets?.length)return null;
 const asset=selection.assets[0];
 if(!asset.uri)throw new Error("No se pudo leer la fotografía seleccionada.");
 // Miniatura JPEG de 960 px: no conservamos EXIF ni el original pesado.
 const ctx=ImageManipulator.manipulate(asset.uri);
 ctx.resize({width});
 const image=await ctx.renderAsync();
 const saved=await image.saveAsync({format:SaveFormat.JPEG,compress:.78});
 const folder=new Directory(Paths.document,DIR);
 folder.create({idempotent:true,intermediates:true});
 const filename="cover-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)+".jpg";
 const target=destination(filename);
 if(!target)throw new Error("Ruta de portada no válida.");
 await new File(saved.uri).copy(target);
 if(!target.exists)throw new Error("No se pudo conservar la imagen en el teléfono.");
 return filename;
}
function removeCover(filename){
 try{
  const file=destination(filename);
  if(file?.exists)file.delete();
 }catch(_){}
}
module.exports={photoUri,chooseCover,removeCover};
