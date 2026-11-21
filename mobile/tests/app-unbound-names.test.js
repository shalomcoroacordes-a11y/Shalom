// Prevent Hermes render-time crashes caused by unbound lexical variables.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const parser=require("@babel/parser");
const traverse=require("@babel/traverse").default;
const globals=new Set([
 "require","module","exports","console","process","global","globalThis",
 "__DEV__","fetch","setTimeout","clearTimeout","setInterval","clearInterval",
 "Date","Math","JSON","Number","String","Boolean","Object","Array","Set","Map",
 "WeakMap","WeakSet","Promise","Error","TypeError","ReferenceError","RangeError",
 "SyntaxError","RegExp","Symbol","BigInt","Infinity","NaN","undefined",
 "isFinite","isNaN","parseInt","parseFloat","encodeURI","encodeURIComponent",
 "decodeURI","decodeURIComponent","URL","URLSearchParams",
 "AbortController","Uint8Array","ArrayBuffer","Blob","File","FormData","Intl",
 "queueMicrotask","atob","btoa"
]);
function unknownIdentifiers(source){
 const ast=parser.parse(source,{sourceType:"unambiguous",errorRecovery:false});
 const problems=[];
 traverse(ast,{ReferencedIdentifier(p){
  const name=p.node.name;
  if(!p.scope.hasBinding(name) && !globals.has(name))
   problems.push(name+"@"+p.node.loc.start.line);
 }});
 return problems;
}
const home=fs.readFileSync("App.js","utf8");
assert.match(home,/function renderHome\(\)\{\s*const term=normalize\(homeSearch\.trim\(\)\)/);
const broken=home.replace("const term=normalize(homeSearch.trim());\n  const found=homeMatches;","const found=homeMatches;");
assert.ok(unknownIdentifiers(broken).some(x=>x.startsWith("term@")),
 "Scope checker must catch the real missing Home variable");
for(const file of ["App.js","src/app-styles.js","src/app-components.js"]){
 const missing=unknownIdentifiers(fs.readFileSync(file,"utf8"));
 assert.deepEqual(missing,[],"Unbound JS variables in "+file+": "+missing.join(", "));
}
console.log("SHALOM: App/Home/styles/components have no undeclared lexical references.");
