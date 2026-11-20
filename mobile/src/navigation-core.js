// Contrato de navegación y búsqueda SHALOM: funciones independientes de React Native.
const {normalize}=require("./catalog");

const tabs=Object.freeze([
 Object.freeze(["Inicio","home"]),
 Object.freeze(["Canciones","song"]),
 Object.freeze(["Repertorios","repertoires"]),
 Object.freeze(["Artistas","artists"]),
 Object.freeze(["Perfil","profile"])
]);

const moreTabs=new Set(["Popurrís","Álbumes","Categorías","Solicitar","Mis colecciones"]);

function isSelectedTab(current,name){
 return current===name||(name==="Perfil"&&(moreTabs.has(current)||current==="Más"));
}

function matchesSearch(values,term){
 const fields=Array.isArray(values)?values:[];
 const haystack=normalize(fields.filter(value=>value!==null&&value!==undefined).join(" "));
 return haystack.includes(normalize(String(term??"").trim()));
}

module.exports=Object.freeze({tabs,isSelectedTab,matchesSearch});
