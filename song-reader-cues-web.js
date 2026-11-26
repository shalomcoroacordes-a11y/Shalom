/* Optional reader control, separate from the musical score and print content. */
(()=>{
 function mount(target,visible,onChange){
  const id=target.id+"CueToggle";
  let button=document.getElementById(id);
  if(!target.querySelector(".song-reader-cue")){button?.remove();target.classList.remove("song-reader-cues-hidden");return;}
  if(!button){
   button=document.createElement("button");
   button.id=id;button.type="button";button.className="song-reader-cue-toggle small-btn";
   target.before(button);
  }
  button.textContent=visible?"Ocultar indicaciones":"Mostrar indicaciones";
  button.setAttribute("aria-pressed",String(visible));
  target.classList.toggle("song-reader-cues-hidden",!visible);
  button.onclick=()=>onChange(!visible);
 }
 window.ShalomReaderCueControls=Object.freeze({mount});
})();
