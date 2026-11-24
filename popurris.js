/* Vista pública de popurrís SHALOM. Solo consulta filas publicadas. */
(() => {
 const db=window.supabaseClient,M=window.ShalomMedleys;
 const $=id=>document.getElementById(id);
 let medleys=[],active=null,shift=0,capo=0,studioSongs=[];
 function renderList(term="") {
  const q=String(term||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const rows=medleys.filter(m=>[m.title,m.description,m.song_type].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(q));
  $("medleyCatalogStatus").textContent=rows.length+" popurrí"+(rows.length===1?"":"s")+" disponible"+(rows.length===1?"":"s");
  $("medleyCards").innerHTML=rows.map(m=>
   '<a class="medley-card" href="popurris.html?id='+encodeURIComponent(m.id)+'">'+
   '<span class="hero-kicker">'+M.html(({catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto"})[m.song_type]||"SHALOM")+'</span>'+
   '<h3>'+M.html(m.title)+'</h3>'+
   '<p>'+M.html((m.parts||[]).length)+" canto(s) · "+M.html(m.base_tone?"Tono "+m.base_tone:"Tono por fragmento")+'</p>'+
   (m.description?'<p>'+M.html(m.description)+'</p>':"")+'</a>'
  ).join("")||'<p>No hay popurrís publicados que coincidan.</p>';
 }
 function show(medley) {
  if(!medley)return;
  active=medley;shift=0;capo=0;$("medleyCapo").value="0";
  $("medleyCatalog").hidden=true;$("medleyReader").hidden=false;
  $("medleyReaderTitle").textContent=medley.title;
  $("medleyReaderType").textContent=({catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto"})[medley.song_type]||"SHALOM";
  $("medleyReaderInfo").textContent=(medley.description||"")+" · "+(medley.parts||[]).length+" fragmento(s)"+(medley.base_tone?" · Tono de referencia "+medley.base_tone:"");
  document.title=medley.title+" | Popurrí SHALOM";
  studioSongs=[];renderReader();
  window.ShalomStudioCollectionWeb?.load(db,(medley.parts||[]).map(p=>p.song_id)).then(rows=>{if(active===medley){studioSongs=rows;renderReader();}}).catch(()=>{});
 }
 function renderReader() {
  if(!active)return;
  $("medleyCurrentTone").textContent=shift===0?"Tono original":(shift>0?"+":"")+shift+" semitonos";
  const container=$("medleyReaderParts");container.innerHTML=M.renderPartsHTML(active.parts||[],shift,capo);
  window.ShalomStudioCollectionWeb?.mount({client:db,container,articles:[...container.querySelectorAll(".medley-song")],parts:(active.parts||[]).map(p=>({...p,shift:shift+Number(p.shift||0)-capo,capo})),songs:studioSongs,kind:"popurri",title:active.title});
 }
 async function load(){
  if(!db){$("medleyCatalogStatus").textContent="No se pudo iniciar la conexión.";return;}
  const {data,error}=await db.from("medleys")
   .select("id,title,slug,song_type,base_tone,description,parts,is_published,updated_at")
   .eq("is_published",true).order("updated_at",{ascending:false});
  if(error){$("medleyCatalogStatus").textContent="No se pudieron cargar los popurrís: "+error.message;return;}
  medleys=(data||[]).filter(m=>Array.isArray(m.parts));
  const id=new URLSearchParams(location.search).get("id");
  if(id){
   const selected=medleys.find(row=>row.id===id);
   if(selected)show(selected);
   else $("medleyCatalogStatus").textContent="Este popurrí no está publicado o no existe.";
  }
  if(!active)renderList($("medleySearch").value);
 }
 $("menuToggle")?.addEventListener("click",()=>{});
 $("medleySearch")?.addEventListener("input",event=>renderList(event.target.value));
 $("medleyUp")?.addEventListener("click",()=>{shift=Math.min(11,shift+1);renderReader();});
 $("medleyDown")?.addEventListener("click",()=>{shift=Math.max(-11,shift-1);renderReader();});
 $("medleyReset")?.addEventListener("click",()=>{shift=0;capo=0;$("medleyCapo").value="0";renderReader();});
 $("medleyCapo")?.addEventListener("change",event=>{capo=Number(event.target.value)||0;renderReader();});
 $("medleyPrint")?.addEventListener("click",()=>window.print());
 document.querySelector("#menuToggle")?.addEventListener("click",()=>{
  const menu=document.querySelector("#navMenu");menu?.classList.toggle("open");
 });
 load();
})();