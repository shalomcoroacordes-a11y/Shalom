/* Página pública: sólo repertorios publicados y cantos actuales de Supabase. */
(()=>{
 const db=window.supabaseClient,R=window.ShalomRepertoires;
 const $=id=>document.getElementById(id);
 const esc=R.html;
 let rows=[],current=null,songs=new Map(),position=0,loading=false;
 const typeName=kind=>kind==="misa"?"Misa":"Ensayo";
 const friendlyDate=v=>R.formatDate(v);
 const menu=$("menuToggle"),nav=$("navMenu");
 menu?.addEventListener("click",()=>{const open=nav?.classList.toggle("open");menu.setAttribute("aria-expanded",String(!!open));});
 function filtered(){
  const q=String($("repSearch").value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return rows.filter(r=>(!$("repType").value||r.kind===$("repType").value)&&
   [r.title,r.location,r.notes,r.event_date,r.kind].join(" ").toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(q));
 }
 function catalog(){
  const results=filtered();
  $("repStatus").textContent=results.length+" repertorio"+(results.length===1?"":"s")+" disponible"+(results.length===1?"":"s");
  $("repCards").innerHTML=results.map(rep=>
   '<a class="rep-public-card" href="repertorios.html?id='+encodeURIComponent(rep.id)+'">'+
   '<span class="rep-card-pill">'+esc(typeName(rep.kind))+'</span>'+
   '<h2>'+esc(rep.title)+'</h2>'+
   '<p>'+esc([rep.event_date?friendlyDate(rep.event_date):"",rep.location].filter(Boolean).join(" · "))+'</p>'+
   '<p class="muted-text">'+(rep.items||[]).length+' cantos preparados</p>'+
   '<span class="rep-open">Abrir repertorio →</span></a>'
  ).join("")||'<p class="rep-empty">Todavía no hay repertorios publicados que coincidan.</p>';
 }
 async function loadSongs(rep){
  const ids=[...new Set((rep.items||[]).map(x=>x.song_id))].filter(Boolean);
  songs=new Map();
  for(let i=0;i<ids.length;i+=100){
   const {data,error}=await db.from("songs").select("id,title,lyrics,tone,song_type").in("id",ids.slice(i,i+100));
   if(error)throw error;
   for(const s of data||[])songs.set(s.id,s);
  }
 }
 function loadLine(){
  if(!current)return;
  const items=current.items||[];
  if(!items.length)return;
  position=Math.min(Math.max(position,0),items.length-1);
  const item=items[position],song=songs.get(item.song_id);
  $("repCurrentMoment").textContent=item.moment||"Canto "+(position+1);
  $("repCurrentTitle").textContent=song?.title||"Canto no disponible";
  $("repCurrentInfo").textContent=[song?.tone?"Tono "+song.tone:"",item.notes].filter(Boolean).join(" · ");
  $("repCurrentLyrics").innerHTML=song?(window.ShalomChords?.render
    ?window.ShalomChords.render(song.lyrics||"Todavía no hay letra disponible.")
    :'<pre>'+esc(song.lyrics||"Sin letra")+'</pre>')
    :'<p>Este canto ya no está disponible en el cancionero.</p>';
  $("repCurrentLink").hidden=!song;
  $("repCurrentLink").href=R.url(item.song_id);
  $("repProgress").textContent=(position+1)+" / "+items.length;
  $("repPrevious").disabled=position===0;
  $("repNext").disabled=position>=items.length-1;
  $("repSongOrder").querySelectorAll("[data-pos]").forEach(el=>{
   const yes=Number(el.dataset.pos)===position;
   el.classList.toggle("active",yes);
   el.setAttribute("aria-current",yes?"step":"false");
  });
 }
 function reader(rep){
  current=rep;position=0;
  $("repCatalog").hidden=true;$("repReader").hidden=false;
  $("repReaderKind").textContent=typeName(rep.kind);
  $("repReaderTitle").textContent=rep.title;
  $("repReaderMeta").textContent=[rep.event_date?friendlyDate(rep.event_date):"",rep.location,(rep.items||[]).length+" cantos"].filter(Boolean).join(" · ");
  $("repReaderNotes").textContent=rep.notes||"";
  $("repReaderNotes").hidden=!rep.notes;
  $("repPrintAll").innerHTML=(rep.items||[]).map((item,i)=>{
   const song=songs.get(item.song_id);
   const text=song?.lyrics||"Canto no disponible.";
   const html=window.ShalomChords?.render ? window.ShalomChords.render(text) : "<pre>"+esc(text)+"</pre>";
   return '<article class="rep-print-song"><h3>'+(i+1)+'. '+esc(item.moment||"Canto")+' — '+esc(song?.title||"Canto no disponible")+'</h3>'+
    (item.notes?'<p>'+esc(item.notes)+'</p>':"")+
    '<div class="rep-reader-lyrics">'+html+'</div></article>';
  }).join("");
  $("repSongOrder").innerHTML=(rep.items||[]).map((item,i)=>
   '<button type="button" class="rep-order-button" data-pos="'+i+'"><strong>'+(i+1)+'. '+esc(item.moment||"Canto")+
   '</strong><span>'+esc(songs.get(item.song_id)?.title||"Canto no disponible")+'</span></button>').join("");
  $("repSongOrder").querySelectorAll("[data-pos]").forEach(btn=>btn.addEventListener("click",()=>{
   position=Number(btn.dataset.pos);loadLine();
  }));
  loadLine();
  document.title=rep.title+" | SHALOM Repertorios";
  window.scrollTo({top:0,behavior:"instant"});
 }
 function back(){
  current=null;$("repCatalog").hidden=false;$("repReader").hidden=true;
  history.replaceState(null,"","repertorios.html");
  document.title="Repertorios de misa y ensayo | SHALOM";
 }
 async function openRep(id){
  if(loading)return;
  const rep=rows.find(r=>r.id===id);
  if(!rep)return;
  loading=true;$("repStatus").textContent="Preparando cantos…";
  try{
   await loadSongs(rep);
   history.pushState(null,"","repertorios.html?id="+encodeURIComponent(id));
   reader(rep);
  }catch(e){$("repStatus").textContent="No se pudieron cargar los cantos: "+e.message;}
  finally{loading=false;}
 }
 async function init(){
  if(!db){$("repStatus").textContent="Sin conexión con el servidor del cancionero.";return}
  const {data,error}=await db.from("repertoires")
   .select("id,title,kind,event_date,location,notes,items,is_published,updated_at")
   .eq("is_published",true).order("event_date",{ascending:false,nullsFirst:false});
  if(error){$("repStatus").textContent="Error al cargar repertorios: "+error.message;return;}
  rows=(data||[]).filter(r=>Array.isArray(r.items));
  catalog();
  const id=new URLSearchParams(location.search).get("id");
  if(id){const rep=rows.find(r=>r.id===id);if(rep)await openRep(id);else $("repStatus").textContent="No se encontró ese repertorio publicado.";}
  $("repCards").addEventListener("click",e=>{
   const a=e.target.closest('a[href*="repertorios.html?id="]');
   if(!a)return;
   e.preventDefault();const id=new URL(a.href).searchParams.get("id");openRep(id);
  });
 }
 $("repSearch")?.addEventListener("input",catalog);
 $("repType")?.addEventListener("change",catalog);
 $("repBack")?.addEventListener("click",back);
 $("repPrevious")?.addEventListener("click",()=>{position--;loadLine();});
 $("repNext")?.addEventListener("click",()=>{position++;loadLine();});
 $("repPrint")?.addEventListener("click",()=>window.print());
 window.addEventListener("popstate",()=>{if(current)back();});
 init();
})();