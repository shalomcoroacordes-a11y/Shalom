"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{execFileSync}=require("node:child_process");
const native=require("../native-chords.js"),window={};
vm.runInNewContext(fs.readFileSync("song-chords.js","utf8"),{window});
const web=window.ShalomChords;
assert.equal(fs.existsSync("details.js"),false,"Do not restore obsolete chord detail parser");
const self="tests/chord-engine-parity.cjs";
for(const name of execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0")){
 if(!name||name===self||! /\.(?:html|js|cjs|mjs|json|css|ya?ml)$/.test(name)||!fs.existsSync(name))continue;
 assert.doesNotMatch(fs.readFileSync(name,"utf8"),/\bdetails\.js\b|\bDetailModule\b/,"Retired module reference in "+name);
}
// Convert the web renderer's escaped markup into the same semantic row model
// used by native. This checks actual row content and column positions.
const decode=text=>text.replace(/&(amp|lt|gt|quot|#039);/g,(_,key)=>({amp:"&",lt:"<",gt:">",quot:'"', "#039":"'"}[key]));
function webRows(html){
 const rows=[];
 const pattern=/<span class="song-line(?: song-(?:stacked|inline)-chords)?"><span class="chord-line">([^<]*)<\/span><span class="lyric-line">([^<]*)<\/span><\/span>|<span class="song-(empty-line|section-label|standalone-chords|plain-line)">([^<]*)<\/span>/g;
 let consumed="";
 for(const m of html.matchAll(pattern)){
  consumed+=m[0];
  if(m[1]!==undefined){rows.push({kind:"chords",chordLine:decode(m[1]),lyricLine:decode(m[2])});continue;}
  const kind={"empty-line":"space","section-label":"section","standalone-chords":"chordsOnly","plain-line":"lyric"}[m[3]];
  rows.push(kind==="space"?{kind}:{kind,text:decode(m[4])});
 }
 assert.equal(consumed,html,"Every rendered row must be recognized");
 return rows;
}
const samples=["","[Coro]\nC      G/B\nTu amor","(C)Hola (Am)Señor","[Verso]\nF#   D#m\n   (G)Letra","(No es un acorde)","Dbmaj7  Ab/C\nTexto con acentos áéíóú","C  G\nD  A\n","C\tG\r\nTexto\r\n\r\n[Puente]","Texto < & >","G  D\n"+"palabra ".repeat(25),"(C)(G)Hola","(C G)Texto","C  G\n(D)Una palabra","[Verso & coro]\n\n\nFin","(Cmaj7)Texto (Bb7/Eb)final","(G/B) <texto> & \"comillas\" 'simples'","(C)\n[Puente]\n(F#m) (A)\nTexto","Cadd9 Dsus4 Bdim7 C+\nTexto","C\rG\rLetra","Am\tF\nUna canción"];
let checked=0;
for(let shift=-12;shift<=12;shift++)for(const source of samples){
 const rows=webRows(web.render(source,{transpose:chord=>native.transposeOne(chord,shift)}));
 assert.deepEqual(rows,native.parseSong(source,shift),JSON.stringify({source,shift}));
 checked++;
}
console.log("Web/native chord parity: "+checked+" semantic row comparisons, including exact spaces and escaped text; no legacy detail module.");
