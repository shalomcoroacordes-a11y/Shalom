"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process");
const old="admin-access-"+"guard.js",self="tests/obsolete-admin-guard.cjs";
assert.equal(fs.existsSync(old),false,"Retired guard must not return");
for(const name of execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0")){
 if(!name||name===self||! /\.(?:html|js|cjs|mjs|json|ya?ml|py|css)$/.test(name)||!fs.existsSync(name))continue;
 assert.ok(!fs.readFileSync(name,"utf8").includes(old),"Obsolete guard referenced in "+name);
}
const html=fs.readFileSync("admin.html","utf8"),auth=fs.readFileSync("admin-auth-controller.js","utf8"),admin=fs.readFileSync("admin-pro.js","utf8");
assert.match(html,/src="admin-auth-controller\.js\?v=\d+"/);
assert.match(html,/src="admin-pro\.js\?v=\d+"/);
assert.match(auth,/db\.rpc\("jhd_is_admin"\)/);
assert.match(admin,/AdminPro\.rpc\("jhd_is_admin"\)/);
assert.match(auth,/if\(!authorized\)/);
console.log("Obsolete guard retired; active authorization controllers remain connected.");
