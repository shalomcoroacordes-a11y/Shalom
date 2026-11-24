"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const h=fs.readFileSync("studio-lab.html","utf8"),j=fs.readFileSync("studio-lab.js","utf8"),c=fs.readFileSync("studio.css","utf8");
for(const id of ["structureSummary","sectionScore","sectionPulses","sectionPlayAll","anchorRail"])assert.ok(h.includes('id="'+id+'"'));
assert.match(j,/lineIndices\[ordinal\+\+\]/);assert.match(j,/span.onclick=\(\)=>chooseAnchor\(i\)/);assert.match(j,/core.groupBounds\(config,g\).start/);assert.match(j,/radio.name="anchorHold"/);assert.match(j,/copyPanel.append\(l,copy\)/);assert.match(c,/#stage1 #anchorRail\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
console.log("Compact sections, selectable chord columns, local chord position and controls verified.");
