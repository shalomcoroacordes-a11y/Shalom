// Rutas de navegación: cantos oficiales, creaciones locales y opciones del usuario.
const {normalize}=require("./catalog");
const tabs=Object.freeze([
 Object.freeze(["Inicio","home"]),
 Object.freeze(["Canciones","song"]),
 Object.freeze(["Repertorios","repertoires"]),
 Object.freeze(["Mis creaciones","medleys"]),
 Object.freeze(["Perfil","profile"])
]);
const exploreTabs=new Set(["Explorar","Artistas","Categorías","Álbumes","Popurrís"]);
const profileTabs=new Set(["Solicitar","Más","Respaldo"]);
function routeForTab(name){return name==="Mis creaciones"?"Mis colecciones":name;}
function isSelectedTab(current,name){
 return current===name||
  (name==="Mis creaciones"&&current==="Mis colecciones")||
  (name==="Canciones"&&exploreTabs.has(current))||
  (name==="Perfil"&&profileTabs.has(current));
}
function matchesSearch(values,term){
 const fields=Array.isArray(values)?values:[];
 const haystack=normalize(fields.filter(value=>value!==null&&value!==undefined).join(" "));
 return haystack.includes(normalize(String(term??"").trim()));
}
module.exports=Object.freeze({tabs,isSelectedTab,routeForTab,matchesSearch});
