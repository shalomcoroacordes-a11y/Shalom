const assert=require("node:assert/strict");
const fs=require("node:fs");
const {PROFILE_KEY,BANNER_ACTIONS,defaults,parseProfile}=require("../src/profile-core");
assert.equal(typeof PROFILE_KEY,"string");
assert.equal(defaults().name,"Mi perfil");
assert.equal(defaults().bannerAction,"explorar");
assert.ok(BANNER_ACTIONS.includes("popurris"));
const custom={version:1,name:"  Jai  ",subtitle:"Guitarra",avatar:"cover-avatar1.jpg",
 cover:"cover-sunset1.jpg",banner:"cover-banner1.jpg",bannerAction:"repertorios",
 bannerTitle:"Preparar mis cantos",bannerPreset:"guitar"};
const loaded=parseProfile(JSON.stringify(custom));
assert.equal(loaded.name,"Jai");
assert.equal(loaded.subtitle,"Guitarra");
assert.equal(loaded.avatar,"cover-avatar1.jpg");
assert.equal(loaded.cover,"cover-sunset1.jpg");
assert.equal(loaded.banner,"cover-banner1.jpg");
assert.equal(loaded.bannerAction,"repertorios");
assert.equal(loaded.bannerPreset,"guitar");
assert.equal(parseProfile("{bad").name,"Mi perfil","Una preferencia dañada no debe borrar el cancionero");
assert.equal(parseProfile(JSON.stringify({...custom,avatar:"../../unsafe.jpg"})).avatar,null);
assert.equal(parseProfile(JSON.stringify({...custom,bannerAction:"pay"})).bannerAction,"explorar");
const app=fs.readFileSync("App.js","utf8");
const shared=fs.readFileSync("src/app-components.js","utf8");
const profile=fs.readFileSync("src/profile-ui.js","utf8");
const cover=fs.readFileSync("src/collection-covers.js","utf8");
assert.match(app,/h\(ProfileScreen,/,"Perfil como quinta sección");
assert.match(app,/getMetadataBatch\(\{[^\n]*\[PROFILE_KEY\]:""/,"Leer perfil local al iniciar");
assert.match(app,/profileRaw=prefs\[PROFILE_KEY\]/);
assert.match(app,/setMetadata\(PROFILE_KEY,JSON\.stringify\(clean\)\)/,"Guardar perfil privado");
assert.match(app,/onPress:\(\)=>tab==="Perfil"\?openProfileMenu\(\)/,"Opciones de perfil en tres puntos");
assert.match(app,/h\(CoverArt,\{preset:profile\.bannerPreset,photo:profile\.banner\|\|profile\.cover/,
 "El destacado usa la foto local seleccionada");
assert.match(shared,/h\(InitialCover,\{title:title\|\|"Canto",size:53\}/,
 "Las listas de cantos utilizan iniciales de color");
assert.match(app,/h\(InitialCover,\{title:rep\.title\|\|"Repertorio",size:53\}/,
 "Los repertorios usan iniciales de color");
assert.match(app,/h\(LibraryArtistCard,/,"Los artistas utilizan tarjetas compartidas");
assert.match(fs.readFileSync("src/library-ui.js","utf8"),/artistCard:\{width:"48\.5%"/,"Los artistas se muestran en dos columnas");
assert.match(profile,/function ProfileScreen\(/,"Vista personalizable");
assert.match(profile,/Cambiar foto/,"Avatar editable");
assert.match(profile,/Cambiar portada/,"Portada editable");
assert.match(profile,/Elegir foto del banner/,"Banner de inicio editable");
assert.match(profile,/Mis me gusta/,"Favoritos dentro de Perfil");
assert.match(profile,/onCollections/,"Conservar acceso a misas y popurrís locales");
assert.match(profile,/onEditRequestConsumed\?\.\(\)/,
 "La petición de editar perfil se consume y no queda pendiente");
assert.match(profile,/if\(editNonce<=0\)return;/,
 "Perfil abre en modo lectura salvo acción explícita de edición");
assert.match(app,/onEditRequestConsumed:\(\)=>setProfileEditNonce\(0\)/,
 "El contenedor limpia el evento después de abrir el editor");
assert.match(app,/if\(next!=="Perfil"\)setProfileEditNonce\(0\)/,
 "Salir de Perfil también elimina el evento de edición anterior");
assert.match(app,/onEdit:\(\)=>setProfileEditNonce\(n=>n\+1\)/,
 "Editar solo se inicia al pulsar la opción en los tres puntos");
assert.match(profile,/btn\("Cancelar",\(\)=>\{setDraft\(profile\);setEditing\(false\);\},true\)/,
 "Cancelar abandona la edición y descarta un borrador sin guardar");
assert.match(profile,/setEditing\(false\);[\s\S]*?const avatar=/,
 "Guardar vuelve a la vista normal de perfil");

assert.match(cover,/Paths\.document/,"No subir fotos a la nube");
console.log("SHALOM: perfil personal, fotos privadas, inicio editable y biblioteca visual verificados.");
