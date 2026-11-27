/* Read-only public calendar, never exposes drafts or writes to the catalog. */
(function(root,factory){
 const common=typeof module==="object"&&module.exports;
 const api=factory(common?require("./mobile/src/liturgical-dates"):root.ShalomLiturgicalDates,common?require("./mobile/src/liturgical-readings"):root.ShalomLiturgicalReadings,common?require("./repertoires-core"):root.ShalomRepertoires,common?require("./calendar-web-core"):root.ShalomCalendarWebCore);
 if(common)module.exports=api;else root.ShalomPublicCalendar=api;
})(typeof window!=="undefined"?window:globalThis,function(D,L,R,W){
 const esc=R.html;
 function render(rows,selected,variant=null,status="ready"){
  const publicRows=W.publishedEvents(rows);
  const day=D.liturgicalDay(selected),reading=L.readingsForDay(selected,variant),options=L.readingOptions(selected),events=W.eventsOn(publicRows,selected);
  return '<section class="rep-agenda" aria-label="Calendario litúrgico y del coro"><h2>Calendario</h2>'+W.monthGrid(publicRows,selected)+
   '<p class="muted-text">Punto verde: actividad publicada por el coro.</p>'+
   '<div class="rep-agenda-day"><small>'+esc(R.formatDate(selected))+'</small><strong>'+esc(reading?.title||day?.title||day?.seasonName||"Fecha sin información litúrgica")+'</strong>'+
   (day?'<small>'+esc(day.seasonName)+' · Ciclo '+esc(day.cycle)+'/'+esc(day.weekdayCycle)+'</small>':"")+
   '<small>Calendario base; no sustituye el ordo diocesano.</small></div>'+
   '<h3>Actividades del coro</h3>'+
   (events.map(e=>'<a class="rep-agenda-event" href="repertorios.html?id='+encodeURIComponent(e.id)+'"><strong>'+esc(e.title)+'</strong><small>'+esc([e.kind==="misa"?"Misa":"Ensayo",e.items.length+" cantos",e.location].filter(Boolean).join(" · "))+'</small></a>').join("")||
    '<p class="muted-text">'+(status==="loading"?"Cargando actividades…":status==="error"?"No se pudieron consultar las actividades.":"No hay repertorios publicados para esta fecha.")+'</p>')+
   '<h3>Lecturas de la misa</h3>'+
   (options.length?'<div class="rep-calendar-variants">'+options.map(o=>'<button type="button" data-calendar-variant="'+esc(o.id)+'" aria-pressed="'+(variant===o.id)+'">'+esc(o.label)+'</button>').join("")+'</div>':"")+
   (reading?'<p class="muted-text">'+esc(reading.rank+" · Color: "+reading.color)+'</p>'+[["Primera lectura",reading.first],["Salmo responsorial",reading.psalm],["Segunda lectura",reading.second],["Evangelio",reading.gospel]].filter(x=>x[1]).map(([name,value])=>'<div class="rep-calendar-reading"><span>'+esc(name)+'</span><strong>'+esc(value)+'</strong></div>').join("")+
    '<p>'+esc(reading.gloria===true?"Se dice Gloria.":reading.gloria===false?"No se dice Gloria.":"Gloria: confirmar en el misal.")+'</p>'+(reading.provisional?'<p class="muted-text">'+esc(reading.note)+'</p>':"")+'<a class="text-link" href="'+esc(reading.url)+'" target="_blank" rel="noopener noreferrer">'+esc(reading.source)+' ↗</a>':
    '<p class="muted-text">'+(options.length?"Selecciona el formulario de la celebración.":"Lecturas aún no verificadas para esta fecha.")+'</p>')+'</section>';
 }
 function mount(root,rows,status="ready",initialDay=W.today()){
  if(!root)return;
  let selected=D.parseDay(initialDay)!==null?initialDay:W.today(),variant=null;
  function update(focus){
   root.innerHTML=render(rows,selected,variant,status);
   if(focus){const button=[...root.querySelectorAll("button")].find(b=>b.dataset.calendarDay===focus||b.dataset.calendarNav===focus||b.dataset.calendarVariant===focus);button?.focus();}
  }
  root.onclick=e=>{
   const b=e.target.closest("button");if(!b||!root.contains(b))return;
   if(b.dataset.calendarDay){selected=b.dataset.calendarDay;variant=null;update(selected);}
   else if(b.dataset.calendarNav){selected=D.shiftMonth(selected.slice(0,7),Number(b.dataset.calendarNav))+"-01";variant=null;update(b.dataset.calendarNav);}
   else if(b.dataset.calendarVariant){variant=b.dataset.calendarVariant;update(variant);}
  };
  update();
 }
 function homeSummary(rows,date=W.today(),status="ready"){
  const day=D.liturgicalDay(date),reading=L.readingsForDay(date),next=W.nextEvent(rows,date);
  return '<h2>Hoy en SHALOM</h2><p>'+esc(reading?.title||day?.title||day?.seasonName||"Calendario litúrgico")+'</p>'+
   (next?'<p><strong>'+esc(next.title)+'</strong> · '+esc(R.formatDate(next.event_date))+' · '+next.items.length+' cantos</p><a href="repertorios.html?id='+encodeURIComponent(next.id)+'">Ver repertorio →</a>':'<p>'+ (status==="loading"?"Consultando actividades…":status==="error"?"Actividades no disponibles en este momento.":"Sin próximas actividades publicadas.")+'</p>')+
   '<a href="repertorios.html#calendario">Ver calendario litúrgico y del coro →</a>';
 }
 return Object.freeze({render,mount,homeSummary});
});
