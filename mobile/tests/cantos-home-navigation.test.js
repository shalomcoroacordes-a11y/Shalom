// Regresión de la maqueta solicitada por el coro: Cantos y la barra son pantallas reales.
const assert=require("node:assert/strict"),fs=require("node:fs");
const app=fs.readFileSync("App.js","utf8");
const catalogScreens=fs.readFileSync("src/catalog-screens-ui.js","utf8");
const styles=fs.readFileSync("src/app-styles.js","utf8");
const profile=fs.readFileSync("src/profile-ui.js","utf8");
const personal=fs.readFileSync("src/personal-ui.js","utf8");
const {tabs,routeForTab}=require("../src/navigation-core");
assert.deepEqual(tabs.map(x=>x[0]),["Inicio","Cantos","Repertorios","Mis creaciones","Perfil"]);
assert.equal(routeForTab("Cantos"),"Canciones");
assert.equal(tabs.find(x=>x[0]==="Repertorios")[1],"calendar");
assert.equal(tabs.find(x=>x[0]==="Mis creaciones")[1],"repertoires");
assert.match(app,/const \[songLibraryOpen,setSongLibraryOpen\]=useState\(false\)/);
assert.match(catalogScreens,/placeholder:"Buscar letras, acordes y títulos"/);
for(const x of ['["all","Todos"]','["catolico","Católicos"]',
 ['"cristiano","Cristianos"'].join(""),'["liked","Mis me gusta"]'])
 assert.ok(catalogScreens.includes(x),"Filtro de Cantos: "+x);
assert.match(catalogScreens,/label\("Biblioteca de cantos",S.cantosLibraryTitle\)/);
assert.match(catalogScreens,/Listado de canciones disponibles con su artista y opciones/);
assert.match(catalogScreens,/label\("Explorar también por",S.cantosExploreHeading\)/);
const exploration=fs.readFileSync("src/exploration-screens-ui.js","utf8");
for(const x of ["Artistas","Categorías","Álbumes","Popurrís oficiales"])assert.ok(exploration.includes(x));
assert.match(catalogScreens,/onPress:\(\)=>setSongLibraryOpen\(true\)/);
assert.match(catalogScreens,/eligible\.slice\(0,countLimit\)\.map\(song=>h\(LibrarySongRow/);
assert.match(catalogScreens,/onOptions:\(\)=>setActionSongId\(String\(song.id\)\)/);
assert.match(catalogScreens,/onLike:\(\)=>toggleLike\(song.id\)/);
assert.match(app,/onOpenLink:url=>openWeb\(url\)/,"Tutorial links remain available");
assert.match(styles,/cantosLibraryCard:/);
assert.match(styles,/cantosFilterChip:/);
assert.match(styles,/cantosExploreGrid:/);
assert.match(app,/\["Inicio","Canciones","Repertorios","Mis colecciones","Perfil"\]\.includes\(tab\)/,
 "All five pages use the same header");
assert.match(app,/!immersiveActive&&!settingsOpen&&!isReader\?h\(View,\{style:S.nav,onLayout:/,
 "All five pages use one common bottom navigation bar");
assert.match(styles,/nav:\{backgroundColor:C.bg,borderTopWidth:1/);
assert.match(styles,/navSelected:\{backgroundColor:"transparent"/);
assert.match(app,/tintColor:selected\?C.green:C.muted/);
assert.match(profile,/toolRow\("settings","Configuración"/);
assert.match(personal,/label\("Mis creaciones",styles.collectionTitle\)/);
assert.match(catalogScreens,/requestForm\("other"\);setRequestTitle\("Sugerencia de repertorio"\)/);
console.log("SHALOM: Cantos fiel a la maqueta, barra uniforme, favoritos, rutas y enlaces conservados.");
