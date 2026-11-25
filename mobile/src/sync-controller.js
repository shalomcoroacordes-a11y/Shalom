// Offline synchronization policy, independent of React and native listeners.
const AUTO_INTERVAL_MS=20*60*1000;
function createSyncController({syncAll,getCatalog,networkState,writePreference,setNetwork,setWifiOnly,setBusy,setError,setProgress,setCopy,alert,clock=Date.now}){
 let ready=false,inFlight=false,checking=false,wifiOnly=true,lastSync=null;
 const retry={lastAttempt:0,failures:0};
 const offline=()=>({online:false,wifi:false});
 function initialize(snapshot,preference){
  lastSync=snapshot.syncedAt;wifiOnly=preference;ready=true;
 }
 async function updateNetwork(){
  const state=await networkState().catch(offline);
  setNetwork(state);return state;
 }
 async function sync(manual=false){
  if(!ready||inFlight)return;
  if(!manual)retry.lastAttempt=clock();
  inFlight=true;setBusy(true);setError("");setProgress("Comprobando conexión…");
  try{
   const result=await syncAll({wifiOnly,manual,onProgress:p=>setProgress("Descargando "+p.index+"/"+p.total+" · "+p.table.replace(/_/g," "))});
   if(result.skipped){setProgress(result.reason);return}
   const saved=await getCatalog();
   lastSync=saved.syncedAt;retry.failures=0;setCopy(saved);
   setProgress(saved.data.songs.length+" cantos y sus carpetas guardados en el teléfono.");
  }catch(error){
   if(!manual)retry.failures=Math.min(retry.failures+1,5);
   setError(error.message||"No se pudo descargar el cancionero.");
   setProgress("Si había una copia anterior, se conserva.");
  }finally{inFlight=false;setBusy(false)}
 }
 function canAuto(){
  if(!ready||inFlight)return false;
  if(retry.failures&&clock()-retry.lastAttempt<AUTO_INTERVAL_MS*Math.pow(2,retry.failures))return false;
  return !(lastSync&&clock()-Date.parse(lastSync)<AUTO_INTERVAL_MS);
 }
 async function tryAuto(){
  if(checking||!canAuto())return;
  checking=true;
  try{
   const n=await networkState().catch(offline);
   if(canAuto()&&n.online&&(!wifiOnly||n.wifi))await sync(false);
  }finally{checking=false}
 }
 async function manualSync(){
  if(!ready||inFlight)return;
  const n=await updateNetwork();
  if(!n.online)return alert("Sin internet","Puedes seguir leyendo los cantos que ya descargaste.");
  if(wifiOnly&&!n.wifi)return alert("No se detecta Wi-Fi","¿Deseas actualizar utilizando esta conexión?",[
   {text:"Cancelar",style:"cancel"},{text:"Descargar",onPress:()=>sync(true)}]);
  await sync(true);
 }
 async function changeWifi(enabled){
  wifiOnly=enabled;setWifiOnly(enabled);
  try{await writePreference("wifi_only",enabled?"true":"false")}
  catch(e){setError("No fue posible guardar la preferencia: "+e.message)}
 }
 return Object.freeze({initialize,updateNetwork,sync,tryAuto,manualSync,changeWifi});
}
module.exports={createSyncController,AUTO_INTERVAL_MS};
