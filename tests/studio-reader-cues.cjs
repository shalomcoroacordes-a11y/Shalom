"use strict";
const assert=require("node:assert/strict"),C=require("../studio-core"),codec=require("../studio-codec"),reader=require("../studio-reader-cues"),parser=require("../song-chords");
const source="[Verso]\nC    G\nHola mundo\n[Coro]\nAm    F\nOtra línea";
const rows=parser.parseRows(source),anchors=C.anchorsFromRows(rows);
const config=C.setCues(C.draft(anchors),[{index:0,ticks:0,action:"start",audience:"solo",text:"Suave"},{index:2,ticks:0,action:"repeat",audience:"choir",text:"Dos veces <3"}]);
const arrangement=codec.encode(anchors,config),shifted=parser.parseRows(source,()=>"D");
const decorated=reader.decorate(rows,arrangement,shifted);
assert.deepEqual(decorated.filter(r=>r.kind!=="cue"),shifted);
assert.deepEqual(decorated.map(r=>r.kind),["section","chords","cue","section","chords","cue"]);
assert.match(decorated[2].text,/Iniciar · Solista · Suave/);
assert.match(decorated[5].text,/Repetir · Coro · Dos veces <3/);
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
assert.match(markup,/song-reader-cue[^>]*>Iniciar · Solista · Suave/);
assert.match(markup,/Dos veces &lt;3/);
assert.equal(markup.replace(/<span class="song-reader-cue">[^<]*<\/span>/g,""),web.ShalomChords.render(source,{transpose:()=>"D"}));
assert.doesNotMatch(web.ShalomChords.render(source,{arrangement:{...arrangement,s:"bad"}}),/song-reader-cue/);
console.log("Browser public reader: cue order, safe escaping, unchanged chord markup and stale arrangement rejection.");

const mixed=parser.parseRows("[Coro]\nC    G\nPrimera frase\nSin acordes aquí\nÚltima frase\n[Verso]\nAm\nOtra frase");
const mixedAnchors=C.anchorsFromRows(mixed);
const base=C.draft(mixedAnchors);
const cue={...C.lyricCueAnchor(mixed,1,2),action:"repeat",audience:"all",text:"2 veces"};
const standalone={...C.lyricCueAnchor(mixed,3),action:"note",audience:"choir",text:"Suave"};
const next=C.setLyricCues(base,mixed,[cue,standalone]);
const packed=codec.encode(mixedAnchors,next);
assert.deepEqual(codec.decode(mixedAnchors,packed).lyricCues,next.lyricCues);
assert.deepEqual(C.compile(mixedAnchors,next),C.compile(mixedAnchors,base));
assert.deepEqual(reader.decorate(mixed,packed).map(r=>r.kind),["section","chords","lyric","cue","lyric","cue","section","chords"]);
assert.equal(reader.decorate(mixed,packed)[3].text,"Repetir · 2 veces");
const changed=mixed.map((r,i)=>i===2?{...r,text:"Otra letra"}:r);
assert.equal(reader.decorate(changed,packed).filter(r=>r.kind==="cue").length,1);
assert.throws(()=>C.setLyricCues(base,changed,[cue]),/letra cambió/);
assert.throws(()=>C.lyricCueAnchor(mixed,0),/Selecciona/);
assert.throws(()=>C.setLyricCues(base,mixed,[cue,cue]),/duplicada/);
assert.equal(codec.encode(mixedAnchors,base).j,undefined);
assert.deepEqual(native.decorate(mixed,packed),reader.decorate(mixed,packed));
console.log("Visual lyric cues: ranges, no-chord lines, below-selection, unchanged audio, stale-range rejection.");

