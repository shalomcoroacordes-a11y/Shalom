"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const dir=process.argv[2];
if(!dir)throw Error("Usage: node scripts/verify-native-lock.cjs <app directory>");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const manifest=read("package.json"),lock=read("package-lock.json"),root=lock.packages?.[""];
assert.equal(lock.lockfileVersion,3,"Expected npm lockfile v3");
assert.ok(root,"Missing root package");
for(const key of ["name","version"]){
 assert.equal(lock[key],manifest[key]);
 assert.equal(root[key],manifest[key]);
}
for(const key of ["dependencies","devDependencies","optionalDependencies","peerDependencies"]){
 assert.deepEqual(root[key]||{},manifest[key]||{},"Manifest/lock mismatch: "+key);
}
const entries=Object.entries(lock.packages).filter(([key])=>key!=="");
assert.ok(entries.length>0,"Empty dependency tree");
for(const [name,entry] of entries){
 assert.ok(entry.version&&!entry.link,"Unexpected dependency link: "+name);
 // Bundled npm packages may inherit integrity from the parent archive.
 if(entry.inBundle)continue;
 assert.equal(typeof entry.resolved,"string","Missing source: "+name);
 const url=new URL(entry.resolved);
 assert.ok(url.protocol==="https:"&&url.hostname==="registry.npmjs.org"&&!url.username&&!url.password,"Unexpected package source: "+name);
 assert.match(entry.integrity||"",/^sha(?:512|384|256|1)-[A-Za-z0-9+/=]+(?:\s|$)/,"Missing package integrity: "+name);
}
console.log("Verified "+entries.length+" locked dependencies for "+manifest.name);
