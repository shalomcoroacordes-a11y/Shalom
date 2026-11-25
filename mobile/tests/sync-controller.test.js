const assert=require("node:assert/strict");
const {createSyncController,AUTO_INTERVAL_MS}=require("../src/sync-controller");
async function test(){
 let time=Date.parse("2026-11-25T12:00:00Z"),state={online:true,wifi:false},calls=[],fail=false,hold=false,release,copy=null;
 const controller=createSyncController({clock:()=>time,networkState:async()=>state,async syncAll(options){calls.push(["sync",options.manual,options.wifiOnly]);if(hold)await new Promise(resolve=>{release=resolve});if(fail)throw Error("network error");options.onProgress({index:1,total:1,table:"songs"});return {skipped:false}},async getCatalog(){return{syncedAt:new Date(time).toISOString(),data:{songs:[{id:"s"}]}}},async writePreference(...args){calls.push(["pref",...args])},setNetwork(){},setWifiOnly(){},setBusy:value=>calls.push(["busy",value]),setError:value=>calls.push(["error",value]),setProgress:value=>calls.push(["progress",value]),setCopy:value=>{copy=value},alert:(...args)=>calls.push(["alert",...args])});
 const count=()=>calls.filter(x=>x[0]==="sync").length;
 await controller.tryAuto();await controller.manualSync();assert.equal(count(),0,"Do not sync before preferences load");
 controller.initialize({syncedAt:null},true);
 await controller.tryAuto();assert.equal(count(),0,"Wi-Fi only blocks mobile data");
 await controller.manualSync();const prompt=calls.at(-1);assert.equal(prompt[0],"alert");assert.equal(prompt[1],"No se detecta Wi-Fi");
 await prompt[3][1].onPress();assert.equal(count(),1);assert.equal(copy.data.songs[0].id,"s");
 state={online:true,wifi:true};await controller.tryAuto();assert.equal(count(),1,"Do not refresh recently saved catalog");
 time+=AUTO_INTERVAL_MS+1;fail=true;await controller.tryAuto();assert.equal(count(),2);assert.ok(copy);
 time+=AUTO_INTERVAL_MS;await controller.tryAuto();assert.equal(count(),2,"Backoff survives reconnection");
 time+=AUTO_INTERVAL_MS+1;fail=false;hold=true;
 const pending=controller.tryAuto();await new Promise(resolve=>setImmediate(resolve));
 await controller.tryAuto();await controller.sync(true);assert.equal(count(),3);release();await pending;hold=false;
 await controller.changeWifi(false);assert.deepEqual(calls.at(-1),["pref","wifi_only","false"]);
 time+=AUTO_INTERVAL_MS+1;state={online:true,wifi:false};await controller.tryAuto();assert.equal(count(),4);
 state={online:false,wifi:false};await controller.manualSync();assert.equal(calls.at(-1)[1],"Sin internet");
 console.log("Sync controller: startup gate, Wi-Fi, manual override, backoff, single-flight and recovery verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
