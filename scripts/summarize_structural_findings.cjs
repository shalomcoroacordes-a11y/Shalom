"use strict";
const fs=require("node:fs");
function summarize(matches){
 if(!Array.isArray(matches))throw Error("Invalid ast-grep report");
 const groups=new Map();
 for(const m of matches){
  if(!m.ruleId||!m.file||!m.range?.start)throw Error("Invalid structural finding");
  const key=JSON.stringify([m.ruleId,m.file]);
  const group=groups.get(key)||{rule:m.ruleId,file:m.file,count:0,lines:[]};
  group.count++;group.lines.push(m.range.start.line+1);groups.set(key,group);
 }
 return {findings:matches.length,groups:[...groups.values()].sort((a,b)=>b.count-a.count||a.file.localeCompare(b.file))};
}
function main(file){
 const report=summarize(JSON.parse(fs.readFileSync(file,"utf8")));
 console.log("Structural findings for review: "+report.findings);
 for(const g of report.groups)console.log(g.rule+" | "+g.file+" | lines "+g.lines.join(", "));
}
if(require.main===module)main(process.argv[2]);
module.exports={summarize};
