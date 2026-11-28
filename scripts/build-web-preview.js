"use strict";
// Package only public, isolated preview files. Never include the production app or credentials.
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const {assets,verify}=require("./prepare-inter-font");
const target=path.resolve(process.argv[2]||path.join(root,"preview-dist"));
if(target===root||!target.startsWith(root+path.sep))throw Error("Preview output must be a separate folder inside the repository");
for(const asset of assets.slice(0,2))verify(fs.readFileSync(path.join(root,asset.target)),asset);
const files=["preview/index.html","preview/preview.js","preview/preview.css","style.css","score-reader.css","score-reader.js","score-layout.js","song-chords.js","assets/fonts/inter.css","assets/fonts/InterVariable.woff2","assets/fonts/Inter-OFL.txt"];
for(const file of files){const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
fs.writeFileSync(path.join(target,"index.html"),'<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=preview/index.html"><title>SHALOM Preview</title><a href="preview/index.html">Abrir SHALOM Preview</a></html>');
console.log("Isolated SHALOM Preview package generated: "+target);
