const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("mobile/src/sync.js","utf8");
function load(fetchImpl,timer){
 const module={exports:{}};
 const sandbox={module,exports:module.exports,fetch:fetchImpl,AbortController,setTimeout:timer||setTimeout,clearTimeout:()=>{},require(name){
  if(name==="@react-native-community/netinfo")return {default:{fetch:async()=>({isConnected:true,isInternetReachable:true,type:"wifi"})}};
  if(name==="./config")return {SUPABASE_URL:"https://example.test",PUBLISHABLE_KEY:"public",TABLES:["songs"]};
  if(name==="./database")return {commitCatalog:async data=>{assert.equal(data.songs.length,1);return "saved"}};
  throw Error(name);
 }};
 vm.runInNewContext(source,sandbox,{filename:"mobile/src/sync.js"});
 return module.exports;
}
(async()=>{
 let calls=0;
 const good=load(async(url,options)=>{calls++;assert.ok(options.signal);return {ok:true,json:async()=>[{id:"one"}]}});
 const result=await good.syncAll();
 assert.equal(result.totalSongs,1);assert.equal(calls,1);
 const bad=load(async(url,options)=>new Promise((resolve,reject)=>{
  options.signal.addEventListener("abort",()=>reject(Object.assign(new Error("aborted"),{name:"AbortError"})),{once:true});
 }),fn=>{fn();return 1});
 await assert.rejects(bad.syncAll(),/tardó demasiado/);
 console.log("Android sync: success and timed-out fetch covered.");
})().catch(e=>{console.error(e);process.exitCode=1});
