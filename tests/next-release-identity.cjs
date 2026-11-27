"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
for(const [dir,version,code,base,baseCode,wf,pkg] of [["mobile","0.4.27",50,"0.4.26",49,"android-upgrade-rehearsal.yml","com.shalomcoroacordes.cancionero"],["admin-mobile","0.1.8",9,"0.1.7",8,"admin-upgrade-rehearsal.yml","com.shalomcoroacordes.admin"]]){
 const read=n=>JSON.parse(fs.readFileSync(dir+"/"+n,"utf8"));const app=read("app.json").expo,manifest=read("package.json"),lock=read("package-lock.json");
 assert.equal(app.version,version);assert.equal(app.android.versionCode,code);assert.equal(app.android.package,pkg);assert.equal(manifest.version,version);assert.equal(lock.version,version);assert.equal(lock.packages[""].version,version);
 const w=fs.readFileSync(".github/workflows/"+wf,"utf8");assert.ok(w.includes('BASELINE_VERSION: "'+base+'"'));assert.ok(w.includes('BASELINE_CODE: "'+baseCode+'"'));assert.ok(w.includes('CANDIDATE_CODE: "'+code+'"'));assert.ok(w.includes("contents: read"));assert.doesNotMatch(w,/gh release create|contents: write/);
}
const v=fs.readFileSync("mobile/scripts/verify-upgrade-candidate.sh","utf8"),e=fs.readFileSync("mobile/scripts/verify-upgrade-on-emulator.sh","utf8");assert.ok(v.includes("NEW_CODE <= OLD_CODE"));assert.ok(v.includes('"$OLD_SHA" != "$NEW_SHA"'));assert.ok(e.includes('adb install -r "$NEW"'));assert.ok(e.includes('test "$old_uid" = "$new_uid"'));assert.doesNotMatch(e,/adb uninstall|pm clear/);
for(const name of ["verify-upgrade-candidate.sh","verify-upgrade-on-emulator.sh"]){assert.ok(fs.readFileSync("admin-mobile/scripts/"+name,"utf8").includes("../../mobile/scripts/"+name+'" admin'));}
console.log("Release versions, locks, package identity and shared read-only upgrade checks verified.");
