"use strict";
// Pure repertoire operations; keep all existing fields when editing locally.
const {MASS_STEPS}=require("../../repertoires-core");
const {parseDay}=require("../../mobile/src/liturgical-dates");
const {readingsForDay}=require("../../mobile/src/liturgical-readings");
const normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const ALIASES={"senor ten piedad":"Señor, ten piedad","salmo":"Salmo responsorial","aleluya":"Aleluya / Aclamación","ofertorio":"Presentación de dones","repaso":"Repasar","nuevo canto":"Canto nuevo"};
const moments=kind=>kind==="misa"?MASS_STEPS.map(x=>x[1]):["Ensayo","Repasar","Canto nuevo","Inicio","Final"];
function canonicalMoment(value){return ALIASES[normalize(value)]||String(value??"");}
function parseItems(value){try{const rows=Array.isArray(value)?value:JSON.parse(String(value??"[]"));return Array.isArray(rows)&&rows.every(r=>r&&typeof r==="object"&&!Array.isArray(r))?rows:null;}catch(_){return null;}}
function moveItem(rows,index,delta){const to=index+delta;if(!Number.isInteger(index)||!Number.isInteger(to)||index<0||index>=rows.length||to<0||to>=rows.length)return rows;const next=rows.slice();[next[index],next[to]]=[next[to],next[index]];return next;}
function findSongs(songs,query){const q=normalize(query);return (songs||[]).filter(s=>normalize([s.title,s.tone].join(" ")).includes(q));}
function warnings(form){if(form.kind!=="misa")return [];const r=readingsForDay(form.event_date);if(r?.gloria===false&&parseItems(form.items)?.some(item=>normalize(canonicalMoment(item.moment))==="gloria"))return ["La referencia litúrgica de esta fecha indica que no se dice Gloria. Revisa la celebración antes de publicar."];return [];}
function validate(form){if(!["misa","ensayo"].includes(form.kind))throw Error("Selecciona Misa o Ensayo.");if(form.event_date&&parseDay(form.event_date)===null)throw Error("Indica una fecha real (AAAA-MM-DD).");const rows=parseItems(form.items);if(!rows||rows.length>45)throw Error("El repertorio admite hasta 45 cantos.");if(rows.some(r=>!String(r.song_id||"").trim()))throw Error("Hay un canto sin identificador.");if(form.is_published&&!rows.length)throw Error("Agrega al menos un canto antes de publicar.");return rows;}
module.exports={moments,canonicalMoment,parseItems,moveItem,findSongs,warnings,validate};
