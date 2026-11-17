/* Panel de repertorios SHALOM: sólo se carga después del acceso admin existente. */
(()=>{
 const db=window.supabaseClient,R=window.ShalomRepertoires;
 const state={root:null,songs:[],rows:[],active:R.blank(),search:"",message:"",loading:false,saving:false,ready:false};
 const $=selector=>state.root?.querySelector(selector);
 const esc=R.html;
 const songBy=id=>state.songs.find(s=>String(s.id)===String(id));
 const notice=(s,bad=false)=>{state.message=s;const el=$("#repertoireNotice");if(el){el.textContent=s;el.style.color=bad?"#ffb4b4":"";}};
 function capture(){
  if(!state.root)return;
  const d=state.active;
  d.title=$("#repTitle")?.value||d.title;
  d.kind=$("#repKind")?.value||d.kind;
  d.event_date=$("#repDate")?.value||null;
  d.location=$("#repLocation")?.value||"";
  d.notes=$("#repNotes")?.value||"";
  d.is_published=Boolean($("#repPublic")?.checked);
  state.root.querySelectorAll("[data-item-moment]").forEach(el=>{
   const i=Number(el.dataset.itemMoment);if(d.items[i])d.items[i].moment=el.value;
  });
  state.root.querySelectorAll("[data-item-notes]").forEach(el=>{
   const i=Number(el.dataset.itemNotes);if(d.items[i])d.items[i].notes=el.value;
  });
 }
 function songOptions(){
  const q=state.search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return state.songs.filter(s=>(String(s.title||"")+" "+String(s.tone||"")).toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(q)).slice(0,100);
 }
 function render(){
  const d=state.active;
  const items=d.items.map((item,i)=>{
   const song=songBy(item.song_id);
   const options=(d.kind==="misa"?R.MASS_STEPS:[["ensayo","Ensayo"],["repaso","Repasar"],["nuevo","Canto nuevo"],["inicio","Inicio"],["final","Final"]]);
   return '<article class="rep-part">'+
    '<div class="rep-part-title"><strong>'+(i+1)+'. '+esc(song?.title||"Canto eliminado")+'</strong>'+
    '<span><button type="button" data-move="'+i+'" data-dir="-1" '+(i===0?"disabled":"")+'>↑</button>'+
    '<button type="button" data-move="'+i+'" data-dir="1" '+(i===d.items.length-1?"disabled":"")+'>↓</button>'+
    '<button type="button" data-remove="'+i+'">Quitar</button></span></div>'+
    '<label>Momento / sección<select data-item-moment="'+i+'">'+
     options.map(([value,title])=>'<option value="'+esc(title)+'" '+(item.moment===title?"selected":"")+'>'+esc(title)+'</option>').join("")+
     (item.moment&&!options.some(x=>x[1]===item.moment)?'<option selected>'+esc(item.moment)+'</option>':"")+
    '</select></label>'+
    '<label>Indicaciones para el coro<input maxlength="500" data-item-notes="'+i+'" value="'+esc(item.notes||"")+'" placeholder="Ej. Intro dos veces, entrar después del salmo"></label></article>';
  }).join("");
  const saved=state.rows.map(rep=>'<button type="button" class="rep-saved" data-edit="'+esc(rep.id)+'">'+
    '<strong>'+esc(rep.title)+'</strong><small>'+esc(rep.kind==="misa"?"Misa":"Ensayo")+' · '+(rep.items||[]).length+
    ' cantos · '+(rep.is_published?"Publicado":"Borrador")+
    (rep.event_date?" · "+esc(R.formatDate(rep.event_date)):"")+'</small></button>').join("");
  state.root.innerHTML='<section class="admin-section">'+
   '<div class="admin-section-heading"><div><p class="hero-kicker">Organización musical</p><h2>Repertorios de misa y ensayo</h2></div>'+
   '<a class="song-btn secondary" href="repertorios.html" target="_blank" rel="noopener">Ver repertorios ↗</a></div>'+
   '<div class="rep-admin-layout"><div class="admin-card">'+
    '<div class="admin-editor-head"><h3>'+(d.id?"Editar":"Nuevo")+' repertorio</h3><button type="button" class="song-btn secondary" id="repNew">+ Nuevo</button></div>'+
    '<form class="admin-form" id="repForm">'+
    '<label>Nombre del repertorio<input id="repTitle" maxlength="160" required placeholder="Ej. Misa del domingo, Ensayo del sábado" value="'+esc(d.title)+'"></label>'+
    '<div class="admin-form-grid"><label>Tipo<select id="repKind">'+
     '<option value="misa" '+(d.kind==="misa"?"selected":"")+'>Misa</option>'+
     '<option value="ensayo" '+(d.kind==="ensayo"?"selected":"")+'>Ensayo</option></select></label>'+
     '<label>Fecha<input id="repDate" type="date" value="'+esc(d.event_date||"")+'"></label></div>'+
    '<label>Lugar (opcional)<input id="repLocation" maxlength="180" value="'+esc(d.location||"")+'" placeholder="Parroquia, capilla o lugar de ensayo"></label>'+
    '<label>Indicaciones generales<textarea id="repNotes" rows="3" maxlength="3000" placeholder="Ej. Revisar el tono de entrada">'+esc(d.notes||"")+'</textarea></label>'+
    '<label class="rep-published"><input id="repPublic" type="checkbox" '+(d.is_published?"checked":"")+'> Publicar para que los integrantes puedan verlo</label>'+
    '<h3>Cantos del repertorio ('+d.items.length+')</h3><div class="rep-parts">'+
     (items||'<p class="admin-note">Agrega cantos en el orden en que se interpretarán.</p>')+'</div>'+
    '<div class="rep-select-row"><label>Buscar canto<input type="search" id="repSongSearch" value="'+esc(state.search)+'" placeholder="Filtrar por título o tono"></label>'+
    '<label>Seleccionar<select id="repSongSelect">'+
     songOptions().map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+' · '+esc(s.tone||"Sin tono")+'</option>').join("")+
    '</select></label><button class="song-btn secondary" id="repAddSong" type="button">+ Agregar canto</button></div>'+
    '<div class="rep-actions"><button class="song-btn" type="submit" '+(state.saving?"disabled":"")+'>'+(state.saving?"Guardando…":"Guardar repertorio")+'</button>'+
     (d.id?'<button type="button" class="song-btn secondary" id="repDelete">Eliminar</button>':"")+'</div>'+
    '<p id="repertoireNotice" class="admin-note" aria-live="polite">'+esc(state.message)+'</p>'+
   '</form></div>'+
   '<aside class="admin-preview-card"><h3>Repertorios guardados</h3>'+
     (saved||'<p class="admin-note">Aún no hay repertorios. Crea uno y guárdalo.</p>')+
     '<p class="admin-note">Los cantos originales nunca se modifican. Publica sólo cuando hayas terminado.</p></aside>'+
   '</div></section>';
  bind();
 }
 async function reload(){
  const {data,error}=await db.from("repertoires").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  state.rows=data||[];
 }
 function bind(){
  $("#repNew")?.addEventListener("click",()=>{state.active=R.blank();state.message="";state.search="";render();});
  $("#repKind")?.addEventListener("change",e=>{
   capture();state.active.kind=e.target.value;
   // Mantener cantos; actualizar sólo los momentos cuando corresponda.
   const defaultMoment=e.target.value==="misa"?"Entrada":"Ensayo";
   state.active.items.forEach(item=>{if(!item.moment)item.moment=defaultMoment;});
   render();
  });
  $("#repSongSearch")?.addEventListener("input",e=>{
   state.search=e.target.value;
   const select=$("#repSongSelect");
   if(select)select.innerHTML=songOptions().map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join("");
  });
  $("#repAddSong")?.addEventListener("click",()=>{
   const id=$("#repSongSelect")?.value; if(!songBy(id))return notice("Selecciona un canto válido.",true);
   if(state.active.items.length>=45)return notice("Máximo de 45 cantos.",true);
   capture();state.active.items.push({song_id:id,moment:state.active.kind==="misa"?"Entrada":"Ensayo",notes:""});render();
  });
  state.root.querySelectorAll("[data-move]").forEach(btn=>btn.addEventListener("click",()=>{
   capture();const i=Number(btn.dataset.move),j=i+Number(btn.dataset.dir);
   if(j<0||j>=state.active.items.length)return;
   [state.active.items[i],state.active.items[j]]=[state.active.items[j],state.active.items[i]];
   render();
  }));
  state.root.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{
   capture();state.active.items.splice(Number(btn.dataset.remove),1);render();
  }));
  state.root.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>{
   const rep=state.rows.find(r=>r.id===btn.dataset.edit);if(!rep)return;
   state.active={...rep,items:(rep.items||[]).map(item=>({...item}))};
   state.message="";state.search="";render();
  }));
  $("#repForm")?.addEventListener("submit",async e=>{
   e.preventDefault();if(state.saving)return;
   capture();let payload;
   try{payload=R.validate(state.active);}catch(err){notice(err.message,true);return;}
   state.saving=true;render();
   try{
    if(state.active.id)payload.id=state.active.id;
    const {data,error}=await db.from("repertoires").upsert(payload,{onConflict:"id"}).select().single();
    if(error)throw error;
    state.active={...data,items:(data.items||[]).map(item=>({...item}))};
    await reload();state.message="Repertorio guardado. "+(data.is_published?"Visible para los integrantes.":"Sólo visible para administradores.");
   }catch(err){state.message="Error al guardar: "+err.message;}
   finally{state.saving=false;render();}
  });
  $("#repDelete")?.addEventListener("click",async()=>{
   if(!state.active.id||!confirm("¿Eliminar este repertorio? Los cantos originales se conservarán."))return;
   const {error}=await db.from("repertoires").delete().eq("id",state.active.id);
   if(error){notice("No se pudo eliminar: "+error.message,true);return}
   state.active=R.blank();await reload();state.message="Repertorio eliminado.";render();
  });
 }
 async function mount(root,songs){
  state.root=root;
  state.songs=(songs||[]).slice().sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"es"));
  if(!state.ready){state.ready=true;try{await reload();state.message="";}catch(e){state.message="Error al cargar repertorios: "+e.message;}}
  if(state.root!==root)return;render();
 }
 window.ShalomRepertoireAdmin={mount};
})();