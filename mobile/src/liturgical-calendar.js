// Civil-date calendar for the main Roman rite seasons, Mexico profile.
// NOT a complete ordo: local celebrations, rankings, vigils and readings need verified data.
const {localDay}=require("./home-spotlight");
const {repertoireType}=require("./repertoire-ui");
const dates=require("./liturgical-dates");
const {parseDay,weekday,liturgicalDay}=dates;
function choirEvents(model){
 return (Array.isArray(model?.repertoires)?model.repertoires:[]).filter(r=>r?.is_published===true&&parseDay(r.event_date)!==null&&Array.isArray(r.items)&&r.items.length>0)
 .slice().sort((a,b)=>a.event_date.localeCompare(b.event_date)||String(a.id).localeCompare(String(b.id)));
}
function homeContext(model,now=new Date()){
 const today=localDay(now),events=choirEvents(model),todayEvents=events.filter(e=>e.event_date===today);
 const current=todayEvents.find(e=>repertoireType(e)==="misa")||todayEvents.find(e=>repertoireType(e)==="ensayo")||todayEvents[0]||null;
 const next=current||events.find(e=>e.event_date>=today)||null;
 const hour=now.getHours();
 return {today,day:liturgicalDay(today),events,current,next,
 greeting:current&&repertoireType(current)==="misa"?(weekday(today)===0?"¡Feliz domingo!":"Celebremos juntos"):current&&repertoireType(current)==="ensayo"?"Hoy tenemos ensayo":hour<12?"Buenos días":hour<19?"Buenas tardes":"Buenas noches",
 subtitle:current&&repertoireType(current)==="misa"?"Preparemos nuestra celebración.":current&&repertoireType(current)==="ensayo"?"Preparemos nuestros cantos.":"Que cada canto sea una oración."};
}
module.exports={...dates,choirEvents,homeContext};
