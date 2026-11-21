// Regression: the original 0.4.11 crashed before rendering because MONO was
// a free variable in app-styles.js, outside App.js's module scope.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../src/app-styles.js"),"utf8");
const app=fs.readFileSync(path.resolve(__dirname,"../App.js"),"utf8");
const fake={exports:{}};
const context={
 module:fake,exports:fake.exports,
 require(name){
  assert.equal(name,"react-native");
  return {StyleSheet:{create:styles=>styles}};
 }
};
// Crucial: no MONO in the context/global scope. The factory must get it
// explicitly, just as separate CommonJS modules do inside Hermes.
vm.runInNewContext(source,context,{filename:"src/app-styles.js"});
const createStyles=fake.exports;
assert.equal(typeof createStyles,"function");
const colors={bg:"#111",panel:"#222",sub:"#333",border:"#444",text:"#fff",
 muted:"#aaa",green:"#0f0",pale:"#dfd",error:"#f44",gold:"#ff0"};
for(const mono of ["monospace","Menlo"]){
 const styles=createStyles(colors,mono);
 assert.ok(Object.keys(styles).length>=100);
 for(const key of ["songScoreText","chordText","lyricText","verse"]){
  assert.equal(styles[key].fontFamily,mono,key+" must get injected mono font");
 }
}
assert.match(app,/const MONO=Platform\.OS/);
assert.match(app,/require\("\.\/src\/app-styles"\)\(C,MONO\)/);
assert.doesNotMatch(source,/module\.exports=function createAppStyles\(C\)\{/);
console.log("SHALOM: cold-start styles create without global MONO; 0.4.11 crash prevented.");
