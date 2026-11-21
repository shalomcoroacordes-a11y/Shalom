// Regression: Android Hermes can have a URL class that throws on new URL(...).
// Requiring file-storage must never depend on that browser API at app startup.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../src/file-storage.js"),"utf8");
const metadata=require("../src/config");
const artifacts=new Map();
class MockFile{
 constructor(document,name){this.name=name;}
 get exists(){return artifacts.has(this.name);}
 create(){artifacts.set(this.name,"");}
 async write(value){artifacts.set(this.name,String(value));}
 async text(){return artifacts.get(this.name);}
 delete(){artifacts.delete(this.name);}
}
const moduleForTest={exports:{}};
const sandbox={
 module:moduleForTest,exports:moduleForTest.exports,
 URL:class ReactNativeURL{
  constructor(){throw Error("Hermes URL constructor is not fully implemented");}
 },
 require(name){
  if(name==="expo-file-system")return {File:MockFile,Paths:{document:"private"}};
  if(name==="./config")return metadata;
  throw Error("Unexpected import: "+name);
 },
 Date,Math,JSON,String,Number,Set,Object,Array
};
assert.doesNotThrow(()=>vm.runInNewContext(source,sandbox,{filename:"src/file-storage.js"}));
const service=moduleForTest.exports;
assert.equal(typeof service.readSnapshot,"function");
const empty=Object.fromEntries(metadata.TABLES.map(table=>[table,[]]));
(async()=>{
 const before=await service.readSnapshot();
 assert.equal(before.syncedAt,null);
 assert.equal(artifacts.size,0,"Startup must not overwrite users' existing files");
 const sync=await service.saveSnapshot(empty);
 assert.ok(Number.isFinite(Date.parse(sync)));
 const current=await service.readSnapshot();
 assert.equal(current.syncedAt,sync);
 const data=Object.fromEntries(metadata.TABLES.map(table=>[table,[]]));
 data.songs=[{id:"song-1"}];
 await service.saveSnapshot(data,sync);
 assert.equal((await service.readSnapshot()).data.songs[0].id,"song-1");
 console.log("SHALOM: Hermes startup works without browser URL; saved copies remain readable.");
})().catch(error=>{console.error(error);process.exitCode=1;});
