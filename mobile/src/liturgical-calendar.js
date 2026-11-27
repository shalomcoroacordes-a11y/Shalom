// Civil-date calendar for the main Roman rite seasons, Mexico profile.
// NOT a complete ordo: local celebrations, rankings, vigils and readings need verified data.
const {localDay}=require("./home-spotlight");
const {repertoireType}=require("./repertoire-ui");
const DAY=86400000;
const iso=t=>new Date(t).toISOString().slice(0,10);
function parseDay(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const t=Date.parse(value+"T00:00:00Z");
 return Number.isFinite(t)&&iso(t)===value?t:null;
}
function shift(day,delta){const t=parseDay(day);return t===null?null:iso(t+delta*DAY)}
function weekday(day){const t=parseDay(day);return t===null?null:new Date(t).getUTCDay()}
function advent(y){const d=y+"-11-27";return shift(d,(7-weekday(d))%7)}
function easter(y){
 const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
 f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
 i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
 z=h+l-7*m+114;
 return y+"-"+String(Math.floor(z/31)).padStart(2,"0")+"-"+String(z%31+1).padStart(2,"0");
}
function epiphany(y){const d=y+"-01-02";return shift(d,(7-weekday(d))%7)}
function baptism(y){const ep=epiphany(y);return shift(ep,Number(ep.slice(-2))>=7?1:7)}
const SEASONS={advent:["Adviento","morado"],christmas:["Navidad","blanco"],lent:["Cuaresma","morado"],triduum:["Triduo Pascual",null],easter:["Pascua","blanco"],ordinary:["Tiempo Ordinario","verde"]};
const ROMAN=["I","II","III","IV","V","VI","VII"];
function liturgicalDay(date){
 if(parseDay(date)===null)return null;
 const y=Number(date.slice(0,4));
 if(y<1900||y>2099)return null;
 const pascha=easter(y),ash=shift(pascha,-46),holyThursday=shift(pascha,-3),pentecost=shift(pascha,49),adv=advent(y);
 let season=date>=y+"-12-25"||date<=baptism(y)?"christmas":date>=adv?"advent":date>=pascha&&date<=pentecost?"easter":date>=holyThursday&&date<pascha?"triduum":date>=ash&&date<holyThursday?"lent":"ordinary";
 let title=null;
 const principal=[
 [y+"-01-01","Santa María, Madre de Dios"],[epiphany(y),"Epifanía del Señor"],[baptism(y),"Bautismo del Señor"],
 [ash,"Miércoles de Ceniza"],[shift(pascha,-7),"Domingo de Ramos"],[holyThursday,"Jueves Santo"],
 [shift(pascha,-2),"Viernes Santo"],[shift(pascha,-1),"Sábado Santo"],[pascha,"Domingo de Pascua"],
 [pentecost,"Pentecostés"],[shift(pentecost,7),"Santísima Trinidad"],[shift(adv,-7),"Jesucristo, Rey del Universo"],[y+"-12-25","Natividad del Señor"]
 ];
 title=principal.find(row=>row[0]===date)?.[1]||null;
 if(!title&&weekday(date)===0&&season==="advent")title=ROMAN[(parseDay(date)-parseDay(adv))/(7*DAY)]+" Domingo de Adviento";
 if(!title&&weekday(date)===0&&season==="lent")title=ROMAN[Math.floor((parseDay(date)-parseDay(ash))/(7*DAY))]+" Domingo de Cuaresma";
 const litYear=date>=adv?y+1:y;
 const cycle=["C","A","B"][litYear%3];
 return {date,season,seasonName:SEASONS[season][0],seasonColor:SEASONS[season][1],title,cycle,scope:"Tiempos litúrgicos y fechas principales; no es un ordo diario."};
}
function monthDays(month){
 const first=month+"-01",t=parseDay(first);if(t===null)return [];
 const padding=(weekday(first)+6)%7;
 const next=new Date(t);next.setUTCMonth(next.getUTCMonth()+1);
 const count=(next.getTime()-t)/DAY;
 return Array.from({length:Math.ceil((padding+count)/7)*7},(_,i)=>i<padding||i>=padding+count?null:shift(first,i-padding));
}
function shiftMonth(month,delta){const t=parseDay(month+"-01");if(t===null)return month;const d=new Date(t);d.setUTCMonth(d.getUTCMonth()+delta);return iso(d.getTime()).slice(0,7)}
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
module.exports={parseDay,shift,weekday,advent,easter,epiphany,baptism,liturgicalDay,monthDays,shiftMonth,choirEvents,homeContext};
