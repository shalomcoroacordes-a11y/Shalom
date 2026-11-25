"use strict";
const React=require("react");
const {View}=require("react-native");
const {S}=require("../styles");
const {txt,button}=require("../components/Controls");
const h=React.createElement;
function HomeScreen({lists,drafts,begin,onRepertoires,busy,refresh,offline,session,access,logout}){
  return h(View,{style:{gap:15}},
   txt("HOLA, ADMINISTRACIÓN",S.kicker),txt("Bienvenido a SHALOM",S.title),
   txt("Un mismo cancionero para la página y las apps. Adminístralo desde cualquier lugar.",S.subtitle),
   h(View,{style:S.row},...[["Cantos",(lists.songs||[]).length],["Artistas",(lists.artists||[]).length],["Pendientes",drafts.length]].map(([label,value])=>h(View,{key:label,style:S.metric},txt(value,S.metricNumber),txt(label,S.caption)))),
   h(View,{style:S.card},txt("Continuar trabajando",S.section),txt("Crea, corrige o publica incluso si no tienes conexión.",S.note),button("+ Crear canto",()=>begin("songs"))),
   h(View,{style:S.card},txt("Misa y repertorios",S.section),txt("Prepara las celebraciones y ensayos de SHALOM.",S.note),button("Administrar repertorios",onRepertoires,"secondary")),
   button(busy?"Actualizando...":"↻ Actualizar y sincronizar",refresh,"secondary",busy||offline),
   txt("Sesión: "+(session?.email||"")+(access?.owner?" · Superadministrador":""),S.note),
   button("Cerrar sesión",logout,"secondary")
  );
 }
module.exports=HomeScreen;
