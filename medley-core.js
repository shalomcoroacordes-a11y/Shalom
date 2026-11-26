/* Funciones compartidas entre el editor y el lector de popurrís SHALOM. */
(function (root, make) {
  const api = make();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ShalomMedleys = api;
})(typeof window !== "undefined" ? window : null, function () {
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLATS = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
  const html = text => String(text ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const slug = text => String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140)||"popurri";
  const clampShift = n => Math.max(-11,Math.min(11,Number.isFinite(Number(n))?Math.trunc(Number(n)):0));
  function transposeChord(value, semitones=0) {
    const move = note => {
      const i=NOTES.indexOf(FLATS[note]||note);
      return i<0?note:NOTES[((i+Math.trunc(Number(semitones)||0))%12+12)%12];
    };
    return String(value||"").replace(/^([A-G](?:#|b)?)(.*)$/, (_,n,rest)=>
      move(n)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+move(bass)));
  }
  function sections(lyrics) {
    const lines=String(lyrics||"").replace(/\r\n?/g,"\n").split("\n");
    const out=[];
    let title="Inicio",block=[];
    const flush=()=>{if(block.join("").trim())out.push({index:out.length,title,text:block.join("\n").replace(/^\\n+|\\n+$/g,"")});block=[]};
    for(const line of lines) {
      const heading=line.trim().match(/^\[([^\]]+)\]$/);
      if(heading){flush();title=heading[1].trim();block.push(line);}
      else block.push(line);
    }
    flush();
    return out.length?out:[{index:0,title:"Canto completo",text:String(lyrics||"").trim()}];
  }
  function validateGap(value){if(!Number.isInteger(value)||value<0||value>10000)throw Error("La pausa de Studio debe ser de 0 a 10000 ms.");return value;}
  function normalizeParts(parts) {
    if(!Array.isArray(parts))throw new Error("Los fragmentos del popurrí no son válidos.");
    if(parts.length<1||parts.length>30)throw new Error("Agrega entre 1 y 30 fragmentos al popurrí.");
    return parts.map((part,index)=>{
      const lyrics=String(part.lyrics||"").replace(/^\\n+|\\n+$/g,"");
      const song_id=String(part.song_id||"");
      if(!lyrics.trim()||lyrics.length>25000||!song_id)throw new Error("El fragmento "+(index+1)+" debe tener un canto y una letra.");
      if(part.capo_id!=null&&(typeof part.capo_id!=="string"||!/^[a-zA-Z0-9_-]{1,128}$/.test(part.capo_id)))throw Error("Capo del fragmento inválido.");
      return {
        ...(part.capo_id&&part.capo_id!=="none"?{capo_id:part.capo_id}:{}),
        ...(part.cue_override!=null?{cue_override:(typeof module==="object"&&module.exports?require("./studio-reader-cues"):window.ShalomReaderCues).validateOverride((typeof module==="object"&&module.exports?require("./song-chords"):window.ShalomChords).parseRows(lyrics),part.cue_override)}:{}),
        id:String(part.id||("parte-"+index)).slice(0,100),
        song_id,
        song_title:String(part.song_title||"Canto").slice(0,160),
        title:String(part.title||part.song_title||"Canto").slice(0,160),
        tone:String(part.tone||"").slice(0,24),
        lyrics,
        shift:clampShift(part.shift),
        ...(part.studio_gap_ms!==undefined&&part.studio_gap_ms!==null?{studio_gap_ms:validateGap(part.studio_gap_ms)}:{})
      };
    });
  }
  function renderPartsHTML(parts, globalShift, capo=0, arrangementFor=()=>null) {
    if(!Array.isArray(parts))return "";
    return parts.map((p,i)=>'<section class="medley-song">'+
      '<div class="medley-song-head"><span class="medley-step">'+(i+1)+'</span><h3>'+html(p.title||p.song_title||"Canto")+'</h3><span class="medley-song-tone">'+html(p.tone||"")+'</span></div>'+
      '<div class="admin-preview-lyrics medley-lyrics">'+(typeof window!=="undefined" && window.ShalomChords
        ? window.ShalomChords.render(p.lyrics||"",{arrangement:arrangementFor(p),cueOverride:p.cue_override,transpose:chord=>transposeChord(chord,clampShift(p.shift)+clampShift(globalShift)-Math.max(0,Math.min(12,Number(capo)||0)))})
        : html(p.lyrics||""))+'</div>'+
      (p.song_id?'<a class="medley-original-link" href="cancion.html?id='+encodeURIComponent(p.song_id)+'">Ver canto original</a>':"")+
      '</section>').join("");
  }
  return {html,slug,clampShift,transposeChord,sections,normalizeParts,renderPartsHTML};
});