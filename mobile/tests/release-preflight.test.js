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
console.log("SHALOM: identidad, Supabase y permisos Android protegidos.");
