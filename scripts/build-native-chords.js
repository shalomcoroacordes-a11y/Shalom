"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const source="native-chords.js";
const outputs=["mobile/src/chords.js","admin-mobile/src/chords.js"];
const header="// Generated from native-chords.js. Run node scripts/build-native-chords.js. Do not edit this copy.\n";
function generate(read){
 const web=read("song-chords.js"),begin="// BEGIN CANONICAL CHORD PARSER\n",end="// END CANONICAL CHORD PARSER";
 if(web.split(begin).length!==2||web.split(end).length!==2)throw Error("Canonical chord parser boundaries changed.");
 const parser=web.slice(web.indexOf(begin)+begin.length,web.indexOf(end));
 const adapter='const shared=require("./song-chords.js");',native=read(source);
 if(!parser.startsWith("function createChordParser()")||native.split(adapter).length!==2)throw Error("Canonical chord parser adapter changed.");
 return header+native.replace(adapter,parser+"const shared=createChordParser();");
}
function sync({read,write,check=false}){
 const expected=generate(read);
 for(const name of outputs){
  if(check){if(read(name)!==expected)throw Error(name+" differs from "+source+". Run node scripts/build-native-chords.js.");}
  else write(name,expected);
 }
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&args[0]!=="--check"))throw Error("Usage: node scripts/build-native-chords.js [--check]");
 sync({read:name=>fs.readFileSync(path.join(root,name),"utf8"),write:(name,value)=>fs.writeFileSync(path.join(root,name),value),check:args[0]==="--check"});
 console.log("Native chord engines "+(args[0]==="--check"?"verified":"generated")+".");
}
module.exports={generate,sync};
