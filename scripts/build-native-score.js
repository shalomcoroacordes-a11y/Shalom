"use strict";
// Generates one pinned local asset module for each app; no network in app or build.
const fs=require("node:fs/promises"),path=require("node:path");
const {prepare,assets,verify}=require("./prepare-inter-font");
const root=path.resolve(__dirname,"..");
async function run(){
 await prepare(true);
 const font=await fs.readFile(path.join(root,assets[0].target));verify(font,assets[0]);
 const read=name=>fs.readFile(path.join(root,name),"utf8");
 const [css,layout,reader,license]=await Promise.all([read("score-reader.css"),read("score-layout.js"),read("score-reader.js"),read(assets[1].target)]);
 const bundle="// Generated from canonical Inter reader assets. Do not edit.\nmodule.exports="+JSON.stringify({font:font.toString("base64"),css,layout,reader,license})+";\n";
 for(const dir of ["mobile","admin-mobile"])await fs.writeFile(path.join(root,dir,"src","score-reader-assets.js"),bundle);
 console.log("Verified and generated local Inter reader assets.");
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
