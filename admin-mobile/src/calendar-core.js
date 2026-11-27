"use strict";
const D=require("../../mobile/src/liturgical-dates"),L=require("../../mobile/src/liturgical-readings");
function today(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");}
function recordsForCalendar(lists,drafts){
 const server=(lists?.repertoires||[]).filter(r=>D.parseDay(r.event_date)!==null).map(record=>({key:"server:"+record.id,date:record.event_date,record,draft:null,status:record.is_published===true?"Publicado":"Borrador en servidor"}));
 const local=(drafts||[]).filter(d=>d.type==="repertoires"&&D.parseDay(d.body?.event_date)!==null).map(draft=>({key:"local:"+draft.id,date:draft.body.event_date,record:draft.body,draft,status:({queued:"En cola",error:"Error de sincronización",conflict:"Conflicto",draft:"Borrador local"})[draft.status]||"Pendiente local"}));
 return [...server,...local].sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
function dayInfo(date){return {day:D.liturgicalDay(date),reading:L.readingsForDay(date),options:L.readingOptions(date),notice:L.dateNotice(date)};}
function draftSeed(kind,date){return ["misa","ensayo"].includes(kind)&&D.parseDay(date)!==null?{kind,event_date:date}:null;}
module.exports={today,recordsForCalendar,dayInfo,draftSeed,monthDays:D.monthDays,shiftMonth:D.shiftMonth};
