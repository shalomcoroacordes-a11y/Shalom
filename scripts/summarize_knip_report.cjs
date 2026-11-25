"use strict";
const fs=require("node:fs");
function summarize(report){
 if(!report||!Array.isArray(report.files)||!Array.isArray(report.issues))throw Error("Invalid Knip report; inspect analyzer output");
 const counts={files:report.files.length,dependencies:0,unlisted:0,unresolved:0};
 for(const issue of report.issues){
  for(const key of ["dependencies","unlisted","unresolved"]){
   if(issue[key]!==undefined&&!Array.isArray(issue[key]))throw Error("Invalid Knip issue: "+key);
   counts[key]+=(issue[key]||[]).length;
  }
 }
 return counts;
}
function main(file){
 const report=JSON.parse(fs.readFileSync(file,"utf8"));
 const counts=summarize(report);
 console.log("Knip candidates (review only):");
 for(const [key,count] of Object.entries(counts))console.log(key+": "+count);
 console.log("Native/plugin dependencies, dynamic paths and test references need manual verification before removal.");
}
if(require.main===module)main(process.argv[2]);
module.exports={summarize};
