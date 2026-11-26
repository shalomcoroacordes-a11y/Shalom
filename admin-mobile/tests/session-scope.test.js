"use strict";
const assert=require("node:assert/strict");
const {createSessionScope}=require("../src/session-scope");
async function test(){
 const scope=createSessionScope(),a=scope.begin("a"),seen=[];
 let resolve;
 const deferred=new Promise(r=>{resolve=r;});
 const load=async(token,owner)=>{const rows=await deferred;if(scope.matches(token,owner))seen.push(rows);};
 const pending=load(a,"a");
 assert.equal(scope.matches(a,"a"),true);assert.equal(scope.matches(a,"b"),false);
 const signedOut=scope.begin(null);assert.equal(scope.matches(a,"a"),false);assert.equal(scope.matches(signedOut,null),false);
 const b=scope.begin("b");assert.equal(scope.matches(b,"b"),true);
 resolve("private rows from a");await pending;assert.deepEqual(seen,[]);
 const same=scope.begin("b");assert.equal(scope.matches(b,"b"),false);assert.equal(scope.matches(same,"b"),true);
 await load(same,"b");assert.equal(seen.length,1);
 console.log("Session scope: late response after logout, different account and same-account relogin rejected.");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
