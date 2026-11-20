const assert=require("node:assert/strict");
const fs=require("node:fs");
const app=fs.readFileSync("mobile/App.js","utf8");
const styles=fs.readFileSync("mobile/src/app-styles.js","utf8");
assert.match(app,/useSafeAreaInsets/,"Safe-area context must be used");
assert.match(app,/function AppScreen\(\)/,"App screen is nested inside SafeAreaProvider");
assert.match(app,/function App\(\)\{return h\(SafeAreaProvider,null,h\(AppScreen\)\);\}/);
assert.match(app,/const topInset=Platform\.OS==="android"\?Math\.max\(insets\.top\|\|0,StatusBar\.currentHeight\|\|0\)/,
 "Android reserves at least the system status-bar height");
assert.match(app,/paddingTop:immersiveActive\?0:topInset/);
assert.match(app,/edges:\["bottom","left","right"\]/,"Do not apply the top inset twice");
assert.match(app,/function AppSectionHeader\(/);
assert.match(app,/function AppDetailHeader\(/);
assert.match(app,/section:"Configuración",onBack:/);
assert.match(app,/detail&&!isReader\?h\(AppDetailHeader/,"Single-song and multi-song readers share their own header");
assert.match(app,/onSettings:\(\)=>setSettingsOpen\(true\)/);
assert.match(app,/source:HOME_IMAGES\.logo,resizeMode:"contain",style:S\.sectionHeaderLogo/);
assert.match(styles,/sectionHeaderIdentity:\{flex:1,minWidth:0/);
assert.ok(!app.includes('label(settingsOpen?"Cerrar":"⚙ Ajustes"'),"Old overlapping generic header was removed");
assert.ok(!app.includes('label(network.online?(network.wifi?"Wi-Fi":"Online"):"Offline"'),"No free-floating network label above content");
for(const label of ['← Volver a artistas','← Volver a álbumes','← Volver a repertorios','← Volver a Popurrís']){
 assert.ok(!app.includes(label),"Duplicate in-content back control removed: "+label);
}
assert.match(app,/if\(settingsOpen\)\{setSettingsOpen\(false\);return true;\}/);
assert.match(app,/if\(detail\)\{/,"Back must handle nested song details");
assert.match(app,/setDetail\(detailHistoryRef\.current\.pop\(\)\|\|null\);return true/,"Back returns to previous detail");
assert.match(app,/if\(nestedBackRef\.current\?\.\(\)\)return true/,"Back respects nested collection and profile screens");
console.log("SHALOM Android safe-area, consistent headers and detail navigation verified.");
