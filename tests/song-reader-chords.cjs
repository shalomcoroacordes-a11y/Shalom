"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("cancion.js","utf8"),canonical=fs.readFileSync("song-chords.js","utf8"),page=fs.readFileSync("cancion.html","utf8");
const header=source.slice(source.indexOf("let currentSong ="),source.indexOf("function setSongError("));
const start=source.indexOf("function renderChordLyrics("),end=source.indexOf("function renderControls(",start);
assert.ok(start>=0&&end>start);
assert.doesNotMatch(source,/const isChordToken|const isChordGroup|const chordGroup|let chordLine =/);
assert.ok(page.indexOf('src="song-chords.js?v=5"')>=0&&page.indexOf('src="song-chords.js?v=5"')<page.indexOf('src="cancion.js'));
const nodes={"#songLyrics":{},"#transposeStatus":{}},window={},context={window,$:q=>nodes[q]||null};
vm.createContext(context);vm.runInContext(canonical,context);
vm.runInContext(header+source.slice(start,end)+`
globalThis.draw=(song,shift,position,key)=>{
 currentSong=song;transpose=shift;capoShift=capoOffset(position,key);
 capoLabel=position?"Capo "+position:"Sin capo";renderChordLyrics();
};`,context);
// The former normal path validated each token before transposition. The shared
// parser already performs this check and passes only validated, unwrapped tokens.
const notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const flats={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
const token=/^[A-G](?:#|b)?(?:maj(?:7|9|11|13)?|m(?:maj7|[0-9]*)?|min(?:[0-9]*)?|sus[24]?|add\d+|dim7?|aug|\+|-|[0-9]*)?(?:\/[A-G](?:#|b)?)?$/;
const oldMove=(value,shift)=>{const i=notes.indexOf(flats[value]||value);return i<0?value:notes[(i+shift+120)%12]};
const oldChord=(value,shift)=>String(value||"").split(/(\s+)/).map(v=>token.test(v.trim())?v.replace(/^([A-G](?:#|b)?)(.*)$/,(_,root,rest)=>oldMove(root,shift)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+oldMove(bass,shift))):v).join("");
const samples=["[Coro]\nC   G/B\nDios es amor","(Db)Hola (F#m7)Señor","C  G\n(D)Una palabra","[Puente]\n\nTexto (repetir)","C\tG\r\nTexto\r\n\r\nFin","<texto> & amor","Cmaj7 Dsus4 Fadd9 Bb7/Eb\nCanto","(C)(G)Hola","Am  F\nG  C","(C G)Texto"];
for(const lyrics of samples)for(let shift=-12;shift<=12;shift++)for(const [position,key,offset] of [[0,"",0],[2,"",-2],[2,"Bb",-2],[3,"A",-3]]){
 context.draw({tone:"C",lyrics},shift,position,key);
 // With explicit figures, the existing difference is figure index minus original (Bb=10, A=9).
 const actualOffset=key==="Bb"?10:key==="A"?9:offset;
 assert.equal(nodes["#songLyrics"].innerHTML,window.ShalomChords.render(lyrics,{transpose:v=>oldChord(v,shift+actualOffset)}));
 assert.equal(nodes["#songLyrics"].className,"lyrics-block");
}
context.draw({tone:"C",lyrics:"(C)Hola"},0,0,"");
assert.equal(nodes["#transposeStatus"].textContent,"Tono original · Sin capo");
delete window.ShalomChords;
context.draw({tone:"C",lyrics:"<img src=x onerror=alert(1)>\n(C)Hola"},3,2,"");
assert.equal(nodes["#songLyrics"].textContent,"<img src=x onerror=alert(1)>\n(C)Hola");
assert.match(nodes["#transposeStatus"].textContent,/Intérprete no disponible/);
console.log("Canonical song reader: 1000 exact normal-path comparisons, original status and safe text-only fallback.");
