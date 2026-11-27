"use strict";
const React=require("react"),h=React.createElement;
const {View,Pressable}=require("react-native");
const {S,C}=require("../styles");
const {txt,heading,button,itemRow}=require("../components/Controls");
const {effective,canEdit}=require("../permissions");
const A=require("../calendar-core");
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function CalendarScreen({lists,drafts,access,offline,onOpen,onDraft,onNew,onList}){
 const [date,setDate]=React.useState(A.today),[month,setMonth]=React.useState(()=>A.today().slice(0,7));
 const permitted=!access?.blocked&&(offline||Boolean(access?.authorized&&(effective(access,"repertoires.view")||canEdit(access,"repertoires"))));
 const editable=permitted&&(offline||canEdit(access,"repertoires"));
 if(!permitted)return h(View,{style:{gap:10}},heading("Calendario"),txt("No tienes permiso para consultar repertorios.",S.note),button("Volver al catálogo",onList,"secondary"));
 const records=A.recordsForCalendar(lists,drafts),dayRows=records.filter(r=>r.date===date);
 const {day:lit,reading,options,notice}=A.dayInfo(date);
 function move(delta){const next=A.shiftMonth(month,delta);setMonth(next);setDate(next+"-01");}
 const nav=(label,symbol,fn)=>h(Pressable,{style:S.calendarNav,accessibilityRole:"button",accessibilityLabel:label,onPress:fn},txt(symbol,S.calendarDayText));
 return h(View,{style:{gap:12}},
  h(View,{style:S.apart},heading("Calendario"),button("Ver lista",onList,"secondary")),
  txt(offline?"Copia local · publicar requiere conexión y permisos.":"Misas, ensayos y borradores de SHALOM.",S.note),
  h(View,{style:S.calendarMonth},nav("Mes anterior","‹",()=>move(-1)),txt(MONTHS[Number(month.slice(5))-1]+" "+month.slice(0,4),S.section),nav("Mes siguiente","›",()=>move(1))),
  h(View,{style:S.calendarGrid},
   ...["L","M","X","J","V","S","D"].map((label,i)=>h(View,{key:"w"+i,style:S.calendarCell},txt(label,S.caption))),
   ...A.monthDays(month).map((day,i)=>{
    if(!day)return h(View,{key:"empty"+i,style:S.calendarCell});
    const events=records.filter(r=>r.date===day),published=events.some(r=>!r.draft&&r.record.is_published===true);
    return h(Pressable,{key:day,style:[S.calendarCell,date===day&&S.calendarSelected],onPress:()=>setDate(day),accessibilityRole:"button",accessibilityLabel:day+(events.length?", "+events.length+" registros":""),accessibilityState:{selected:date===day}},txt(Number(day.slice(-2)),[S.calendarDayText,day===A.today()&&{color:C.green}]),h(View,{style:[S.calendarDot,{backgroundColor:events.length?(published?C.green:C.muted):"transparent"}]}));
   })),
  txt("Verde: publicado · Gris: borrador o pendiente.",S.caption),
  h(View,{style:S.calendarDetail},txt(date.split("-").reverse().join("/"),S.caption),txt(reading?.title||lit?.title||lit?.seasonName||"Fecha sin información litúrgica",S.section),lit?txt(lit.seasonName+" · Ciclo "+lit.cycle+"/"+lit.weekdayCycle,S.note):null,reading?h(View,{style:{gap:4}},txt("Evangelio: "+reading.gospel+" · "+reading.color,S.note),reading.note?txt(reading.note,S.note):null):txt(notice||(options.length?"Consulta el formulario específico en el calendario público.":"Lecturas aún no verificadas."),S.note)),
  heading("Repertorios del día"),...dayRows.map(row=>h(View,{key:row.key,style:S.calendarEvent},editable?itemRow(row.record.title||"Repertorio sin título",row.status+" · "+(row.record.kind==="misa"?"Misa":"Ensayo"),()=>row.draft?onDraft(row.draft):onOpen(row.record)):h(View,null,txt(row.record.title||"Repertorio sin título",S.itemTitle),txt(row.status,S.note)))),
  !dayRows.length?txt("No hay repertorios para este día.",S.note):null,
  editable?h(View,{style:{gap:8}},button("+ Nueva misa",()=>onNew("misa",date)),button("+ Nuevo ensayo",()=>onNew("ensayo",date),"secondary")):null,
  txt("Los borradores no se publican hasta que lo confirmes en el editor.",S.note));
}
module.exports=CalendarScreen;
