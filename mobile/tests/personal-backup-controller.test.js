const assert=require("node:assert/strict");
const {createPersonalBackupController,metadataFor}=require("../src/personal-backup-controller");
const {STORE_KEY}=require("../src/personal-collections");
const {PROFILE_KEY}=require("../src/profile-core");
const {FAVORITES_KEY}=require("../src/favorites");
const sample={personal:{version:1,collections:[]},profile:{name:"Perfil"},likedIds:["s"],lastRead:{type:"song",id:"s"}};
async function test(){
 const calls=[];let mode="ok",applied=null,current=sample,release;
 const controller=createPersonalBackupController({
  async waitForWrites(){calls.push("wait");if(mode==="wait-error")throw Error("pending write");if(mode==="hold")await new Promise(resolve=>{release=resolve})},
  readCurrent(){calls.push("read");return current},
  async exportFile(data){calls.push("export");return data},
  async stagePhotos(data){calls.push("stage");if(mode==="stage-error")throw Error("invalid photo");return{data,cleanup(){calls.push("cleanup")}}},
  async commitMetadata(data){calls.push("commit");assert.deepEqual(data,metadataFor(sample));if(mode==="commit-error")throw Error("disk full")},
  applyRestored(data){calls.push("apply");applied=data}
 });
 assert.deepEqual(metadataFor(sample),{[STORE_KEY]:JSON.stringify(sample.personal),[PROFILE_KEY]:JSON.stringify(sample.profile),[FAVORITES_KEY]:'["s"]',last_read:'{"type":"song","id":"s"}'});
 assert.equal(metadataFor({...sample,lastRead:null}).last_read,"");
 await controller.restoreBackup(sample);assert.deepEqual(calls,["wait","stage","commit","apply"]);assert.equal(applied,sample);
 for(const [failure,expected,pattern] of [["wait-error",["wait"],/pending write/],["stage-error",["wait","stage"],/invalid photo/],["commit-error",["wait","stage","commit"],/No se pudo confirmar/]]){
  mode=failure;calls.length=0;applied=null;await assert.rejects(controller.restoreBackup(sample),pattern);assert.deepEqual(calls,expected);assert.equal(applied,null);
 }
 mode="hold";calls.length=0;const task=controller.exportBackup();await assert.rejects(controller.restoreBackup(sample),/en curso/);current={...sample,likedIds:["new"]};release();assert.equal(await task,current);assert.deepEqual(calls,["wait","read","export"]);
 mode="ok";await controller.restoreBackup(sample);
 console.log("Personal backup: write ordering, batch commit, failure preservation, single-flight and latest export verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
