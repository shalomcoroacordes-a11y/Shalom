const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const R=require("../home-recommendation-core.js");
const core=fs.readFileSync("home-recommendation-core.js","utf8");
const browser={};vm.runInNewContext(core,browser);
assert.equal(typeof browser.ShalomHomeRecommendations.sectionFor,"function");
const cases=[[undefined,"general"],[null,"general"],["","general"],["Católico","catolico"],["CATÓLICA","catolico"],["catolicos","catolico"],["Cristiana","cristiano"],["CRISTIANO","cristiano"],["Mixto","mixto"],["General","general"],["Otro","general"],["católico cristiano","catolico"],["cristiano mixto","cristiano"],[42,"general"]];
for(const [value,expected] of cases){
 assert.equal(R.contentType(value),expected);
 assert.equal(browser.ShalomHomeRecommendations.contentType(value),expected);
 for(const section_type of ["catolico","cristiano","otro",undefined]){
  const result=expected==="catolico"||expected==="cristiano"?expected:section_type==="cristiano"?"cristiano":"catolico";
  for(const target_type of ["song","category"]){
   assert.equal(R.sectionFor({section_type,target_type},{song_type:value}),result);
   assert.equal(browser.ShalomHomeRecommendations.sectionFor({section_type,target_type},{song_type:value}),result);
  }
 }
}
assert.equal(R.sectionFor({section_type:"cristiano"},null),"cristiano");
for(const [page,owner] of [["index.html","home.js"],["admin.html","admin-home-section.js"]]){
 const html=fs.readFileSync(page,"utf8"),src=fs.readFileSync(owner,"utf8");
 const i=html.indexOf('src="home-recommendation-core.js?v=1"');
 assert.ok(i>=0&&i<html.indexOf('src="'+owner));
 assert.equal((html.match(/src="home-recommendation-core\.js/g)||[]).length,1);
 assert.match(src,/window\.ShalomHomeRecommendations/);
 assert.doesNotMatch(src,/type\.includes\("catolic"\)|(?:const|function) sectionFor\s*[=(]/);
}
console.log("Shared home rules: 14 classification cases, 112 placement cases per runtime, missing content and script order verified.");
