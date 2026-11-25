"use strict";
const assert=require("node:assert/strict");
const {summarize}=require("../scripts/summarize_dependency_graph.cjs");
const cfg=require("../.dependency-cruiser.cjs");
assert.deepEqual(cfg.forbidden.map(r=>r.name),["no-local-cycles","public-app-does-not-import-admin","admin-app-does-not-import-public","production-does-not-import-tests"]);
assert.ok(cfg.forbidden.every(r=>r.severity==="warn"));
assert.deepEqual(summarize({modules:[{source:"a.js",dependencies:[{resolved:"b.js"}]},{source:"b.js",dependencies:[]}],summary:{violations:[{rule:{name:"no-local-cycles"}}]}}),{modules:2,edges:1,violations:1,rules:{"no-local-cycles":1}});
assert.throws(()=>summarize({modules:[],summary:{violations:[]}}),/Invalid/);
console.log("Dependency graph report and architecture rules verified.");
