"use strict";
const fs=require("node:fs");
function summarize(report){
 if(!report||!Array.isArray(report.modules)||!report.modules.length||!Array.isArray(report.summary?.violations))throw Error("Invalid or empty dependency graph");
 const rules={};
 for(const v of report.summary.violations){
  const name=v.rule?.name;
  if(!name)throw Error("Dependency violation without rule");
  rules[name]=(rules[name]||0)+1;
 }
 return {modules:report.modules.length,edges:report.modules.reduce((n,m)=>n+(m.dependencies||[]).length,0),violations:report.summary.violations.length,rules};
}
function main(file){
 const result=summarize(JSON.parse(fs.readFileSync(file,"utf8")));
 console.log("Modules in dependency graph: "+result.modules);
 console.log("Dependency edges: "+result.edges);
 console.log("Architecture findings: "+result.violations);
 for(const [rule,count] of Object.entries(result.rules))console.log(rule+": "+count);
}
if(require.main===module)main(process.argv[2]);
module.exports={summarize};
