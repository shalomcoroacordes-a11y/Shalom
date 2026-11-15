const assert=require("node:assert/strict");
const {sendRequest,TYPES}=require("../src/requests");
async function run(){
 let called=null;
 global.fetch=async(url,opts)=>{called={url,opts};return {ok:true,status:201};};
 await sendRequest({kind:"lyrics",song:{id:"uuid-1",title:"Canto de prueba"},
 details:"Corregir segunda estrofa"});
 assert.equal(JSON.parse(called.opts.body).message_type,TYPES.lyrics);
 assert.equal(JSON.parse(called.opts.body).song_title,"Canto de prueba");
 assert.match(JSON.parse(called.opts.body).details,/uuid-1/);
 assert.equal(called.opts.headers.Prefer,"return=minimal");
 assert.match(called.url,/contact_messages/);
 await assert.rejects(sendRequest({kind:"chords",title:"Canto",details:"x"}),/al menos tres/);
 await assert.rejects(sendRequest({kind:"song",title:"Nuevo",details:"Favor",reference:"javascript:bad"}),/https/);
 console.log("SHALOM Android: formularios de corrección y solicitud verificados.");
}
run().catch(err=>{console.error(err);process.exit(1)});