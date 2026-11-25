"use strict";
const fs=require("node:fs"),path=require("node:path");
function summarize(results,root){
 if(!Array.isArray(results)||!results.length)throw Error("Empty or invalid ESLint report");
 const counts=new Map();let warnings=0,errors=0;
 for(const file of results){
  const name=path.relative(root,file.filePath).split(path.sep).join("/");
  if(name.startsWith("../")||name===".."||!Array.isArray(file.messages))throw Error("Invalid lint report file");
  for(const m of file.messages){
   if(m.severity===2)errors++;else if(m.severity===1)warnings++;else continue;
   const rule=m.ruleId||"parser";
   const key=JSON.stringify([name,rule,m.severity]);
   const item=counts.get(key)||{file:name,rule,severity:m.severity,count:0};
   item.count++;counts.set(key,item);
  }
 }
 return {files:results.length,warnings,errors,counts};
}
function compare(base,head,baseRoot,headRoot){
 const before=summarize(base,baseRoot),after=summarize(head,headRoot),growth=[];
 for(const [key,item] of after.counts){
  const previous=before.counts.get(key)?.count||0;
  if(item.count>previous)growth.push({...item,previous,added:item.count-previous});
 }
 growth.sort((a,b)=>b.severity-a.severity||b.added-a.added||a.file.localeCompare(b.file)||a.rule.localeCompare(b.rule));
 const totals=({files,warnings,errors})=>({files,warnings,errors});
 return {base:totals(before),head:totals(after),growth};
}
function main(args){
 if(args.length!==4)throw Error("Usage: compare_lint_reports.cjs BASE_JSON HEAD_JSON BASE_ROOT HEAD_ROOT");
 const [base,head,baseRoot,headRoot]=args;
 const result=compare(JSON.parse(fs.readFileSync(base,"utf8")),JSON.parse(fs.readFileSync(head,"utf8")),baseRoot,headRoot);
 console.log("ESLint files: "+result.base.files+" -> "+result.head.files);
 console.log("ESLint warnings: "+result.base.warnings+" -> "+result.head.warnings);
 console.log("ESLint errors: "+result.base.errors+" -> "+result.head.errors);
 console.log("File/rule groups with new findings: "+result.growth.length);
 for(const row of result.growth.slice(0,30))console.log(row.file+" / "+row.rule+": "+row.previous+" -> "+row.count);
 fs.writeFileSync(path.join(path.dirname(head),"comparison.json"),JSON.stringify(result,null,2)+"\n");
}
if(require.main===module)main(process.argv.slice(2));
module.exports={summarize,compare};
