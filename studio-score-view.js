/* Studio visual presentation: never regenerate persisted timing anchor IDs. */
(function(root){
 "use strict";
 function matchAnchors(saved,visual,transpose){
  if(saved.length!==visual.length||saved.some((a,i)=>a.chord!==visual[i].chord))return null;
  return visual.map((a,i)=>({position:a.position,chord:transpose(a.chord),id:saved[i].id}));
 }
 async function enhance(score,source,anchors,transpose){
  const rows=Array.from(score.children);
  if(!root.ShalomScoreReader||!await root.ShalomScoreReader.loadFont()||
     rows.length!==score.children.length||rows.some((row,i)=>row!==score.children[i])||
     !score.getClientRects().length)return 0;
  const template=document.createElement("template");
  template.innerHTML=root.ShalomChords.render(source,{includeAnchors:true});
  const original=Array.from(template.content.children);
  if(original.length!==rows.length)return 0;
  let count=0;
  for(let line=0;line<rows.length;line++){
   const row=rows[line],saved=anchors.filter(a=>a.line===line),markup=original[line];
   if(!markup.dataset.chordAnchors||row.querySelector(".score-proportional"))continue;
   // Mixed rows with incompatible ordering keep their original display.
   const mapped=matchAnchors(saved,JSON.parse(markup.dataset.chordAnchors),transpose);
   if(!mapped||!mapped.length)continue;
   markup.dataset.chordAnchors=JSON.stringify(mapped);
   const wrapper=root.ShalomScoreReader.buildMarkup(markup.outerHTML);
   const layer=wrapper.querySelector(".score-chords"),notes=Array.from(layer.children);
   if(notes.length!==mapped.length)continue;
   layer.classList.add("chord-line");layer.dataset.chordTokens="1";
   wrapper.querySelector(".score-lyric").classList.add("lyric-line");
   notes.forEach((note,i)=>{
    note.classList.add("chord-token");note.dataset.studioAnchorId=mapped[i].id;
    if(score.dataset.activeAnchor===mapped[i].id)note.classList.add("active-chord");
   });
   const before=Array.from(row.childNodes);
   row.replaceChildren(wrapper);
   try{root.ShalomScoreReader.relayout(wrapper);count++;}
   catch(error){row.replaceChildren(...before);console.warn("SHALOM Studio retained original row",error);}
  }
  return count;
 }
 root.ShalomStudioScoreView=Object.freeze({matchAnchors,enhance});
})(window);
