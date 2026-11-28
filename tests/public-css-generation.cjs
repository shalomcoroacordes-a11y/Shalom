"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process");
const {bundles,generate,sync}=require("../scripts/build-public-css-bundles.cjs");
const read=name=>fs.readFileSync(name,"utf8");
sync({read,check:true});
const names=Object.keys(bundles);
assert.equal(names.length,6);
assert.deepEqual(names.slice().sort(),execFileSync("git",["ls-files"],{encoding:"utf8"}).split("\n").filter(name=>/^[^/]+-bundle\.css$/.test(name)).sort());
const written=new Map();
sync({read,write:(name,content)=>written.set(name,content),check:false});
for(const name of names){
 assert.equal(written.get(name),read(name),name);
 assert.throws(()=>sync({read:p=>p===name?read(p)+"\n/* accidental edit */":read(p)}),/differs from canonical CSS/);
}
const changed=name=>name==="public-cards.css"?read(name)+"\n/* canonical change */":read(name);
for(const name of names)assert.equal(generate(name,changed)!==generate(name,read),bundles[name].includes("public-cards.css"));
assert.throws(()=>generate("unknown.css",read),/Unknown public CSS bundle/);
console.log("Public CSS: six exact bundles, complete inventory, drift rejection and shared-source regeneration verified.");

const cueChange=name=>name==="song-reader-cues.css"?read(name)+"\n/* cue style update */":read(name);
for(const name of names)assert.equal(generate(name,cueChange)!==generate(name,read),["song-reader-bundle.css","collection-reader-bundle.css"].includes(name));
