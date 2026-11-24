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

assert.match(fs.readFileSync("../sql/SHALOM_ADMIN_DONATIONS_RBAC_20261121.sql","utf8"),/donation_settings/);

assert.match(app,/api\.restoreSong/);
assert.match(fs.readFileSync("../sql/SHALOM_ADMIN_SONG_TRASH_20261121.sql","utf8"),/admin_restore_song/);

const styles=fs.readFileSync("src/styles.js","utf8");
const picker=fs.readFileSync("src/components/Picker.js","utf8");
const lyrics=fs.readFileSync("src/components/LyricsEditor.js","utf8");
assert.match(app,/useSafeAreaInsets/,"Utilizar insets del sistema Android");
assert.match(app,/S\.navShell/,"La barra inferior debe fluir fuera del scroll");
assert.match(app,/paddingBottom:Math\.max\(insets\.bottom/);
assert.doesNotMatch(styles,/position:"absolute",bottom:7/,"Prohibido solapar barra nativa");
assert.match(styles,/minHeight:53/,"Objetivos táctiles grandes");
assert.match(app,/categoryChoices/);
assert.match(picker,/filterChoices/);
assert.match(picker,/selectedNames/);
assert.match(lyrics,/presentationStyle:"fullScreen"/);
assert.match(lyrics,/Math\.max\(360/);
assert.match(lyrics,/fontFamily:"monospace"/);
assert.equal(pkg.expo.android.edgeToEdgeEnabled,false);
assert.ok(Number.isInteger(pkg.expo.android.versionCode)&&pkg.expo.android.versionCode>=7,"La versión oficial de Admin debe superar la anterior (5)");
assert.equal(pkg.expo.version,JSON.parse(fs.readFileSync("package.json","utf8")).version,"Versiones de Expo y npm coherentes");
console.log("Navegación segura, selectores y editor amplio comprobados.");
