"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const core=require("../studio-core.js"),{parseSong}=require("../native-chords.js");
const rows=parseSong("[Verso]\nC G\nLetra\n[Coro]\nAm F\nOtra letra"),anchors=core.anchorsFromRows(rows),groups=core.groupAnchors(anchors,rows);
const baseline=core.draft(anchors,"4/4",80);
const isolated=core.isolateSections(baseline,groups);
const sectionTempo=core.setSection(isolated,groups[1].indices[0],{bpm:120});
function previous(config){
 const t=core.compile(anchors,config),sec=Math.round(core.clockRange(t,0,config.endStep??config.totalSteps).duration);
 return [["Velocidad",(config.sections||[]).length?"Por sección":config.bpm+" BPM"],["Compás",config.meter],["Acordes",anchors.length],["Secciones",groups.length],["Duración",Math.floor(sec/60)+" min "+sec%60+" s"],["Patrones",config.patterns.length+(config.sections||[]).reduce((n,p)=>n+(p.patterns?.length||0),0)]];
}
for(const cfg of [baseline,isolated,sectionTempo,core.draft(anchors,"6/8",60)]){
 const before=JSON.stringify(cfg);
 assert.deepEqual(core.reviewSummary(anchors,cfg,groups),previous(cfg));
 assert.equal(JSON.stringify(cfg),before);
}
assert.deepEqual(core.reviewSummary(anchors,baseline,groups).slice(0,4),[["Velocidad","80 BPM"],["Compás","4/4"],["Acordes",4],["Secciones",2]]);
assert.equal(core.reviewSummary(anchors,sectionTempo,groups)[0][1],"Por sección");
const lab=fs.readFileSync("studio-lab.js","utf8"),html=fs.readFileSync("studio-lab.html","utf8"),sw=fs.readFileSync("offline-sw.js","utf8");
assert.match(lab,/const summary=core\.reviewSummary\(anchors,config,groups\)/);
for(const match of html.matchAll(/<script defer src="([^"]+)"/g))assert.ok(sw.includes('"./'+match[1]+'"'),"Offline missing "+match[1]);
assert.match(sw,/shalom-offline-shell-v35-action-colors/);
console.log("Studio review: exact summary, section tempos, compound meter, unchanged config and all offline dependencies.");
