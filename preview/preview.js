"use strict";
(function(){
 const $=id=>document.getElementById(id);
 const samples=[
 {title:"Canto de bienvenida",moment:"Entrada",source:"[Verso]\n(C)Hoy nos reunimos (G)con alegría\n(F)Caminamos juntos (C)hacia la luz\n\n[Coro]\n(C)Una voz, (G/B)un corazón\n(Am)Cantamos con (F)esperanza"},
 {title:"Caminamos en paz",moment:"Comunión",source:"[Verso]\nC    G       Am\nDanos paz en el camino\n(F)Que florezca (G)la amistad\n\n[Coro]\n(Cmaj7)(G/B)Mi (Am)vida canta\n(Dm7)Juntos hacia (G)la paz"},
 {title:"Gracias por este día",moment:"Salida",source:"[Coro]\n(C)Gracias por (F)cada día\n(G)Gracias por (C)compartir"}
 ];
 const labels={canto:"Canto individual",misa:"Misa de demostración",repertorio:"Repertorio de demostración",ensayo:"Ensayo de demostración",popurri:"Popurrí de demostración",admin:"Vista previa de Admin"};
 const notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],flat={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
 let mode="canto",size=19,shift=0,section=0,bySection=false,legacy=false,ready=false;
 function transpose(c,delta){return c.replace(/(^|\/)([A-G](?:#|b)?)/g,(_,prefix,n)=>prefix+notes[(notes.indexOf(flat[n]||n)+delta+120)%12]);}
 function groups(){
  const songs=mode==="admin"?[{...samples[0],source:$("source").value}]:mode==="canto"?[samples[0]]:samples;
  if(!bySection)return songs;
  return songs.flatMap(song=>song.source.split(/(?=^\[[^\]\n]+\])/m).filter(s=>s.trim()).map(source=>({...song,source})));
 }
 function render(){
  const parts=groups();section=Math.max(0,Math.min(section,parts.length-1));const capo=Number($("capo").value),delta=shift-capo;
  $("heading").textContent=labels[mode];$("meta").textContent="Tono "+transpose("C",shift)+(capo?" · Capo "+capo+" · Figuras "+transpose("C",delta):"")+" · "+size+" px";
  $("tone").textContent=transpose("C",shift);$("edit").hidden=mode!=="admin";$("sectionNav").hidden=!bySection;
  $("progress").textContent=(section+1)+" / "+parts.length;$("prev").disabled=section===0;$("next").disabled=section>=parts.length-1;
  $("scores").replaceChildren();$("index").replaceChildren();
  (bySection?parts.slice(section,section+1):parts).forEach((song,i)=>{
   const article=document.createElement("article");article.id="preview-song-"+i;
   const title=document.createElement("h2");title.textContent=song.title;const meta=document.createElement("p");meta.textContent=mode==="misa"?song.moment:"Tono "+transpose("C",shift);
   const target=document.createElement("div");target.style.fontSize=size+"px";article.append(title,meta,target);$("scores").append(article);
   const options={transpose:c=>transpose(c,delta)};
   if(ready&&!legacy)window.ShalomScoreReader.render(target,song.source,options);else{target.className="legacy";target.innerHTML=window.ShalomChords.render(song.source,options);}
   if(!bySection&&parts.length>1){const link=document.createElement("a");link.href="#"+article.id;link.textContent=(i+1)+". "+song.title;$("index").append(link);}
  });
  $("status").textContent=ready?(legacy?"Comparación: tipografía anterior":"Inter local verificada · lector proporcional"):"Inter no disponible · lector alternativo";
 }
 $("source").value=samples[0].source;
 $("modes").addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(!b)return;mode=b.dataset.mode;section=0;for(const el of $("modes").querySelectorAll("button"))el.setAttribute("aria-pressed",String(el===b));render();});
 function toggle(id,fn){$(id).onclick=()=>{$(id).setAttribute("aria-pressed",String(fn()));render();};}
 $("source").oninput=render;$("capo").onchange=render;
 $("fontDown").onclick=()=>{size=Math.max(10,size-1);render();};$("fontUp").onclick=()=>{size=Math.min(46,size+1);render();};
 $("toneDown").onclick=()=>{shift=Math.max(-12,shift-1);render();};$("toneUp").onclick=()=>{shift=Math.min(12,shift+1);render();};
 toggle("reading",()=>{bySection=!bySection;section=0;return bySection;});toggle("hide",()=>document.body.classList.toggle("song-hide-chords"));toggle("compare",()=>legacy=!legacy);
 $("prev").onclick=()=>{section--;render();};$("next").onclick=()=>{section++;render();};
 $("full").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $("reader").requestFullscreen();}catch(_){$("status").textContent="Pantalla completa no disponible en este navegador";}};
 $("reset").onclick=()=>{size=19;shift=0;section=0;bySection=false;legacy=false;$("capo").value="0";document.body.classList.remove("song-hide-chords");for(const id of ["reading","hide","compare"])$(id).setAttribute("aria-pressed","false");render();};
 window.ShalomScoreReader.loadFont().then(value=>{ready=value;render();});
})();
