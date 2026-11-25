"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {summarize}=require("../scripts/summarize_knip_report.cjs");
for(const app of ["mobile","admin-mobile"]){
 const root=path.join(__dirname,"..",app),config=JSON.parse(fs.readFileSync(path.join(root,"knip.json"),"utf8")),pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
 assert.ok(pkg.dependencies.expo);
 for(const entry of ["App.js","scripts/**/*.js","tests/**/*.js"])assert.ok(config.entry.includes(entry));
 assert.ok(config.project.includes("src/**/*.js"));
 assert.ok(fs.existsSync(path.join(root,"App.js")));
 assert.ok(!config.ignoreDependencies,"Do not suppress dependency findings before reviewing them");
}
assert.deepEqual(summarize({files:["src/old.js"],issues:[{file:"package.json",dependencies:[{name:"unused"}]},{file:"src/a.js",unlisted:[{name:"external"}],unresolved:[{name:"./missing"}]}]}),{files:1,dependencies:1,unlisted:1,unresolved:1});
assert.deepEqual(summarize({files:[],issues:[]}),{files:0,dependencies:0,unlisted:0,unresolved:0});
assert.throws(()=>summarize({}),/Invalid Knip/);
console.log("Native Knip scope and report contract verified.");
