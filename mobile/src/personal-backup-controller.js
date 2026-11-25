// Local personal backup orchestration, independent of React and Android views.
const {STORE_KEY}=require("./personal-collections");
const {PROFILE_KEY}=require("./profile-core");
const {FAVORITES_KEY}=require("./favorites");
function metadataFor(data){
 return {
  [STORE_KEY]:JSON.stringify(data.personal),
  [PROFILE_KEY]:JSON.stringify(data.profile),
  [FAVORITES_KEY]:JSON.stringify(data.likedIds),
  last_read:data.lastRead?JSON.stringify(data.lastRead):""
 };
}
function createPersonalBackupController({waitForWrites,readCurrent,exportFile,stagePhotos,commitMetadata,applyRestored}){
 let active=false;
 async function run(work){
  if(active)throw Error("Ya hay una operación de respaldo en curso.");
  active=true;
  try{await waitForWrites();return await work();}
  finally{active=false;}
 }
 function exportBackup(){return run(()=>exportFile(readCurrent()));}
 function restoreBackup(parsed){
  return run(async()=>{
   const staged=await stagePhotos(parsed);
   const next=staged.data;
   try{
    await commitMetadata(metadataFor(next));
   }catch(err){
    // An I/O verification error may leave valid references on one backend.
    // Keep staged photos instead of deleting possibly referenced files.
    throw new Error("No se pudo confirmar la restauración. Conserva tu respaldo y vuelve a intentarlo: "+err.message);
   }
   applyRestored(next);
  });
 }
 return Object.freeze({exportBackup,restoreBackup});
}
module.exports={metadataFor,createPersonalBackupController};
