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

// La descripción de una categoría debe salir limpia desde su plantilla.
// No debe existir un observador global que reescriba nodos después de pintar.
const categorySource=read("categorias.js"),categoryPage=read("categorias.html");
assert.match(categorySource,/function categoryDescription\(description, fallback\)/);
assert.match(categorySource,/CATEGORY_HOME_META/);
assert.match(categorySource,/Cat\.esc\(categoryDescription\(item\.description/);
assert.match(categorySource,/Cat\.esc\(categoryDescription\(category\.description/);
assert.doesNotMatch(categoryPage,/category-home-meta-clean\.js/);
assert.equal(exists("category-home-meta-clean.js"),false);


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
const editorPositions=read("admin-editor-position.js");
assert.match(html,/src="admin-editor-position\.js\?v=1"/);
assert.ok(html.indexOf("admin-form-layout.js")<html.indexOf("admin-editor-position.js")&&
  html.indexOf("admin-editor-position.js")<html.indexOf("admin-pro.js"),
 "Admin carga el servicio de selección antes de abrir el editor");
assert.match(editorPositions,/window\.ShalomAdminEditorPosition = Object\.freeze/);
assert.match(admin,/remember: apRememberEditorPosition/);
assert.match(admin,/restore: apRestoreEditorPosition/);
assert.match(admin,/apForgetEditorPosition\("__new__"\)/);
assert.doesNotMatch(admin,/const AP_EDITOR_POSITION_KEY/);
assert.doesNotMatch(editorPositions,/apRenderView\s*=/);
const categoryTree=read("admin-category-tree.js");
assert.match(html,/src="admin-category-tree\.js\?v=1"/);
assert.ok(html.indexOf("admin-category-tree.js")<html.indexOf("admin-pro.js"));
assert.match(admin,/const apCategoryTree = window\.ShalomAdminCategoryTree/);
assert.match(categoryTree,/window\.ShalomAdminCategoryTree = Object\.freeze/);
assert.doesNotMatch(admin,/while \(added\) \{/);
assert.doesNotMatch(categoryTree,/supabaseClient|\.from\(|document\./);





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
assert.match(app,/require\("\.\/src\/navigation-core"\)/,
 "App consume el contrato de navegación en lugar de duplicarlo");
assert.doesNotMatch(app,/const tabs=\[\[/,
 "La navegación no debe volver al monolito principal");
const personalUi=read("mobile/src/personal-ui.js");
assert.match(personalUi,/require\("\.\/personal-styles"\)\(theme\)/);
assert.match(personalUi,/require\("\.\/personal-store"\)/);
assert.doesNotMatch(personalUi,/StyleSheet\.create\(/);
assert.match(read("mobile/src/personal-styles.js"),/return StyleSheet\.create\(/);
assert.match(read("mobile/src/personal-store.js"),/function updateComposition\(/);
assert.match(personalUi,/require\("\.\/personal-reader-core"\)/);
assert.match(read("mobile/src/personal-reader-core.js"),/function readingRows\(/);

// Compartir los componentes sin duplicar sus implementaciones en App.js.
const components=read("mobile/src/app-components.js");
assert.match(app,/require\("\.\/src\/app-components"\)/);
assert.match(components,/function AppSectionHeader\(/);
assert.match(components,/function SectionFilterBar\(/);
assert.match(components,/function SectionListCard\(/);
assert.match(components,/function SectionEmpty\(/);
assert.doesNotMatch(app,/function AppSectionHeader\(/);
assert.doesNotMatch(app,/function SectionHero\(/);

// El lector y la impresion comparten el mismo calculo de capo.
const capo=read("mobile/src/song-capo-core.js");
const print=read("mobile/src/song-print.js");
assert.match(app,/capoSelection\(song,capo\)/);
assert.match(print,/capoSelection\(song,capo\)\.offset/);
assert.match(capo,/function capoSelection\(/);
assert.doesNotMatch(app,/const NOTES=\["C","C#"/);
assert.doesNotMatch(print,/const notes=\["C","C#"/);

// Solicitudes separan la presentacion del envio y las preferencias locales.
const requestUi=read("mobile/src/request-screen-ui.js");
assert.match(app,/h\(RequestScreen,\{/);
assert.match(requestUi,/function RequestScreen\(/);
assert.doesNotMatch(requestUi,/fetch\(|setMetadata\(|supabase\./);
assert.doesNotMatch(app,/function renderRequest\(\)\{[\s\S]*?Object.entries\(TYPES\)/);

// Cada nuevo test Android entra automaticamente en CI.
const nativeWorkflow=read(".github/workflows/native-check.yml");
const androidPkg=JSON.parse(read("mobile/package.json"));
assert.equal(androidPkg.scripts.test,"node scripts/run-tests.js");
assert.equal(androidPkg.scripts["test:syntax"],"node scripts/check-syntax.js");
assert.match(nativeWorkflow,/run: npm test/);
assert.match(nativeWorkflow,/run: npm run test:syntax/);
assert.match(read("mobile/scripts/run-tests.js"),/endsWith\("\.test\.js"\)/);

// Los listados de Android usan selectores puros y consultas de categoria sin recalculo.
const selectors=read("mobile/src/library-selectors.js");
assert.match(app,/require\("\.\/src\/library-selectors"\)/);
assert.match(app,/filterSongs\(model,\{/);
assert.match(app,/filterArtists\(model,\{/);
assert.match(app,/favoriteSongs\(model,likedSet\)/);
assert.match(app,/searchHomeSongs\(model,homeSearch,6\)/);
assert.match(selectors,/const descendants=categoryId\?model\.descendants\(categoryId\):null/);
assert.doesNotMatch(app,/model\.descendants\(categoryId\)/);

console.log("SHALOM: módulos públicos, editor admin y estilos Android separados sin parches de renderizado.");
