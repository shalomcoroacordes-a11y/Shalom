const assert=require("node:assert/strict");
const {STORE_KEY,COLORS,COVER_PRESETS,MOMENTS,emptyStore,parseStore,newCollection,newEntry,newPart,
 songSections,resolvePart,exportCode,importCode}=require("../src/personal-collections");
assert.equal(typeof STORE_KEY,"string");
assert.ok(COLORS.length>=4&&MOMENTS.includes("Comunión"));
const col=newCollection("Para mis ensayos","#a078e1");
assert.equal(col.color,"#a078e1");
assert.equal(col.coverPreset,"dove");
assert.equal(col.coverPhoto,null);
assert.ok(COVER_PRESETS.includes("sunrise"));
assert.deepEqual(emptyStore().collections,[]);
const song={id:"s1",lyrics:"[Estrofa 1]\nC       G\nSeñor ven aquí\n\n[Coro]\nAm        F\nTe adoramos\n\n[Estrofa 2]\nG\nAmén"};
const sections=songSections(song.lyrics);
assert.deepEqual(sections.map(s=>s.title),["Estrofa 1","Coro","Estrofa 2"]);
const piece={...newPart("s1"),sectionIndex:1,sectionTitle:"Coro",shift:2};
assert.ok(resolvePart(song,piece).lyrics.includes("Te adoramos"));
assert.ok(!resolvePart(song,piece).lyrics.includes("Señor ven aquí"));
assert.ok(resolvePart({...song,lyrics:"[Inicio]\nD\nHola\n\n"+song.lyrics},piece).lyrics.includes("Te adoramos"));
assert.equal(resolvePart({...song,lyrics:"[Estrofa]\nD\nOtro"},piece).lyrics,null);
assert.match(resolvePart(null,piece).error,/biblioteca/);
const obj=newEntry("popurri","Adoración y alegría 🕊️");
obj.parts=[piece,{...newPart("s2"),moment:"Comunión",shift:-3,sectionIndex:null}];
const code=exportCode(obj);
assert.match(code,/^SHALOM1-/);
assert.ok(!code.includes("Te adoramos"),"El código no incluye letras");
const decoded=importCode("Te comparto mi popurrí:\n"+code+"\nPégalo en SHALOM.");
assert.equal(decoded.title,"Adoración y alegría 🕊️");
assert.equal(decoded.kind,"popurri");
assert.deepEqual(decoded.parts.map(p=>[p.songId,p.sectionIndex,p.shift,p.moment]),
 [["s1",1,2,""],["s2",null,-3,"Comunión"]]);
assert.equal(importCode(exportCode({...obj,kind:"misa"})).kind,"misa");
assert.throws(()=>importCode(code.slice(0,-1)+(code.endsWith("0")?"1":"0")),/incompleto|modificado/);
assert.throws(()=>importCode("ABC1-SHALOM-OTHER"),/código de SHALOM/);
assert.throws(()=>exportCode({...obj,parts:[]}),/al menos un canto/);
assert.throws(()=>exportCode({...obj,parts:Array.from({length:31},()=>piece)}),/hasta 30/);
assert.throws(()=>importCode("A".repeat(20001)),/demasiado largo/);
const parsed=parseStore(JSON.stringify({version:1,collections:[{...col,entries:[obj]}]}));
assert.equal(parsed.collections[0].entries[0].parts[0].songId,"s1");
assert.equal(parsed.collections[0].coverPreset,"dove","Las colecciones 0.3.8 deben seguir funcionando");
const withPhoto=parseStore(JSON.stringify({version:1,collections:[{...col,coverPreset:"guitar",
 coverPhoto:"cover-a1b2-local.jpg",entries:[obj]}]}));
assert.equal(withPhoto.collections[0].coverPreset,"guitar");
assert.equal(withPhoto.collections[0].coverPhoto,"cover-a1b2-local.jpg");
assert.equal(parseStore(JSON.stringify({version:1,collections:[{...col,coverPhoto:"../../secret.jpg",entries:[]}]}))
 .collections[0].coverPhoto,null,"No permitir rutas arbitrarias del dispositivo");
assert.ok(!exportCode(obj).includes("cover-a1b2"),"El código compartido nunca debe incluir fotos");
assert.equal(parseStore("not-json").collections.length,0);
console.log("SHALOM: colecciones, fragmentos, misa/popurrí y códigos offline correctos.");

const customEntry={...obj,parts:[{...piece,notes:"Solo coro",cueOverride:{v:1,mode:"hide",j:[]}}]};
const customCode=exportCode(customEntry);assert.match(customCode,/^SHALOM2-/);
const customDecoded=importCode(customCode);
assert.equal(customDecoded.parts[0].notes,"Solo coro");assert.deepEqual(customDecoded.parts[0].cueOverride,{v:1,mode:"hide",j:[]});
assert.throws(()=>exportCode({...customEntry,parts:[{...piece,cueOverride:{v:1,mode:"bad",j:[]}}]}),/inválida/);

const withCapo={...obj,parts:[{...piece,capoId:"main"}]};
assert.equal(importCode(exportCode(withCapo)).parts[0].capoId,"main");
assert.equal(parseStore(JSON.stringify({version:1,collections:[{...col,entries:[withCapo]}]})).collections[0].entries[0].parts[0].capoId,"main");

const {parseSong}=require("../src/chords"),core=require("../src/studio-core"),codec=require("../src/studio-codec");
const localRows=parseSong(song.lyrics,0),cue={...core.lyricCueAnchor(localRows,1),action:"repeat",audience:"choir",text:"Dos veces"};
const customized={...piece,sectionIndex:null,sectionTitle:"",capoId:"main",notes:"Esperar",cueOverride:{v:1,mode:"append",j:codec.encodeLyricCues([cue]).j}};
for(const kind of ["misa","repertorio","popurri"]){
 const entry={...newEntry(kind,"Prueba"),parts:[customized,{...newPart(piece.songId),cueOverride:{v:1,mode:"hide",j:[]}}]};
 const imported=importCode(exportCode(entry));
 assert.notEqual(imported.parts[0].id,customized.id);
 assert.notEqual(imported.parts[0].id,imported.parts[1].id);
 const stripId=({id,...rest})=>rest;
 assert.deepEqual(imported.parts.map(stripId),entry.parts.map(stripId));
}
const longParts=Array.from({length:30},(_,i)=>({...newPart("s"+i),notes:"x".repeat(500)}));
assert.throws(()=>exportCode({...obj,parts:longParts}),/demasiado grande/);

const snapshotPart={...newPart("s1"),fragmentLyrics:"[Coro]\nC G\nTexto de prueba",fragmentTitle:"Fragmento de prueba"};
const snapshotEntry={...obj,parts:[snapshotPart]};
assert.equal(importCode(exportCode(snapshotEntry)).parts[0].fragmentLyrics,snapshotPart.fragmentLyrics);
assert.equal(resolvePart(song,snapshotPart).lyrics,snapshotPart.fragmentLyrics);
assert.throws(()=>exportCode({...snapshotEntry,parts:[{...snapshotPart,fragmentLyrics:"x".repeat(25001)}]}),/personalizado inválido/);
assert.throws(()=>exportCode({...snapshotEntry,parts:[{...snapshotPart,sectionIndex:1}]}),/personalizado inválido/);
