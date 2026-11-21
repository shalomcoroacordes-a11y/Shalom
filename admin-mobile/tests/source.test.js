"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const app=fs.readFileSync("App.js","utf8");
const sql=fs.readFileSync("../sql/SHALOM_ADMIN_ROLES_20261121.sql","utf8");
const pkg=JSON.parse(fs.readFileSync("app.json","utf8"));
assert.equal(pkg.expo.android.package,"com.shalomcoroacordes.admin");
assert.notEqual(pkg.expo.android.package,"com.shalomcoroacordes.cancionero");
for(const section of ["Inicio","Cantos","Catálogo","Pendientes","Usuarios"])assert.ok(app.includes(section));
for(const section of ["Capos","Enlaces","Vista previa"])assert.ok(app.includes(section));
assert.match(app,/api\.assignUserRoles/);
assert.match(sql,/admin_has_permission/);
assert.match(sql,/admin_access_blocks/);
assert.match(sql,/admin_redeem_invite/);
assert.match(sql,/admin_publish_song/);
assert.match(sql,/for update/);
assert.doesNotMatch(fs.readFileSync("src/config.js","utf8"),/service_role|sb_secret_/);
console.log("Identidad APK y protección del servidor verificadas.");

assert.match(app,/admin_permission_overrides/);
assert.match(app,/setPermissionOverride/);
assert.match(app,/donation_settings/);

assert.match(app,/featured_song_ids/);
assert.match(app,/requestRecovery/);

assert.match(fs.readFileSync("../sql/SHALOM_ADMIN_DONATIONS_RBAC_20261121.sql","utf8"),/donation_settings\\\./);
