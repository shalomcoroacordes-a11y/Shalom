const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {checkReleaseConfig,PACKAGE,PROJECT}=require("../scripts/release-preflight");
const app=JSON.parse(fs.readFileSync(path.join(__dirname,"../app.json"),"utf8"));
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,"../package.json"),"utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(checkReleaseConfig(app,pkg,()=>true),[]);
assert.equal(PACKAGE,"com.shalomcoroacordes.cancionero");
assert.equal(PROJECT,"ehpvsasyzlrlypjjpzuk");
function invalid(change){
 const next=clone(app);change(next);
 return checkReleaseConfig(next,pkg,()=>true).join(", ");
}
assert.match(invalid(x=>x.expo.android.package="com.no.shalom"),/Android/);
assert.match(invalid(x=>x.expo.ios.bundleIdentifier="com.otra"),/iOS/);
assert.match(invalid(x=>x.expo.extra.source="otra-base"),/Supabase/);
assert.match(invalid(x=>x.expo.android.versionCode=0),/versionCode/);
assert.match(invalid(x=>x.expo.scheme="otro"),/Deep link/);
assert.match(invalid(x=>x.expo.version="9.0.0"),/Versiones/);
assert.match(invalid(x=>x.expo.plugins=[]),/Permisos/);
assert.match(checkReleaseConfig(app,pkg,()=>false).join(", "),/icono/);
assert.deepEqual(checkReleaseConfig(app,pkg,()=>true,{publishRelease:true}),[]);
const oldConfig=clone(app);oldConfig.expo.version="0.4.20";oldConfig.expo.android.versionCode=43;
const blocked=checkReleaseConfig(oldConfig,{...pkg,version:"0.4.20"},()=>true,{publishRelease:true}).join(", ");
assert.match(blocked,/aumentar la versión/);
assert.match(blocked,/versionCode/);
const validNext=clone(app);
validNext.expo.version="0.4.21";
validNext.expo.android.versionCode=44;
assert.deepEqual(checkReleaseConfig(validNext,{...pkg,version:"0.4.21"},()=>true,{publishRelease:true}),[]);
const badCode=clone(validNext);
badCode.expo.android.versionCode=43;
assert.match(checkReleaseConfig(badCode,{...pkg,version:"0.4.21"},()=>true,{publishRelease:true}).join(", "),/versionCode/);

console.log("SHALOM: identidad, Supabase y permisos Android protegidos.");