const aCapella="[Coro]\nCantemos juntos\nSin guitarra";
const vocalRows=parser.parseRows(aCapella);
assert.equal(C.anchorsFromRows(vocalRows).length,0);
const vocalCue={...C.lyricCueAnchor(vocalRows,1,2),action:"repeat",audience:"all",text:"2 veces"};
const vocalRecord=codec.encodeLyricCues([vocalCue]);
assert.deepEqual(Object.keys(vocalRecord),["v","k","j"]);
assert.deepEqual(codec.decodeLyricCues(vocalRecord),[vocalCue]);
assert.throws(()=>codec.decode([],vocalRecord),/incompatible/);
assert.throws(()=>codec.decodeLyricCues({...vocalRecord,c:[]}),/inválidas/);
assert.deepEqual(reader.decorate(vocalRows,vocalRecord).map(r=>r.kind),["section","lyric","lyric","cue"]);
assert.deepEqual(native.decorate(vocalRows,vocalRecord),reader.decorate(vocalRows,vocalRecord));
assert.match(web.ShalomChords.render(aCapella,{arrangement:vocalRecord}),/Sin guitarra<\/span><span class="song-reader-cue">Repetir · 2 veces/);
assert.equal(require("../studio-collections").resolve({id:"v",updated_at:"r",lyrics:aCapella,_studio:vocalRecord}).ready,false);
assert.equal(require("../mobile/src/studio-collections").resolve({id:"v",updated_at:"r",lyrics:aCapella,_studio:vocalRecord}).ready,false);
assert.deepEqual(reader.decorate(vocalRows,{...vocalRecord,j:[["bad"]]}),vocalRows);
console.log("Lyric-only record: no invented musical accompaniment, public web and native projection, malformed record rejection, no guitar practice.");

 // Verify the actual native public song screen (not Studio) with a lyric-only record.
 const sourceUI=fs.readFileSync("mobile/src/music-readers-ui.js","utf8");
 const dependencies={
  react:{createElement:(type,props,...children)=>({type,props,children}),useState:initial=>[initial,()=>{}]},
  "react-native":{View:"View",Text:"Text",Pressable:"Pressable",Image:"Image",Alert:{alert(){}}},
  "./chords":require("../mobile/src/chords"),"./catalog":{names:()=>""},"./favorites":{hasFavorite:()=>false},
  "./song-capo-core":{capoSelection:()=>({choices:[{id:"none"}],chosen:{id:"none"},offset:0})},
  "./score-zoom":{clampReaderFont:x=>x},"./repertoire-ui":{},"./studio-collections":require("../mobile/src/studio-collections"),
  "./studio-reader-cues":native
 };
 const uiModule={exports:{}};
 new Function("require","module",sourceUI)(name=>{assert.ok(name in dependencies,name);return dependencies[name]},uiModule);
 let displayed,visibility=true;
 const publicProps={song:{id:"v",title:"Canto",lyrics:aCapella,_studio:vocalRecord},S:{},label:(text)=>text,type:()=>"católico",Chip:"Chip",capo:"none",transpose:0,likedIds:[],toggleLike(){},renderToneStepper(){},setReaderFont(){},capoExpanded:false,setCapoExpanded(){},setCapo(){},renderAlignedScoreRows(rows){displayed=rows;return null},readerFont:16,setShowReaderCues(fn){visibility=fn(visibility);}};
 const tree=uiModule.exports.SongReader(publicProps);
 assert.equal(displayed.at(-1).text,"Repetir · 2 veces");
 const flatten=n=>n&&typeof n==="object"&&n.children?[n,...n.children.flatMap(flatten)]:[];
 const toggle=flatten(tree).find(n=>n.children.includes("Ocultar indicaciones"));
 assert.ok(toggle);toggle.props.onPress();assert.equal(visibility,false);
 uiModule.exports.SongReader({...publicProps,showReaderCues:visibility});
 assert.equal(displayed.some(r=>r.kind==="cue"),false);
 console.log("Normal native public song reader: lyric-only cue visible by default, hide control works without opening Studio.");

const originalSnapshot=JSON.stringify(vocalRecord),localCue={...vocalCue,action:"note",audience:"choir",text:"Esperar"};
const override={v:1,mode:"append",j:codec.encodeLyricCues([localCue]).j};
const visible=(mode)=>reader.decorateCollection(vocalRows,vocalRecord,{...override,mode,j:mode==="hide"?[]:override.j}).filter(r=>r.kind==="cue").map(r=>r.text);
assert.deepEqual(visible("append"),["Repetir · 2 veces","Indicación · Coro · Esperar"]);
assert.deepEqual(visible("replace"),["Indicación · Coro · Esperar"]);
assert.deepEqual(visible("hide"),[]);
assert.deepEqual(reader.decorateCollection(vocalRows,vocalRecord,null),reader.decorate(vocalRows,vocalRecord));
assert.deepEqual(reader.decorateCollection(vocalRows,vocalRecord,{v:1,mode:"bad"}),reader.decorate(vocalRows,vocalRecord));
assert.equal(JSON.stringify(vocalRecord),originalSnapshot);
assert.deepEqual(native.decorateCollection(vocalRows,vocalRecord,override),reader.decorateCollection(vocalRows,vocalRecord,override));
console.log("Collection overrides: inherit, append, replace and hide without modifying the original.");
