"use strict";
const assert=require("node:assert/strict");
const {createEditorController}=require("../src/editor-controller");
async function test(){
 let view={},gate=null,fail=false,refreshFail=false,busy=false,dialog=null;
 const writes=[],notices=[],saved=[];
 const e=createEditorController({store:{async upsertDraft(owner,draft){writes.push({owner,draft});if(gate)await gate;if(fail)throw Error("disco");}},createId:()=>"new-id",apply:next=>{view={...view,...next}},alert:(...args)=>{dialog=args},onSaved:async(...args)=>{if(refreshFail)throw Error("actualización");saved.push(args)},onBusy:value=>{busy=value},notice:message=>notices.push(message)});
 const begin=(owner="a")=>{e.begin({owner,table:"songs",lists:{},origin:"Cantos"});e.update("lyrics","G\nLetra de prueba");};
 begin();e.update("title","Primer canto");e.leave();assert.equal(dialog[0],"Cambios sin guardar");dialog[2][0].onPress();assert.equal(view.tab,"Editor");
 let release;gate=new Promise(r=>{release=r});const sending=e.save(true);assert.equal(busy,true);assert.equal(await e.save(true),false);assert.equal(writes.length,1);
 e.leave();assert.equal(view.tab,"Editor");e.update("title","Cambio reciente");release();assert.equal(await sending,false);assert.equal(view.form.title,"Cambio reciente");assert.equal(saved.length,0);assert.equal(notices.length,1);
 gate=null;assert.equal(await e.save(false),true);assert.equal(view.tab,"Pendientes");assert.equal(writes[1].draft.body.title,"Cambio reciente");assert.deepEqual(saved,[["a",false]]);
 begin();e.update("title","Sin pérdida");fail=true;assert.equal(await e.save(false),false);assert.equal(view.form.title,"Sin pérdida");assert.equal(dialog[0],"No se pudo guardar");fail=false;
 gate=new Promise(r=>{release=r});const old=e.save(false);e.reset();begin("b");e.update("title","Otra cuenta");release();assert.equal(await old,false);assert.equal(view.form.title,"Otra cuenta");assert.equal(saved.length,1);
 gate=null;e.leave();dialog[2][1].onPress();assert.equal(view.tab,"Cantos");assert.equal(view.form,null);
 begin();e.update("title","Guardado confirmado");refreshFail=true;assert.equal(await e.save(false),true);assert.equal(view.tab,"Pendientes");assert.match(notices.at(-1),/Borrador guardado/);
 begin();e.update("title","Sin letra");e.update("lyrics","");const before=writes.length;assert.equal(await e.save(false),false);assert.equal(writes.length,before);assert.match(dialog[1],/Falta el campo: lyrics/);
 e.begin({owner:"a",table:"repertoires",lists:{},origin:"Catálogo",seed:{kind:"ensayo",event_date:"2026-11-29",is_published:true,title:"Injected"}});assert.equal(view.form.kind,"ensayo");assert.equal(view.form.event_date,"2026-11-29");assert.equal(view.form.is_published,false);assert.equal(view.form.title,"");assert.equal(view.editing.expected,null);e.leave();assert.equal(view.tab,"Catálogo");
 e.begin({owner:"a",table:"repertoires",lists:{},origin:"Pendientes",fromDraft:{id:"draft-r",body:{title:"Misa guardada",kind:"misa",event_date:"2026-11-29",items:[{song_id:"s",moment:"Entrada"}],is_published:false}}});assert.deepEqual(JSON.parse(view.form.items),[{song_id:"s",moment:"Entrada"}]);assert.equal(view.editing.id,"draft-r");
 console.log("Admin editor: save deduplication, unsaved edits, failure, late response and exit verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
