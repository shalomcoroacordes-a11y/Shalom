const assert=require("node:assert/strict");
const {songPermalink,createSongReaderActions}=require("../src/song-reader-actions");
const {buildPrintableSong,readerShiftForPrint}=require("../src/song-print");
async function run(){
 const song={id:"s/1",title:"Gloria",tone:"G",lyrics:"G\nTexto",capo_position:2,capo_key:"F",_links:[{url:"https://youtu.be/example"}]};
 const core=require("../src/studio-core"),codec=require("../src/studio-codec"),{parseSong}=require("../src/chords");
 const anchors=core.anchorsFromRows(parseSong(song.lyrics));
 song._studio=codec.encode(anchors,core.setCues(core.draft(anchors),[{index:0,ticks:0,action:"start",audience:"choir",text:"Entra todo el coro"}]));
 const events=[];
 const services={
  Share:{share:async payload=>events.push(["share",payload])},
  Print:{printAsync:async payload=>events.push(["print",payload])},
  Alert:{alert:(...args)=>events.push(["alert",...args])},
  openWeb:url=>events.push(["web",url]),
  manualSync:async()=>events.push(["sync"]),
  copy:{syncedAt:"2026-01-01"},model:{songs:[song]},network:{online:true},transpose:2,capo:"main"
 };
 const actions=createSongReaderActions(services);
 const url="https://shalomcoroacordes-a11y.github.io/Shalom/cancion.html?id=s%2F1";
 assert.equal(songPermalink(song),url);
 await actions.shareSong(song);
 assert.deepEqual(events.pop(),["share",{title:"Gloria",message:"Gloria — SHALOM\n"+url}]);
 await actions.printSong(song);
 assert.deepEqual(events.pop(),["print",{html:buildPrintableSong(song,readerShiftForPrint(song,2,"main"))}]);
 await createSongReaderActions({...services,showReaderCues:false}).printSong(song);
 const without=events.pop();assert.equal(without[0],"print");assert.doesNotMatch(without[1].html,/Entra todo el coro/);
 await actions.printSong(song);assert.match(events.pop()[1].html,/Entra todo el coro/);
 await actions.checkSongOffline(song);
 assert.deepEqual(events.pop(),["alert","Disponible sin conexión","Este canto ya está guardado en la biblioteca de SHALOM. Puedes abrirlo sin internet."]);
 await createSongReaderActions({...services,copy:null}).checkSongOffline(song);
 assert.deepEqual(events.pop(),["sync"]);
 await createSongReaderActions({...services,model:{songs:[]}}).checkSongOffline(song);
 assert.deepEqual(events.pop(),["sync"]);
 actions.openSongVideo(song);
 assert.deepEqual(events.pop(),["web","https://youtu.be/example"]);
 actions.openSongVideo({...song,_links:[{url:"javascript:alert(1)"}]});
 assert.deepEqual(events.pop(),["alert","Sin video registrado","Este canto todavía no tiene un enlace de YouTube."]);
 createSongReaderActions({...services,network:{online:false}}).openSongVideo(song);
 assert.deepEqual(events.pop(),["alert","Requiere internet","Conéctate para abrir el video."]);
 const failing=createSongReaderActions({...services,Share:{share:async()=>{throw Error("fallo compartir")}},Print:{printAsync:async()=>{throw Error("fallo impresión")}}});
 await failing.shareSong(song);
 assert.deepEqual(events.pop(),["alert","No se pudo compartir","fallo compartir"]);
 await failing.printSong(song);
 assert.deepEqual(events.pop(),["alert","No se pudo abrir la impresión","fallo impresión"]);
 assert.equal(events.length,0);
 console.log("SHALOM: reader actions and native error handling verified.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
