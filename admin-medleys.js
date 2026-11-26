// Editor de popurrís SHALOM: los cantos originales nunca se modifican.
(() => {
 const db=window.supabaseClient, M=window.ShalomMedleys;
 const state={root:null,songs:[],rows:[],ready:false,active:null,query:"",message:"",saving:false};
 const esc=M.html;
 const blank=()=>({title:"",song_type:"catolico",base_tone:"",description:"",is_published:false,parts:[]});
 const get=(q)=>state.root?.querySelector(q);
 const source=p=>state.songs.find(song=>String(song.id)===String(p.song_id));
 const partHtml=(p,i)=>{
  const opts=M.sections(source(p)?.lyrics||"").map((x,k)=>'<option value="'+k+'">'+esc(x.title)+'</option>').join("");
  return '<article class="medley-part-edit"><div class="medley-part-head"><strong>'+(i+1)+'. '+esc(p.song_title)+'</strong>'+
   '<span class="medley-reorder"><button type="button" data-action="up" data-i="'+i+'" '+(i?"":"disabled")+'>↑</button>'+
   '<button type="button" data-action="down" data-i="'+i+'" '+(i===state.active.parts.length-1?"disabled":"")+'>↓</button>'+
   '<button type="button" data-action="remove" data-i="'+i+'">Quitar</button></span></div>'+
   '<label>Nombre del fragmento<input data-title="'+i+'" maxlength="160" value="'+esc(p.title)+'"></label>'+
   '<label>Capo de este fragmento<select data-capo="'+i+'">'+window.ShalomCollectionCapoOptions.options(source(p),p.capo_id||"none").map(c=>'<option value="'+esc(c.id)+'" '+(c.id===(p.capo_id||"none")?"selected":"")+'>'+esc(c.label)+'</option>').join("")+'</select></label>'+
   '<label>Transponer semitonos<input type="number" min="-11" max="11" step="1" data-shift="'+i+'" value="'+esc(p.shift||0)+'"></label>'+
   (i<state.active.parts.length-1?'<label>Studio: pausa hasta el siguiente fragmento (ms; vacío = sin configurar)<input type="number" min="0" max="10000" step="1" data-studio-gap="'+i+'" value="'+esc(p.studio_gap_ms??"")+'"></label>':"")+
   '<div class="medley-part-tools"><select data-section="'+i+'">'+opts+'</select>'+
   '<button type="button" data-action="only" data-i="'+i+'">Usar sección</button>'+
   '<button type="button" data-action="append" data-i="'+i+'">Añadir sección</button></div>'+
   '<label>Fragmento de letra y acordes<textarea rows="7" data-lyrics="'+i+'">'+esc(p.lyrics||"")+'</textarea></label><button type="button" class="song-btn secondary" data-cue-part="'+i+'">Editar indicaciones de este fragmento</button></article>';
 };
 const songOptions=()=>state.songs.filter(x=>[x.title,x.tone,(x._artists||[]).map(a=>a.name).join(" ")].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(state.query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""))).slice(0,120);
 const options=()=>songOptions().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+' · '+esc(x.tone||"Sin tono")+'</option>').join("");
 function capture(){
  const d=state.active;if(!d)return;
  for(const [key,id] of [["title","#popTitle"],["base_tone","#popTone"],["description","#popDescription"]]){
   const el=get(id);if(el)d[key]=el.value;
  }
  d.song_type=get("#popType")?.value||"catolico";
  d.is_published=Boolean(get("#popPublished")?.checked);
  d.parts.forEach((p,i)=>{
   p.title=get('[data-title="'+i+'"]')?.value??p.title;
   p.shift=Number(get('[data-shift="'+i+'"]')?.value??p.shift);
   const capo=get('[data-capo="'+i+'"]');if(capo){if(capo.value==="none")delete p.capo_id;else p.capo_id=capo.value;}
   p.lyrics=get('[data-lyrics="'+i+'"]')?.value??p.lyrics;
   const gap=get('[data-studio-gap="'+i+'"]');if(gap){if(gap.value==="")delete p.studio_gap_ms;else p.studio_gap_ms=Number(gap.value);}
  });
 }
 function render(){
  if(!state.root?.isConnected)return;
  const d=state.active||blank();state.active=d;
  const existing=state.rows.map(x=>'<button type="button" class="medley-existing" data-edit="'+esc(x.id)+'"><strong>'+esc(x.title)+'</strong><small>'+(x.parts||[]).length+' partes · '+(x.is_published?"Publicado":"Borrador")+'</small></button>').join("");
  state.root.innerHTML='<section class="admin-section"><div class="admin-section-heading"><div><p class="hero-kicker">Repertorio</p><h2>Popurrís</h2></div><a class="song-btn secondary" href="popurris.html" target="_blank" rel="noopener">Vista pública ↗</a></div>'+
   '<p class="admin-note">Combina cantos existentes, elige sus secciones, ajusta los acordes y ordénalos. Los originales no se modifican.</p>'+
   '<div class="medley-admin-layout"><div class="admin-card">'+
   '<div class="admin-editor-head"><h3>'+(d.id?"Editar":"Crear")+' popurrí</h3><button type="button" class="song-btn secondary" id="popNew">+ Nuevo</button></div>'+
   '<form id="popForm" class="admin-form"><label>Nombre<input id="popTitle" required maxlength="160" value="'+esc(d.title)+'" placeholder="Popurrí de alabanza"></label>'+
   '<div class="admin-form-grid"><label>Tipo<select id="popType">'+["catolico","cristiano","mixto"].map(x=>'<option value="'+x+'" '+(d.song_type===x?"selected":"")+'>'+({catolico:"Católico",cristiano:"Cristiano",mixto:"Mixto"}[x])+'</option>').join("")+'</select></label>'+
   '<label>Tono base<input id="popTone" maxlength="24" value="'+esc(d.base_tone||"")+'" placeholder="G"></label></div>'+
   '<label>Descripción<textarea rows="2" id="popDescription" maxlength="1200">'+esc(d.description||"")+'</textarea></label>'+
   '<label class="medley-published-label"><input type="checkbox" id="popPublished" '+(d.is_published?"checked":"")+'> Publicar el popurrí</label><p class="admin-note">El popurrí publicado más reciente aparecerá en Inicio &gt; Hoy en SHALOM cuando se actualice el cancionero en la app.</p>'+
   '<h3>Seleccionar cantos</h3><label>Buscar canto<input id="popSearch" type="search" value="'+esc(state.query)+'" placeholder="Escribe el nombre"></label>'+
   '<div class="medley-part-tools"><select id="popSong">'+options()+'</select><button type="button" class="song-btn" id="popAdd">+ Agregar</button></div>'+
   '<h3>Orden de los cantos ('+d.parts.length+')</h3>'+d.parts.map(partHtml).join("")+
   (!d.parts.length?'<p class="admin-note">Agrega el primer canto para elegir estrofas y coros.</p>':"")+
   '<div class="medley-save-row"><button class="song-btn" type="submit" '+(state.saving?"disabled":"")+'>'+(state.saving?"Guardando…":"Guardar popurrí")+'</button>'+
   (d.id?'<button class="song-btn secondary" type="button" id="popDelete">Eliminar</button>':"")+'</div>'+
   '<p id="popMessage" class="admin-note" role="status">'+esc(state.message)+'</p></form></div>'+
   '<aside class="admin-preview-card"><h3>Vista previa</h3><div class="medley-preview"><h3>'+esc(d.title||"Popurrí sin título")+'</h3>'+
   (d.parts.length?M.renderPartsHTML(d.parts,0):'<p>Los cantos aparecerán aquí.</p>')+'</div>'+
   '<h3>Guardados</h3><div class="medley-saved-list">'+(existing||'<p class="admin-note">Aún no hay popurrís.</p>')+'</div></aside></div></section>';
  bind();
 }
 function alertStatus(message){state.message=message;const x=get("#popMessage");if(x)x.textContent=message;}
 async function reload(){
  const {data,error}=await db.from("medleys").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  state.rows=data||[];state.ready=true;
 }
 async function save(){
  capture();
  if(!state.active.title.trim())return alertStatus("Escribe un nombre para el popurrí.");
  let parts;
  try{parts=M.normalizeParts(state.active.parts);}catch(e){return alertStatus(e.message);}
  if(state.saving)return;
  state.saving=true;alertStatus("Guardando…");
  const id=state.active.id||window.crypto.randomUUID();
  const d=state.active;
  const payload={id,title:d.title.trim(),slug:d.slug||M.slug(d.title)+"-"+id.slice(0,8),
   song_type:d.song_type,base_tone:d.base_tone.trim(),description:d.description.trim(),
   is_published:d.is_published,parts,updated_at:new Date().toISOString()};
  try {
   const {data,error}=await db.from("medleys").upsert(payload,{onConflict:"id"}).select().single();
   if(error)throw error;
   state.active={...data,parts:data.parts||[]};
   await reload();state.message="Popurrí guardado. "+(data.is_published?"Visible para todos.":"Borrador privado.");
  }catch(e){state.message="No se pudo guardar: "+(e.message||"error");}
  finally{state.saving=false;render();}
 }
 function bind(){
  state.root.querySelectorAll("#popTitle,#popType,#popTone,#popDescription,[data-title],[data-shift],[data-lyrics],[data-studio-gap]").forEach(input=>{
    input.addEventListener("input",()=>{
      capture();
      const preview=get(".medley-preview");
      if(preview)preview.innerHTML="<h3>"+esc(state.active.title||"Popurrí sin título")+"</h3>"+M.renderPartsHTML(state.active.parts,0);
    });
  });
  get("#popForm")?.addEventListener("submit",e=>{e.preventDefault();save();});
  get("#popNew")?.addEventListener("click",()=>{state.active=blank();state.message="";render();});
  get("#popSearch")?.addEventListener("input",e=>{state.query=e.target.value;get("#popSong").innerHTML=options();});
  get("#popAdd")?.addEventListener("click",()=>{
    capture();const id=get("#popSong")?.value;const song=state.songs.find(x=>String(x.id)===String(id));
    if(!song)return alertStatus("Selecciona un canto existente.");
    if(state.active.parts.length>=30)return alertStatus("Límite de 30 fragmentos.");
    state.active.parts.push({id:window.crypto.randomUUID(),song_id:song.id,song_title:song.title,title:song.title,
     tone:song.tone||"",lyrics:song.lyrics||"",shift:0});
    state.message="";render();
  });
  state.root.querySelectorAll("[data-cue-part]").forEach(btn=>btn.addEventListener("click",()=>{
   if(state.saving)return;capture();const part=state.active.parts[Number(btn.dataset.cuePart)];if(!part?.lyrics)return;
   window.ShalomCollectionCueEditor.open({lyrics:part.lyrics,initial:part.cue_override,onSave:value=>{if(value)part.cue_override=value;else delete part.cue_override;render();}});
  }));
  state.root.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
    capture();const i=Number(button.dataset.i),a=state.active.parts,kind=button.dataset.action;
    if(kind==="remove")a.splice(i,1);
    if(kind==="up"&&i>0)[a[i-1],a[i]]=[a[i],a[i-1]];
    if(kind==="down"&&i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]];
    if(kind==="only"||kind==="append"){
      const section=M.sections(source(a[i])?.lyrics||"")[Number(get('[data-section="'+i+'"]')?.value||0)];
      if(!section)return alertStatus("No hay sección disponible.");
      a[i].lyrics=kind==="only"?section.text:(a[i].lyrics.trim()+"\n\n"+section.text);
      if(kind==="only")a[i].title=a[i].song_title+" · "+section.title;
    }
    render();
  }));
  state.root.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{
    const item=state.rows.find(x=>x.id===button.dataset.edit);if(!item)return;
    state.active={...item,parts:Array.isArray(item.parts)?item.parts.map(p=>({...p})):[]};
    state.message="Editando "+item.title;render();state.root.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  get("#popDelete")?.addEventListener("click",async()=>{
    if(!state.active.id||!window.confirm("¿Eliminar este popurrí? Los cantos originales se conservarán."))return;
    const {error}=await db.from("medleys").delete().eq("id",state.active.id);
    if(error)return alertStatus("No se pudo eliminar: "+error.message);
    state.active=blank();state.message="Popurrí eliminado; los cantos originales no cambiaron.";
    try{await reload();}catch(e){state.message=e.message;}render();
  });
 }
 async function mount(root,songs){
  state.root=root;state.songs=songs||[];state.active=state.active||blank();
  render();
  if(!state.ready){try{await reload();state.message="";}catch(e){state.message="Error al cargar popurrís: "+e.message;}render();}
 }
 window.ShalomMedleyAdmin={mount};
})();