const assert=require("node:assert/strict");
const fs=require("node:fs");
const R=require("../repertoires-core.js");
const id="b9defa0e-2548-4ae4-a002-34526f5f97c0";
assert.equal(R.blank().kind,"misa");
assert.equal(R.blank("ensayo").kind,"ensayo");
assert.equal(R.MASS_STEPS.length,10);
assert.throws(()=>R.validate({...R.blank(),title:"Misa de domingo",is_published:true}),/al menos un canto/);
assert.throws(()=>R.validate({...R.blank(),title:"A",is_published:false}),/nombre/);
assert.throws(()=>R.validate({...R.blank(),title:"Misa",items:[{song_id:"x"}]}),/identificador/);
assert.equal(R.validate({title:"Ensayo de músicos",kind:"ensayo",items:[],is_published:false}).kind,"ensayo");
const valid=R.validate({title:"Misa dominical",kind:"misa",items:[{song_id:id,moment:"Entrada",notes:"Dos veces"}],is_published:true,event_date:"2026-11-22"});
assert.equal(valid.items[0].song_id,id);
assert.equal(valid.items[0].moment,"Entrada");
assert.equal(valid.is_published,true);
assert.equal(valid.event_date,"2026-11-22");
for(const date of ["2026-02-30","2026-13-01","2026-00-10","2025-02-29","2026-11-31","not-a-date"]){
 assert.throws(()=>R.validate({title:"Misa dominical",kind:"misa",items:[],event_date:date}),/fecha real/,date);
 assert.equal(R.formatDate(date),"Sin fecha",date);
}
assert.equal(R.validate({title:"Misa dominical",kind:"misa",items:[],event_date:"2028-02-29"}).event_date,"2028-02-29");
assert.equal(R.html("<img src=x onerror='bad'>"),"&lt;img src=x onerror=&#039;bad&#039;&gt;");
const page=fs.readFileSync("repertorios.html","utf8");
assert.match(page,/repertoires.js/);
assert.match(page,/repCurrentLyrics/);
assert.match(page,/repPrintAll/);
const admin=fs.readFileSync("admin-pro.js","utf8");
assert.match(admin,/\["repertoires", "Repertorios"\]/);
assert.match(admin,/ShalomRepertoireAdmin/);
const repertoireAdmin=fs.readFileSync("admin-repertoires.js","utf8");
assert.match(repertoireAdmin,/if\(state\.saving\|\|state\.deleting\)return/);
assert.match(repertoireAdmin,/let saved=false/);
assert.match(repertoireAdmin,/saved=true;[\s\S]*?await reload\(\)/);
assert.match(repertoireAdmin,/El repertorio se guardó, pero no se pudo actualizar la lista/);
assert.match(repertoireAdmin,/No se pudo confirmar el guardado/);
assert.match(repertoireAdmin,/Revisa los repertorios antes de reintentarlo/);
assert.match(repertoireAdmin,/saving:false,deleting:false/);
assert.match(repertoireAdmin,/if\(state\.saving\|\|state\.deleting\|\|!state\.active\.id\)return/);
assert.match(repertoireAdmin,/state\.deleting=true;render\(\)/);
assert.match(repertoireAdmin,/finally\{state\.deleting=false;render\(\);\}/);
assert.match(repertoireAdmin,/Repertorio eliminado, pero no se pudo actualizar la lista/);
assert.match(repertoireAdmin,/No se pudo confirmar la eliminación/);
assert.match(repertoireAdmin,/function snapshot\(d\)/);
assert.match(repertoireAdmin,/function canDiscard\(\)/);
assert.match(repertoireAdmin,/Hay cambios sin guardar en este repertorio/);
assert.match(repertoireAdmin,/!canDiscard\(\)\)return;state\.active=R\.blank/);
assert.match(repertoireAdmin,/if\(!rep\|\|!canDiscard\(\)\)return/);
assert.match(repertoireAdmin,/state\.baseline=snapshot\(state\.active\)/);
assert.match(repertoireAdmin,/function busy\(\)\{return state\.saving\|\|state\.deleting;\}/);
for(const action of ["repKind","repAddSong"]){
 assert.match(repertoireAdmin,new RegExp('\\$\\("#'+action+'"\\)\\?\\.addEventListener\\("[^"]+",[^]*?if\\(busy\\(\\)\\)return;'));
}
for(const action of ["data-move","data-remove"]){
 assert.match(repertoireAdmin,new RegExp('querySelectorAll\\("\\['+action+'\\]"\\)[^]*?if\\(busy\\(\\)\\)return;'));
}
const adminPage=fs.readFileSync("admin.html","utf8");
assert.match(adminPage,/admin-repertoires.js/);
console.log("SHALOM: repertorios de misa y ensayo comprobados.");
const A=require("../admin-calendar.js");
const rows=[{id:"a",title:"<Misa>",event_date:"2026-11-29",kind:"misa",items:[],is_published:false},{id:"b",title:"Ensayo",event_date:"2026-11-29",kind:"ensayo",items:[{}],is_published:true},{id:"c",title:"Otro",event_date:"2026-11-30"}];
assert.equal(A.eventsOn(rows,"2026-11-29").length,2);
const agenda=A.render(rows,"2026-11-29");assert.match(agenda,/I Domingo de Adviento/);assert.match(agenda,/Mc 13, 33-37/);assert.match(agenda,/&lt;Misa&gt;/);assert.doesNotMatch(agenda,/<Misa>/);assert.match(agenda,/Borrador/);assert.match(agenda,/Publicado/);assert.doesNotMatch(agenda,/data-edit="c"/);
assert.deepEqual(A.newDraft("misa","2026-11-29"),{...R.blank("misa"),event_date:"2026-11-29"});
assert.equal(A.newDraft("ensayo","2026-02-30"),null);assert.equal(A.newDraft("bad","2026-11-29"),null);
assert.equal(A.shiftMonth("2026-12",1),"2027-01");assert.match(A.render(rows,"2026-11-29",true),/data-calendar-new="misa" disabled/);
assert.match(repertoireAdmin,/if\(!draft\|\|!canDiscard\(\)\)return/);assert.match(repertoireAdmin,/capture\(\);state.calendarDay/);
assert.ok(adminPage.indexOf("mobile/src/liturgical-dates.js")<adminPage.indexOf("admin-calendar.js"));assert.ok(adminPage.indexOf("admin-calendar.js")<adminPage.indexOf("admin-repertoires.js"));
console.log("Admin calendar: shared dates, source references, safe drafts, published and private events verified.");
