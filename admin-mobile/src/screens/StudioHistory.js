"use strict";
const React=require("react");
const {View}=require("react-native");
const {S}=require("../styles");
const {txt,button}=require("../components/Controls");
const h=React.createElement;
const reasons={song_revision_changed:"Cambio de revisión",song_deleted:"Canto eliminado",arrangement_replaced:"Arreglo sustituido",arrangement_deleted:"Arreglo eliminado"};
function StudioHistory({revision,onList,onChoose}){
 const [rows,setRows]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState("");
 const running=React.useRef(false),alive=React.useRef(true);
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 async function run(fn){
  if(running.current)return;
  running.current=true;setBusy(true);setError("");
  try{await fn()}catch(e){if(alive.current)setError(e.message||"No se pudo consultar el historial.");}
  finally{running.current=false;if(alive.current)setBusy(false)}
 }
 return h(View,{style:{gap:8}},
  button(rows===null?"Historial Studio":"Cerrar historial",()=>rows!==null?setRows(null):run(async()=>{const data=await onList();if(alive.current)setRows(data)}),"secondary",busy),
  busy?txt("Consultando revisión…",S.note):null,
  error?txt(error,S.error):null,
  rows!==null?h(View,{style:{gap:8}},txt("Últimas 30 revisiones. Cargar una revisión no la publica.",S.note),
   rows.length===0?txt("Todavía no hay revisiones históricas.",S.note):null,
   ...rows.map(row=>h(View,{key:row.id,style:S.item},txt(reasons[row.reason]||"Revisión guardada",S.itemTitle),
    txt(new Date(row.archived_at).toLocaleString("es-MX"),S.caption),
    button("Escuchar revisión",()=>run(()=>onChoose(row.id,false)),"secondary",busy),
    row.song_revision===revision?button("Cargar para editar",()=>run(()=>onChoose(row.id,true)),"secondary",busy):null))
  ):null);
}
module.exports=StudioHistory;
