const assert=require("node:assert/strict");
const {createWriter,createPersonalEditController}=require("../src/personal-edit-controller");
const {STORE_KEY,emptyStore,newCollection}=require("../src/personal-collections");
const {PROFILE_KEY,defaults}=require("../src/profile-core");
const {FAVORITES_KEY}=require("../src/favorites");
async function test(){
 const ref={current:"original"},views=[],errors=[],writes=[],outcomes=[];
 const writer=createWriter({ref,apply:value=>views.push(value),key:"test",write:async(key,payload)=>{writes.push(JSON.parse(payload));if(outcomes.shift()===false)throw Error("disk full")},onError:error=>errors.push(error.message)});
 outcomes.push(false,false);writer.save("first");writer.save("second");await writer.settled();
 assert.deepEqual(writes,["first","second"]);assert.equal(ref.current,"original");assert.deepEqual(views,["first","second","original"]);assert.equal(errors.length,2);
 outcomes.push(true,false);writer.save("confirmed");writer.save("failed");await writer.settled();assert.equal(ref.current,"confirmed");
 ref.current="restored";outcomes.push(false);writer.save("bad");await writer.settled();assert.equal(ref.current,"restored");
 const personalRef={current:emptyStore()},profileRef={current:defaults()},likedRef={current:[]};
 const notices=[],stored=new Map(),alerts=[];
 const edits=createPersonalEditController({personalRef,profileRef,likedRef,setPersonal(){},setProfile(){},setLikedIds(){},async write(key,payload){stored.set(key,JSON.parse(payload))},notice:(message,undo)=>notices.push({message,undo}),clearNotice(){},alert:(...args)=>alerts.push(args)});
 edits.savePersonal({version:1,collections:[newCollection("Misa")]});edits.saveProfile({...defaults(),name:"  Coro  "});edits.toggleLike("s1");
 await edits.waitForWrites();assert.equal(stored.get(STORE_KEY).collections.length,1);assert.equal(stored.get(PROFILE_KEY).name,"Coro");assert.deepEqual(stored.get(FAVORITES_KEY),["s1"]);
 const stale=notices.at(-1).undo;edits.toggleLike("s2");stale();await edits.waitForWrites();assert.deepEqual(stored.get(FAVORITES_KEY),["s1","s2"]);
 notices.at(-1).undo();await edits.waitForWrites();assert.deepEqual(stored.get(FAVORITES_KEY),["s1"]);
 assert.equal(alerts.length,0);
 console.log("Personal edits: consecutive failures restore last confirmed data; independent queues, stale undo and current undo verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
