const assert=require("node:assert/strict");
const {sections,transposeChord,normalizeParts,html,slug,renderPartsHTML}=require("../../medley-core");
const {buildCatalog}=require("../src/catalog");
const lyrics="[Estrofa 1]\nG        D\nEn el camino\n\n[Coro]\nC          G\nTe alabamos Señor";
const pieces=sections(lyrics);
assert.deepEqual(pieces.map(p=>p.title),["Estrofa 1","Coro"]);
assert.ok(pieces[1].text.includes("Te alabamos Señor"));
assert.ok(!pieces[1].text.includes("En el camino"));
assert.equal(transposeChord("G/B",2),"A/C#");
assert.equal(transposeChord("C",-1),"B");
assert.equal(transposeChord("G",22),"F");
assert.equal(slug("Popurrí María"),"popurri-maria");
assert.equal(html('<script>alert(1)</script>'),"&lt;script&gt;alert(1)&lt;/script&gt;");
const part={id:"a",song_id:"song-1",song_title:"Un canto",title:"Coro",tone:"G",lyrics:pieces[1].text,shift:2};
const safe=normalizeParts([part]);
assert.equal(safe.length,1);
assert.equal(safe[0].lyrics,pieces[1].text);
assert.throws(()=>normalizeParts([]),/entre 1 y 30/);
assert.throws(()=>normalizeParts([{song_id:"x",lyrics:""}]),/debe tener un canto/);
assert.ok(renderPartsHTML([{...part,title:'<img src=x onerror=alert(1)>'}],0).includes("&lt;img"));
const rows=buildCatalog({medleys:[
 {id:"1",title:"Borrador secreto",is_published:false,parts:[part]},
 {id:"2",title:"Popurrí publicado",is_published:true,parts:[part]}
]});
assert.deepEqual(rows.medleys.map(m=>m.title),["Popurrí publicado"]);
console.log("SHALOM: popurrís, secciones, transposición y privacidad verificados.");