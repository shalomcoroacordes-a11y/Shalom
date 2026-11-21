"use strict";
const assert=require("node:assert/strict");
const {normalize,filterChoices,categoryChoices}=require("../src/selector");
assert.equal(normalize("MARIÁ"),"maria");
const cats=categoryChoices([
 {id:"A",name:"Misa"},
 {id:"B",name:"Santo",parent_id:"A"},
 {id:"C",name:"Comunión",parent_id:"A"},
 {id:"D",name:"Alabanza"}
]);
assert.deepEqual(cats.find(c=>c[0]==="B"),["B","Misa  ›  Santo"]);
assert.equal(filterChoices(cats,"comunion")[0][0],"C");
assert.equal(filterChoices(cats,"santo").length,1);
assert.equal(filterChoices([["1","Shalom"],["2","Voces"],["3","Ángeles"]],"angeles")[0][0],"3");
assert.deepEqual(filterChoices(cats,"no existe"),[]);
const cycle=categoryChoices([{id:"one",name:"Uno",parent_id:"two"},{id:"two",name:"Dos",parent_id:"one"}]);
assert.equal(cycle.length,2,"La jerarquía cíclica no debe bloquear el editor");
console.log("Búsqueda tolerante a acentos y jerarquía de categorías aprobada.");
