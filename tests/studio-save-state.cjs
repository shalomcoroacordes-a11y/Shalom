"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const js=fs.readFileSync("studio-lab.js","utf8"),html=fs.readFileSync("studio-lab.html","utf8");
const state=js.slice(js.indexOf("function renderSaveState()"),js.indexOf("function finishSave("));
const els=Object.fromEntries(["saveState","saveStateTitle","saveStateDetail","save","publish"].map(id=>[id,{dataset:{}}]));
const run=new Function("$","fingerprint","publishedFingerprint","draftFingerprint","baseline","pendingSave","pendingKind","saveError",state+"renderSaveState()");
function check(f,p,d,b,pending,kind,error,expected){run(id=>els[id],()=>f,p,d,b,pending,kind,error);assert.equal(els.saveState.dataset.state,expected);assert.equal(els.save.disabled,pending!==null);}
check("new",null,null,"new",null,null,"","dirty");
check("new","old","new","new",null,null,"","draft");
check("new","new",null,"new",null,null,"","published");
check("new","old",null,"old","new","publish","","busy");
check("new","old",null,"old",null,null,"No se confirmó","error");
assert.match(html,/<div class="button-row studio-save-actions"><button id="save">Guardar borrador<\/button><button id="publish" hidden>Publicar<\/button>/);
const admin=fs.readFileSync("admin-mobile/App.js","utf8");assert.match(admin,/La versión guardada difiere de la enviada/);
console.log("Studio: estado de guardado y publicación verificado.");
