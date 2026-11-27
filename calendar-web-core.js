/* Pure calendar display helpers shared by the public website and Admin. */
(function(root,factory){
 const common=typeof module==="object"&&module.exports;
 const api=factory(common?require("./mobile/src/liturgical-dates"):root.ShalomLiturgicalDates,common?require("./repertoires-core"):root.ShalomRepertoires);
 if(common)module.exports=api;else root.ShalomCalendarWebCore=api;
})(typeof window!=="undefined"?window:globalThis,function(D,R){
 const esc=R.html;
 function today(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");}
 function eventsOn(rows,day){return (Array.isArray(rows)?rows:[]).filter(row=>D.parseDay(row.event_date)!==null&&row.event_date===day);}
 function publishedEvents(rows){return (Array.isArray(rows)?rows:[]).filter(row=>row?.is_published===true&&D.parseDay(row.event_date)!==null&&Array.isArray(row.items)&&row.items.length>0);}
 function nextEvent(rows,day=today()){return publishedEvents(rows).filter(row=>row.event_date>=day).sort((a,b)=>a.event_date.localeCompare(b.event_date)||Number(b.kind==="misa")-Number(a.kind==="misa")||String(a.id).localeCompare(String(b.id)))[0]||null;}
 function monthGrid(rows,selected,locked=false){
  const month=selected.slice(0,7),lock=locked?" disabled":"";
  const title=new Date(month+"-01T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
  const cells=D.monthDays(month).map(date=>{
   if(!date)return '<span aria-hidden="true"></span>';
   const events=eventsOn(rows,date),published=events.some(e=>e.is_published===true);
   return '<button type="button" data-calendar-day="'+esc(date)+'" aria-pressed="'+(date===selected)+'" aria-label="'+esc(R.formatDate(date)+(events.length?", "+events.length+" repertorios":""))+'"'+lock+'>'+Number(date.slice(-2))+(events.length?'<i class="'+(published?"published":"draft")+'" aria-hidden="true"></i>':"")+'</button>';
  }).join("");
  return '<div class="rep-agenda-month"><button type="button" data-calendar-nav="-1" aria-label="Mes anterior"'+lock+'>‹</button><strong>'+esc(title)+'</strong><button type="button" data-calendar-nav="1" aria-label="Mes siguiente"'+lock+'>›</button></div>'+
   '<div class="rep-agenda-grid">'+["L","M","X","J","V","S","D"].map(x=>'<span class="rep-agenda-week">'+x+'</span>').join("")+cells+'</div>';
 }
 return Object.freeze({today,eventsOn,publishedEvents,nextEvent,monthGrid});
});
