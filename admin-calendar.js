/* Calendar for the repertoire editor. No database or mutation ownership. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./mobile/src/liturgical-dates"):root.ShalomLiturgicalDates,typeof module==="object"&&module.exports?require("./mobile/src/liturgical-readings"):root.ShalomLiturgicalReadings,typeof module==="object"&&module.exports?require("./repertoires-core"):root.ShalomRepertoires,typeof module==="object"&&module.exports?require("./calendar-web-core"):root.ShalomCalendarWebCore);if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomAdminCalendar=api;})(typeof window!=="undefined"?window:globalThis,function(D,L,R,W){
 const esc=R.html;
 const {today,eventsOn,monthGrid}=W;
 function render(rows,day,locked=false){
  const selected=D.parseDay(day)===null?today():day,month=selected.slice(0,7),lit=D.liturgicalDay(selected),reading=L.readingsForDay(selected),options=L.readingOptions(selected);
  const lock=locked?" disabled":"";
  const events=eventsOn(rows,selected);
  return '<section class="rep-agenda" aria-label="Calendario de repertorios">'+
   '<h3>Calendario</h3>'+monthGrid(rows,selected,locked)+
   '<p class="admin-note">Verde: publicado · Gris: sólo borradores</p>'+
   '<div class="rep-agenda-day"><small>'+esc(R.formatDate(selected))+'</small><strong>'+esc(reading?.title||lit?.title||lit?.seasonName||"Fecha sin información litúrgica")+'</strong>'+
   (lit?'<small>'+esc(lit.seasonName)+' · Ciclo '+esc(lit.cycle)+'/'+esc(lit.weekdayCycle)+'</small>':"")+
   (reading?'<small>Evangelio: '+esc(reading.gospel)+'</small>'+(reading.provisional?'<small>'+esc(reading.note)+'</small>':"")+'<a href="'+esc(reading.url)+'" target="_blank" rel="noopener noreferrer">Consultar fuente litúrgica ↗</a>':options.length?'<small>Navidad: hay varios formularios de misa. Consulta las lecturas según la celebración.</small>':'<small>Lecturas no verificadas para esta fecha.</small>')+
   '</div><h4>Repertorios del día ('+events.length+')</h4>'+
   (events.map(e=>'<button type="button" class="rep-agenda-event" data-edit="'+esc(e.id)+'"'+lock+'><strong>'+esc(e.title)+'</strong><small>'+esc(e.kind==="misa"?"Misa":"Ensayo")+' · '+(e.is_published?"Publicado":"Borrador")+' · '+(e.items||[]).length+' cantos</small></button>').join("")||'<p class="admin-note">Sin repertorios para esta fecha.</p>')+
   '<div class="rep-agenda-actions"><button type="button" class="song-btn secondary" data-calendar-new="misa"'+lock+'>+ Misa</button><button type="button" class="song-btn secondary" data-calendar-new="ensayo"'+lock+'>+ Ensayo</button></div></section>';
 }
 function newDraft(kind,day){if(!["misa","ensayo"].includes(kind)||D.parseDay(day)===null)return null;return {...R.blank(kind),event_date:day};}
 return Object.freeze({today,eventsOn,render,newDraft,shiftMonth:D.shiftMonth});
});
