"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../.github/workflows",name),"utf8");
const gate="github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.publish_official == true";
const publicRelease=read("android-apk.yml"),admin=read("admin-apk.yml");
for(const source of [publicRelease,admin]){
 assert.match(source,/workflow_dispatch:\s*\n\s*inputs:\s*\n\s*publish_official:/);
 assert.match(source,/type: boolean\s*\n\s*required: true\s*\n\s*default: false/);
 assert.ok(source.includes("if: "+gate));
 assert.ok(source.includes("gh release create"));
 assert.ok(!source.includes("github.event_name == 'push'"));
}
assert.ok(!/^  push:/m.test(publicRelease));
assert.ok(publicRelease.includes("  build-apk:\n    if: "+gate+"\n    permissions:\n      contents: write"));
assert.ok(admin.includes("  publish-official:\n    if: "+gate+"\n    needs: [test, apk, smoke]"));
assert.ok(admin.includes("if: env.OFFICIAL_RELEASE != 'true'"));
assert.equal(admin.split('if [ "$OFFICIAL_RELEASE" = true ]; then').length,3);
assert.ok(admin.includes("OFFICIAL_RELEASE: ${{ "+gate+" }}"));
assert.ok(admin.includes("com.shalomcoroacordes.admin.preview"));
for(const name of ["android-preview.yml","android-upgrade-rehearsal.yml","admin-upgrade-rehearsal.yml"]){
 const source=read(name);assert.ok(!source.includes("gh release create"));assert.ok(!source.includes("contents: write"));
}
// Every active release creator must belong to the explicitly gated workflows.
const workflows=path.join(__dirname,"../.github/workflows");
for(const name of fs.readdirSync(workflows).filter(n=>/\.ya?ml$/.test(n))){
 const source=read(name);
 if(/\bgh\s+release\s+(create|upload|edit|delete)\b|\bsoftprops\/action-gh-release@|\bactions\/create-release@|\bncipollo\/release-action@/.test(source)){
  assert.ok(["android-apk.yml","admin-apk.yml"].includes(name),"Unexpected release writer: "+name);
 }
}
for(const name of ["publish-android-apk.yml","publish-shalom-v2.yml","publish-shalom-icon.yml"])assert.ok(!fs.existsSync(path.join(workflows,name)),"Retired workflow must not return: "+name);
console.log("Android release authorization contracts: manual main confirmation, preview isolation, no automatic release.");
