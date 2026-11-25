"use strict";
const assert=require("node:assert/strict");
const {summarize}=require("../scripts/summarize_structural_findings.cjs");
const finding=(ruleId,file,line)=>({ruleId,file,range:{start:{line,column:0}}});
assert.deepEqual(summarize([]),{findings:0,groups:[]});
assert.deepEqual(summarize([finding("review-runtime-style","home.js",2),finding("review-runtime-style","home.js",6)]),{findings:2,groups:[{rule:"review-runtime-style",file:"home.js",count:2,lines:[3,7]}]});
assert.throws(()=>summarize({}),/Invalid/);
assert.throws(()=>summarize([{}]),/Invalid/);
console.log("Structural finding report verified.");
