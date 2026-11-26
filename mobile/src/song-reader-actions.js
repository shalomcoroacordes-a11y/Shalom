// Reader action orchestration: UI supplies native services and the current reader snapshot.
const {safeWebUrl}=require("./catalog");
const {buildPrintableSong,readerShiftForPrint}=require("./song-print");
function songPermalink(song){
  return "https://shalomcoroacordes-a11y.github.io/Shalom/cancion.html?id="+encodeURIComponent(String(song.id));
 }
function createSongReaderActions({Share,Print,Alert,openWeb,manualSync,copy,model,network,transpose,capo,showReaderCues=true}){
 async function shareSong(song){
  try{
   await Share.share({title:song.title||"Canto de SHALOM",
    message:(song.title||"Canto")+" — SHALOM\n"+songPermalink(song)});
  }catch(e){Alert.alert("No se pudo compartir",e?.message||"Inténtalo nuevamente.")}
 }
 async function printSong(song){
  try{
   await Print.printAsync({html:buildPrintableSong(song,readerShiftForPrint(song,transpose,capo),showReaderCues)});
  }catch(e){
   Alert.alert("No se pudo abrir la impresión",e?.message||"Revisa el servicio de impresión del teléfono.");
  }
 }
 async function checkSongOffline(song){
  if(copy?.syncedAt&&model.songs.some(s=>String(s.id)===String(song.id))){
   return Alert.alert("Disponible sin conexión",
    "Este canto ya está guardado en la biblioteca de SHALOM. Puedes abrirlo sin internet.");
  }
  return manualSync();
 }
 function openSongVideo(song){
  const videos=[...(song._links||[]).map(link=>link.url),song.tutorial_guitar,song.tutorial_piano]
   .map(safeWebUrl).filter(Boolean);
  const found=videos.find(link=>/youtube\.com|youtu\.be/i.test(link));
  if(!found)return Alert.alert("Sin video registrado","Este canto todavía no tiene un enlace de YouTube.");
  if(!network.online)return Alert.alert("Requiere internet","Conéctate para abrir el video.");
  openWeb(found);
 }

 return {shareSong,printSong,checkSongOffline,openSongVideo};
}
module.exports={songPermalink,createSongReaderActions};
