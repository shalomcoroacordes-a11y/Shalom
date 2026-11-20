const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=path=>fs.readFileSync(path,"utf8");
const exists=path=>fs.existsSync(path);

// Las páginas declaran su navegación directamente, sin mezclar código de interfaz
// con el cliente Supabase ni cargar parches en orden aleatorio.
const pages=fs.readdirSync(".").filter(x=>x.endsWith(".html")&&x!=="admin.html"&&x!=="offline.html");
assert.equal(pages.length,13,"Declarar cada entrada pública en el contrato");
for(const page of pages){
 const html=read(page);
 assert.equal((html.match(/src="site-shell\.js\?v=1"/g)||[]).length,1,page+" cargas de shell");
 assert.ok(html.includes("Supabase.js"),page+" sigue usando cliente Supabase");
 assert.doesNotMatch(html,/src="site-public-nav\.js/,page+" no duplica navegación");
}
const db=read("Supabase.js");
assert.doesNotMatch(db,/document\.|createElement|site-public-nav|site-footer-links/,
 "El archivo Supabase sólo configura el cliente, no modifica el DOM");
const shell=read("site-shell.js");
assert.match(shell,/const addPublicLinks/);
assert.match(shell,/const addLinks/);
assert.match(shell,/repertorios\.html/);
assert.match(shell,/contacto\.html/);
assert.equal(exists("site-public-nav.js"),false);
assert.equal(exists("site-footer-links.js"),false);

// La interfaz admin se integra directamente en el ciclo de renderizado,
// sin sobrescribir apRenderView ni inyectar estilos desde JavaScript.
const html=read("admin.html"),admin=read("admin-pro.js"),layout=read("admin-form-layout.js");
assert.match(html,/href="admin-form-layout\.css\?v=1"/);
assert.match(html,/src="admin-form-layout\.js\?v=1"/);
assert.ok(html.indexOf("admin-form-layout.js")<html.indexOf("admin-pro.js"),
 "Cargar el módulo antes de su consumidor");
assert.doesNotMatch(html,/admin-search-fix\.js/);
assert.equal(exists("admin-search-fix.js"),false);
assert.match(admin,/const formLayout = window\.ShalomAdminFormLayout/);
assert.match(admin,/formLayout\?\.enhanceForm\(AP\)/);
assert.match(admin,/formLayout\?\.restoreFocus\(focus\)/);
assert.doesNotMatch(layout,/apRenderView\s*=/);
assert.doesNotMatch(layout,/document\.createElement\("style"\)/);
assert.match(layout,/window\.ShalomAdminFormLayout = Object\.freeze/);
assert.match(read("admin-form-layout.css"),/\.admin-form-collapsible/);

// Android mantiene exactamente los mismos estilos, pero con una frontera
// clara entre los componentes y las ~300 reglas de presentación.
const app=read("mobile/App.js"),styles=read("mobile/src/app-styles.js");
assert.match(app,/const S=require\("\.\/src\/app-styles"\)\(C\)/);
assert.doesNotMatch(app,/const S=StyleSheet\.create\(/);
assert.match(styles,/module\.exports=function createAppStyles\(C\)/);
assert.match(styles,/return StyleSheet\.create\(/);
assert.match(styles,/spotifyShortcuts:\{flexDirection:"row",flexWrap:"wrap"/);
assert.match(styles,/songScorePlain:\{width:"100%",marginTop:13,paddingBottom:10\}/);
assert.match(styles,/repCard:\{minHeight:78/);
assert.ok((styles.match(/^\s*[A-Za-z]\w*:\{/gm)||[]).length>=290,
 "No se pierden estilos al extraerlos");
console.log("SHALOM: módulos públicos, editor admin y estilos Android separados sin parches de renderizado.");
