"use strict";
// Compare groups of duplicate blocks, not line positions (which shift during refactors).
const fs=require("node:fs");
const path=require("node:path");
function relativeName(name,root){
 if(typeof name!=="string"||!name)throw Error("Invalid duplicate file name");
 const relative=path.isAbsolute(name)?path.relative(root,name):path.normalize(name);
 if(relative===".."||relative.startsWith(".."+path.sep)||path.isAbsolute(relative))throw Error("Report path is outside its source tree: "+name);
 return relative.split(path.sep).join("/");
}
function summarize(report,root){
 if(!report||!Array.isArray(report.duplicates))throw Error("Missing JSCPD duplicates array");
 const groups=new Map();
 for(const entry of report.duplicates){
  const names=[relativeName(entry.firstFile?.name,root),relativeName(entry.secondFile?.name,root)].sort();
  const key=JSON.stringify(names);
  const old=groups.get(key)||{files:names,blocks:0,lines:0};
  if(!Number.isFinite(entry.lines)||entry.lines<0)throw Error("Invalid duplicate line count");
  old.blocks++;old.lines+=entry.lines;
  groups.set(key,old);
 }
 return groups;
}
function compare(base,head,baseRoot,headRoot){
 const before=summarize(base,baseRoot),after=summarize(head,headRoot);
 const growth=[];
 for(const [key,current] of after){
  const previous=before.get(key)||{blocks:0,lines:0};
  if(current.blocks>previous.blocks||current.lines>previous.lines)growth.push({...current,previousBlocks:previous.blocks,previousLines:previous.lines});
 }
 growth.sort((a,b)=>(b.lines-b.previousLines)-(a.lines-a.previousLines)||a.files.join("/").localeCompare(b.files.join("/")));
 return {baseBlocks:base.duplicates.length,headBlocks:head.duplicates.length,growth};
}
function main(args){
 if(args.length!==4)throw Error("Usage: compare_duplication_reports.cjs BASE_JSON HEAD_JSON BASE_ROOT HEAD_ROOT");
 const [baseFile,headFile,baseRoot,headRoot]=args;
 const result=compare(JSON.parse(fs.readFileSync(baseFile,"utf8")),JSON.parse(fs.readFileSync(headFile,"utf8")),baseRoot,headRoot);
 console.log("JSCPD duplicate blocks: "+result.baseBlocks+" -> "+result.headBlocks);
 console.log("File pairs with increased blocks or matched lines: "+result.growth.length);
 for(const row of result.growth.slice(0,25)){
  console.log(row.files.join(" <-> ")+": "+row.previousBlocks+" -> "+row.blocks+" blocks; "+row.previousLines+" -> "+row.lines+" matched lines");
 }
 if(result.growth.length>25)console.log("Additional pairs are listed in comparison.json.");
 fs.writeFileSync(path.join(path.dirname(headFile),"comparison.json"),JSON.stringify(result,null,2)+"\n");
 // Advisory until the baseline is reviewed: legitimate shared implementations may duplicate.
 if(result.growth.length)console.log("Review growth before merge; never delete duplicates automatically.");
}
if(require.main===module)main(process.argv.slice(2));
module.exports={relativeName,summarize,compare};
