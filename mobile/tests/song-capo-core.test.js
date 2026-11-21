const assert=require("node:assert/strict");
const {capoChoices,capoSelection}=require("../src/song-capo-core");
const {readerShiftForPrint,buildPrintableSong}=require("../src/song-print");
const {parseSong}=require("../src/chords");

const song={id:"maria",title:"María",tone:"G",lyrics:"G        D\nTe alabamos",
 capo_position:2,capo_key:"F",_capos:[
  {id:"alternative",label:"Capo alternativo",capo_position:4,capo_key:"D#"},
  {id:"without-key",capo_position:3,capo_key:""}]};
const before=JSON.stringify(song);
assert.deepEqual(capoChoices(song).map(c=>c.id),["none","main","alternative","without-key"]);
assert.deepEqual(capoSelection(song,"none").chosen,{id:"none",label:"Sin capo",position:0,key:""});
assert.equal(capoSelection(song,"none").offset,0);
assert.equal(capoSelection(song,"main").offset,-2);
assert.equal(capoSelection(song,"alternative").offset,-4);
assert.equal(capoSelection(song,"without-key").offset,-3);
assert.equal(capoSelection(song,"desconocido").offset,0);
assert.equal(capoSelection(null,"main").offset,0);
assert.equal(capoSelection({tone:"Bb",capo_position:1,capo_key:"A#"},"main").offset,0);
assert.equal(capoSelection({tone:"C",capo_position:5,capo_key:"G"},"main").offset,-5);
assert.equal(capoSelection({tone:"C",capo_position:9},"main").offset,-9);
assert.equal(capoSelection({tone:"Am",capo_position:2,capo_key:"G"},"main").offset,-2);
for(const shift of [-11,-5,0,2,6,11]){
 for(const choice of capoChoices(song)){
  const resolved=capoSelection(song,choice.id);
  const printShift=readerShiftForPrint(song,shift,choice.id);
  assert.equal(printShift,shift+resolved.offset,"Vista e impresión deben coincidir: "+choice.id);
  assert.ok(parseSong(song.lyrics,shift+resolved.offset).length>0);
  assert.match(buildPrintableSong(song,printShift),/SHALOM/);
 }
}
assert.equal(JSON.stringify(song),before,"Las variantes no deben modificar el catálogo");
console.log("SHALOM: lectura e impresión utilizan un solo cálculo de capo.");
