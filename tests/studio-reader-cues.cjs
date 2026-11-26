"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core"),codec=require("../studio-codec"),reader=require("../studio-reader-cues"),parser=require("../song-chords");
const source="[Verso]\nC    G\nHola mundo\n[Coro]\nAm    F\nOtra línea";
const rows=parser.parseRows(source),anchors=C.anchorsFromRows(rows);
const config=C.setCues(C.draft(anchors),[{index:0,ticks:0,action:"start",audience:"solo",text:"Suave"},{index:2,ticks:0,action:"repeat",audience:"choir",text:"Dos veces <3"}]);
const arrangement=codec.encode(anchors,config),shifted=parser.parseRows(source,()=>"D");
const decorated=reader.decorate(rows,arrangement,shifted);
assert.deepEqual(decorated.filter(r=>r.kind!=="cue"),shifted);
assert.deepEqual(decorated.map(r=>r.kind),["section","cue","chords","section","cue","chords"]);
assert.match(decorated[1].text,/Iniciar · Solista · Suave/);
assert.match(decorated[4].text,/Repetir · Coro · Dos veces <3/);
assert.equal(reader.decorate(rows,{...arrangement,s:"bad"},shifted),shifted);
assert.equal(reader.decorate(rows,{...arrangement,i:[]},shifted),shifted);
assert.equal(reader.decorate(rows,{...arrangement,i:[[999,0,"start","solo",""]]},shifted),shifted);
console.log("Static cues: canonical anchor mapping, transposition, stale and malformed rejection.");

const native=require("../mobile/src/studio-reader-cues");
assert.deepEqual(native.decorate(rows,arrangement,shifted),decorated);
const print=require("../mobile/src/song-print");
const song={id:1,lyrics:source,_studio:arrangement};
assert.match(print.buildPrintableSong(song),/Dos veces &lt;3/);
assert.doesNotMatch(print.buildPrintableSong(song,0,false),/Dos veces/);
const html=require("../mobile/src/web-score-html");
assert.match(html.scoreMarkup(decorated),/Dos veces &lt;3/);
assert.doesNotMatch(html.scoreMarkup(shifted),/Dos veces/);
console.log("Native cue projection, escaping and optional printing verified.");

// Exercise the real browser renderer without starting Studio playback.
const fs=require("node:fs"),vm=require("node:vm");
const web={};web.window=web;vm.createContext(web);
for(const file of ["song-chords.js","studio-core.js","studio-codec.js","studio-reader-cues.js"])vm.runInContext(fs.readFileSync(file,"utf8"),web);
const markup=web.ShalomChords.render(source,{arrangement,transpose:()=>"D"});
assert.match(markup,/song-reader-cue[^>]*>Compás 1 · Iniciar · Solista · Suave/);
assert.match(markup,/Dos veces &lt;3/);
assert.equal(markup.replace(/<span class="song-reader-cue">[^<]*<\/span>/g,""),web.ShalomChords.render(source,{transpose:()=>"D"}));
assert.doesNotMatch(web.ShalomChords.render(source,{arrangement:{...arrangement,s:"bad"}}),/song-reader-cue/);
console.log("Browser public reader: cue order, safe escaping, unchanged chord markup and stale arrangement rejection.");
