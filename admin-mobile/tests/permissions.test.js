"use strict";
const assert=require("node:assert/strict");
const {ALL,effective,canPublish,canEdit}=require("../src/permissions");
assert.ok(ALL.includes("songs.publish"));
assert.ok(ALL.includes("roles.delete"));
const roles={authorized:true,owner:false,permissions:["songs.view","songs.edit","repertoires.publish"]};
assert.equal(canEdit(roles,"songs"),true);
assert.equal(canPublish(roles,"songs"),false);
assert.equal(canPublish(roles,"repertoires"),true);
assert.equal(effective({...roles,blocked:true},"songs.edit"),false);
assert.equal(canPublish({owner:true,blocked:false},"songs"),true);
assert.equal(canPublish(null,"songs"),false);
console.log("Roles múltiples y bloqueo predominante verificados.");

assert.ok(ALL.includes("donation_settings.publish"));
assert.equal(canPublish({authorized:true,owner:false,permissions:["site_content.publish"]},"donation_settings"),false);
