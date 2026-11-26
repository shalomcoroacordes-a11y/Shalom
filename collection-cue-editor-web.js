/* Collection-only editor. The caller saves the collection, never the song. */
(()=>{
"use strict";
const core=window.ShalomStudio,codec=window.ShalomStudioCodec,reader=window.ShalomReaderCues;
function cueNode(c,prefix=""){const look=core.cueAppearance(c.action),n=document.createElement("p");n.className="song-reader-cue";n.style.setProperty("--cue-dark",look.dark);n.style.setProperty("--cue-light",look.light);n.textContent=prefix+look.symbol+" "+core.cueText(c);return n;}
function open({lyrics,initial,onSave}){
 const rows=window.ShalomChords.parseRows(lyrics),dialog=document.createElement("dialog");
 dialog.className="studio-collection-dialog";dialog.setAttribute("aria-label","Indicaciones de este canto");
 let mode=initial?.mode||"inherit",cues=initial?codec.decodeLyricCues({v:1,k:"lyrics",j:initial.j}):[],start=null,end=null,editing=null,action="note",audience="all",detail="",error="";
 const make=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const button=(title,fn)=>{const n=make("button",title);n.type="button";n.className="song-btn secondary";n.onclick=fn;return n;};
 const select=(title,choices,value,fn)=>{const l=make("label",title),s=make("select");for(const [id,name] of choices){const o=make("option",name);o.value=id;s.append(o);}s.value=value;s.onchange=()=>fn(s.value);l.append(s);return l;};
 const clear=()=>{start=end=editing=null;detail="";error="";};
 function render(){
  dialog.replaceChildren(make("h3","Indicaciones de este canto"),make("p","Solo se aplican a esta aparición cuando guardes la colección oficial."));
  dialog.append(select("Comportamiento",[["inherit","Usar originales"],["append","Agregar propias"],["replace","Reemplazar"],["hide","Ocultar"]],mode,v=>{mode=v;clear();render();}));
  if(mode==="append"||mode==="replace"){
   dialog.append(make("p","Toca una frase o dos para seleccionar el fragmento."));
   for(const [i,row] of rows.entries()){
    const phrase=row.kind==="chords"?row.lyricLine:row.kind==="lyric"?row.text:"";
    if(row.kind==="section")dialog.append(make("h4",row.text));
    if(phrase.trim()){const b=button(phrase,()=>{if(start===null||end!==null){start=i;end=null;}else{end=Math.max(start,i);start=Math.min(start,i);}render();});b.setAttribute("aria-pressed",String(start!==null&&i>=start&&i<=(end??start)));dialog.append(b);}
    for(const cue of cues.filter(c=>c.end===i&&core.validLyricCue(rows,c))){dialog.append(cueNode(cue));}
   }
   dialog.append(select("Acción",Object.entries(core.cueActions),action,v=>action=v),select("Para quién",Object.entries(core.cueAudiences),audience,v=>audience=v));
   const input=make("input");input.maxLength=160;input.placeholder="Detalle de la indicación";input.value=detail;input.setAttribute("aria-label","Detalle de la indicación");input.oninput=()=>detail=input.value;
   dialog.append(input,button(editing===null?"+ Agregar indicación":"Actualizar indicación",()=>{try{if(start===null)throw Error("Selecciona una frase.");const cue={...core.lyricCueAnchor(rows,start,end??start),action,audience,text:detail};cues=core.normalizeLyricCues(editing===null?[...cues,cue]:cues.map((c,i)=>i===editing?cue:c));clear();}catch(e){error=e.message;}render();}),button("Cancelar selección",()=>{clear();render();}));
   cues.forEach((c,i)=>{dialog.append(cueNode(c,core.validLyricCue(rows,c)?"":"Revisar frase · "),button("Editar indicación "+(i+1),()=>{editing=i;start=core.validLyricCue(rows,c)?c.start:null;end=core.validLyricCue(rows,c)?c.end:null;action=c.action;audience=c.audience;detail=c.text;render();}),button("Quitar indicación "+(i+1),()=>{cues=cues.filter((_,k)=>i!==k);clear();render();}));});
  }
  const status=make("p",error);status.setAttribute("role","alert");dialog.append(status,button("Guardar indicaciones",()=>{try{if(["append","replace"].includes(mode)&&(start!==null||editing!==null))throw Error("Agrega o cancela la indicación pendiente.");const next=reader.validateOverride(rows,mode==="inherit"?null:{v:1,mode,j:codec.encodeLyricCues(mode==="hide"?[]:cues).j});onSave(next);dialog.close();}catch(e){error=e.message;render();}}),button("Cancelar",()=>dialog.close()));
 }
 dialog.addEventListener("close",()=>dialog.remove(),{once:true});document.body.append(dialog);render();dialog.showModal();
}
window.ShalomCollectionCueEditor=Object.freeze({open});
})();
