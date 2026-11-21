"use strict";
const React=require("react");
const {useState,useEffect,useRef}=React;
const RN=require("react-native");
const {View,Text,TextInput,Pressable,ScrollView,KeyboardAvoidingView,Platform,Alert,AppState,ActivityIndicator}=RN;
const {SafeAreaProvider,SafeAreaView}=require("react-native-safe-area-context");
const SecureStore=require("expo-secure-store");
const Crypto=require("expo-crypto");
const NetInfo=require("@react-native-community/netinfo").default;
const {S,C}=require("./src/styles");
const {TITLES,FIELDS,OPTIONS,baseRecord,displayTitle}=require("./src/model");
const {RESOURCES,ACTIONS,effective,canPublish,canEdit}=require("./src/permissions");
const {TABLES}=require("./src/config");
const {renderLines}=require("./src/score");
const {createAuth}=require("./src/auth");
const {createApi}=require("./src/api");
const {createSync}=require("./src/sync");
const store=require("./src/store");
const h=React.createElement;
const auth=createAuth(fetch,SecureStore);
const api=createApi(fetch,auth);
const network=async()=>{const n=await NetInfo.fetch();return !!(n.isConnected&&n.isInternetReachable!==false);};
const sync=createSync(api,auth,network);
const tabs=[["Inicio","⌂"],["Cantos","♫"],["Catálogo","▤"],["Pendientes","⇧"],["Usuarios","♙"]];
const catalogTabs=["artists","albums","categories","repertoires","medleys","contact_messages","home_recommendations","site_content"];
function txt(value,style){return h(Text,{style},String(value??""));}
function heading(text){return txt(text,S.section);}
function button(title,action,kind,disabled){
 return h(Pressable,{accessibilityRole:"button",disabled:!!disabled,onPress:action,style:[S.btn,kind==="secondary"&&S.btnSecondary,kind==="danger"&&S.btnDanger,disabled&&{opacity:.45}]},txt(title,S.btnText));
}
function chip(text,selected,action){
 return h(Pressable,{onPress:action,style:[S.chip,selected&&S.chipSelected],accessibilityRole:"button"},txt(text,[S.chipText,selected&&S.chipTextSelected]));
}
function input(label,value,onChange,extra){
 return h(View,{style:{gap:5}},txt(label,S.label),h(TextInput,{style:[S.input,extra?.multi&&S.multi],value:String(value??""),onChangeText:onChange,placeholderTextColor:C.muted,multiline:!!extra?.multi,autoCapitalize:extra?.email?"none":"sentences",keyboardType:extra?.email?"email-address":"default",secureTextEntry:!!extra?.secure}));
}
function wrapChips(list,selected,onSelect){
 return h(View,{style:{flexDirection:"row",gap:7,flexWrap:"wrap"}},list.map(([k,label])=>h(View,{key:String(k)},chip(label,Array.isArray(selected)?selected.includes(k):selected===k,()=>onSelect(k)))));
}
function itemRow(title,sub,onPress,right){
 return h(Pressable,{onPress,style:S.item},h(View,{style:S.apart},h(View,{style:{flex:1,gap:3}},txt(title,S.itemTitle),sub?txt(sub,S.itemSub):null),txt(right||"›",{color:C.green,fontSize:20})));
}
function localId(){return Crypto.randomUUID();}
function initial(table){
 const values={};for(const [key,,kind] of FIELDS[table]){
  values[key]=["categories","artists","links","capos"].includes(kind)?[]:kind==="json"?(key==="content"?"{}":"[]"):kind==="boolean"?false:kind==="number"?"0":"";
 }
 if(table==="songs")values.song_type="catolico";
 if(table==="repertoires")values.kind="misa";
 if(table==="medleys")values.song_type="catolico";
 if(table==="contact_messages")values.status="pendiente";
 return values;
}
function fromServer(table,raw,all){
 const out={...initial(table),...raw};
 if(table==="songs"){
  out.category_ids=(all.song_categories||[]).filter(r=>r.song_id===raw.id).map(r=>r.category_id);
  out.collaborator_ids=(all.song_artists||[]).filter(r=>r.song_id===raw.id&&r.role==="colaborador").map(r=>r.artist_id);
  out.album_id=(all.album_songs||[]).find(r=>r.song_id===raw.id)?.album_id||"";
  out.links=(all.song_links||[]).filter(r=>r.song_id===raw.id);
  out.capos=(all.song_capo_versions||[]).filter(r=>r.song_id===raw.id);
  out.artist_id=raw.artist_id||(all.song_artists||[]).find(r=>r.song_id===raw.id&&r.role==="principal")?.artist_id||"";
 }
 for(const [key,,kind] of FIELDS[table])if(kind==="json")out[key]=JSON.stringify(out[key]??(key==="content"?{}:[]),null,2);
 return out;
}
function Field({spec,form,onChange,lists}){
 const [key,label,kind]=spec,value=form[key];
 const set=v=>onChange(key,v);
 if(OPTIONS[kind])return h(View,{style:{gap:7}},txt(label,S.label),wrapChips(OPTIONS[kind],value,set));
 if(kind==="boolean")return h(View,{style:S.apart},txt(label,S.label),chip(value?"Sí":"No",!!value,()=>set(!value)));
 if(["artist","album","category"].includes(kind)){
  const other=kind==="artist"?"artists":kind==="album"?"albums":"categories";
  const opt=[["","Ninguno"],...(lists[other]||[]).map(x=>[x.id,displayTitle(other,x)])];
  return h(View,{style:{gap:7}},txt(label,S.label),wrapChips(opt,value,set));
 }
 if(["artists","categories"].includes(kind)){
  const type=kind==="artists"?"artists":"categories";
  const opt=(lists[type]||[]).map(x=>[x.id,displayTitle(type,x)]);
  return h(View,{style:{gap:8}},txt(label,S.label),wrapChips(opt,value||[],v=>set((value||[]).includes(v)?value.filter(x=>x!==v):[...(value||[]),v])));
 }
 if(kind==="links"||kind==="capos")return h(NestedEditor,{kind,value:value||[],onChange:set});
 return input(label,value,set,{multi:kind==="multiline"||kind==="json",email:kind==="url"});
}
function NestedEditor({kind,value,onChange}){
 const [title,setTitle]=useState(""),[url,setUrl]=useState(""),[platform,setPlatform]=useState("YouTube");
 const [position,setPosition]=useState("2"),[key,setKey]=useState("G");
 function add(){
  if(kind==="links"){
   if(!title.trim()||!/^https:\/\//i.test(url))return Alert.alert("Enlace incompleto","Indica título y URL HTTPS.");
   onChange([...value,{title,platform,link_type:"Tutorial",url,sort_order:value.length}]);setTitle("");setUrl("");
  }else{
   if(!Number(position)||!key.trim())return Alert.alert("Capo incompleto","Indica capo y figuras.");
   onChange([...value,{label:"Capo "+position+" · "+key,capo_position:Number(position),capo_key:key,sort_order:value.length}]);
  }
 }
 return h(View,{style:{gap:10}},
  heading(kind==="links"?"Tutoriales y enlaces":"Versiones de capo"),
  value.map((x,i)=>h(View,{key:"item"+i,style:S.apart},
    h(View,{style:{flex:1,gap:3}},txt(x.title||x.label,S.itemTitle),txt(x.url||"Capo "+x.capo_position+" / "+x.capo_key,S.itemSub)),
    button("Quitar",()=>onChange(value.filter((_,j)=>j!==i)),"danger"))),
  kind==="links"?
   h(View,{style:{gap:9}},input("Título del enlace",title,setTitle),input("URL (HTTPS)",url,setUrl),input("Plataforma",platform,setPlatform)):
   h(View,{style:{gap:9}},input("Posición del capo (1-12)",position,setPosition),input("Figuras",key,setKey)),
  button(kind==="links"?"+ Agregar enlace":"+ Agregar capo",add,"secondary")
 );
}
function Login({onSuccess}){
 const [email,setEmail]=useState(""),[pass,setPass]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[creating,setCreating]=useState(false);
 async function go(){
  setBusy(true);setMessage("");
  try{if(creating){await auth.signUp(email,pass);setMessage("Registro solicitado. Confirma tu correo, después inicia sesión. Solo se permite acceso con una invitación administrativa.");setCreating(false);}
   else{const s=await auth.signIn(email,pass);await onSuccess(s);}}
  catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 return h(View,{style:{flex:1,justifyContent:"center",padding:26,gap:14,backgroundColor:C.bg}},
  txt("SHALOM  ·  ADMIN",S.kicker),
  txt("Administrar con paz.",S.title),
  txt("Acceso privado con correo y contraseña. Solo usuarios autorizados.",S.subtitle),
  input("Correo electrónico",email,setEmail,{email:true}),
  input("Contraseña",pass,setPass,{secure:true}),
  button(busy?"Verificando...":creating?"Registrarme con invitación":"Entrar a SHALOM Admin",go,null,busy),
  button(creating?"Ya tengo cuenta":"Tengo una invitación: crear cuenta",()=>{setCreating(!creating);setMessage("");},"secondary"),
  !!message&&txt(message,S.error),
  txt("La primera sesión requiere internet. Tus borradores posteriores se guardan en el dispositivo.",S.note)
 );
}
function Main(){
 const [session,setSession]=useState(null),[access,setAccess]=useState(null),[boot,setBoot]=useState(true);
 const [tab,setTab]=useState("Inicio"),[selectedType,setSelectedType]=useState("songs"),[form,setForm]=useState(null),[editing,setEditing]=useState(null);
 const [section,setSection]=useState("Datos"),[lists,setLists]=useState({}),[drafts,setDrafts]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [search,setSearch]=useState(""),[offline,setOffline]=useState(false),[roles,setRoles]=useState([]),[profiles,setProfiles]=useState([]);
 const [newRole,setNewRole]=useState(""),[roleDescription,setRoleDescription]=useState(""),[rolePermissions,setRolePermissions]=useState([]);
 const [inviteEmail,setInviteEmail]=useState(""),[inviteRoles,setInviteRoles]=useState([]),[showRoleEditor,setShowRoleEditor]=useState(false),[editingRole,setEditingRole]=useState(null),[assigned,setAssigned]=useState({}),[blockedUsers,setBlockedUsers]=useState([]);
 const owner=session?.user_id;
 async function hydrate(s){
  setSession(s);setBoot(false);
  if(!s)return;
  const d=await store.listDrafts(s.user_id);setDrafts(d);
  const cached={};for(const t of TABLES)cached[t]=await store.cachedList(s.user_id,t);setLists(cached);
  if(await network()){
   try{const a=await api.myAccess();if(!a?.authorized)throw Error("Sin permisos de administración");
    setAccess(a);setOffline(false);
    await reloadCatalog(s.user_id);await loadUsers(a);
   }catch(e){setMessage(e.message);setAccess(null); if(/sin permisos|bloquead|revocad/i.test(e.message))await auth.clear();}
  }else{setOffline(true);setMessage("Sin internet: borradores disponibles. No se permite publicar hasta verificar permisos.");}
 }
 useEffect(()=>{let alive=true;auth.session().then(s=>{if(alive)hydrate(s).catch(e=>{setMessage(e.message);setBoot(false);});}).catch(()=>setBoot(false));return()=>{alive=false;};},[]);
 useEffect(()=>{
  if(!owner)return;
  let active=true;
  const unsub=NetInfo.addEventListener(state=>{
   if(!active)return;
   const on=!!(state.isConnected&&state.isInternetReachable!==false);
   setOffline(!on);
   if(on && access?.authorized)sendQueue();
  });
  const app=AppState.addEventListener("change",state=>{if(state==="active"&&access?.authorized)sendQueue();});
  return()=>{active=false;unsub();app.remove();};
 },[owner,access?.authorized]);
 async function reloadDrafts(){if(owner)setDrafts(await store.listDrafts(owner));}
 async function reloadCatalog(id=owner){
  if(!id)return;
  const r=await sync.pull(id);
  if(r?.offline){setOffline(true);return;}
  const o={};for(const t of TABLES)o[t]=await sync.catalog(id,t);
  setLists(o);setOffline(false);
 }
 async function loadUsers(a=access){
  if(!a?.owner)return;
  try{
   const [r,u,assignments,blocks]=await Promise.all([api.roles(),api.list("admin_profiles"),api.list("admin_user_roles"),api.list("admin_access_blocks")]);
   setRoles(r);setProfiles(u);setBlockedUsers(blocks);
   setAssigned(Object.fromEntries(u.map(p=>[p.user_id,assignments.filter(x=>x.user_id===p.user_id).map(x=>x.role_id)])));
  }catch(e){setMessage("Permisos: "+e.message);}
 }
 async function sendQueue(){
  if(!owner||busy)return;
  try{const r=await sync.push(owner);await reloadDrafts();
   if(r?.sent){setMessage(r.sent+" publicación(es) sincronizadas");await reloadCatalog();}
   if(r?.failed||r?.conflicts)setMessage("Pendientes: "+r.failed+" errores, "+r.conflicts+" conflictos. Revisar.");
  }catch(e){setMessage(e.message);}
 }
 async function refresh(){
  setBusy(true);setMessage("");
  try{const a=await api.myAccess();if(!a?.authorized)throw Error("Permisos revocados");setAccess(a);
   await sendQueue();await reloadCatalog();await loadUsers(a);
   setMessage("Catálogo actualizado");}
  catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 function begin(table,record,fromDraft){
  setSelectedType(table);setSection("Datos");setTab("Editor");
  setEditing({id:fromDraft?.id||record?.id||record?.content_key||(table==="site_content"?"new":localId()),expected:fromDraft?.expected_updated||record?.updated_at||null});
  setForm(fromDraft?{...fromDraft.body}:record?fromServer(table,record,lists):initial(table));
 }
 async function saveDraft(queue=false){
  if(!owner||!form||!editing)return;
  try{
   const clean=baseRecord(selectedType,form,selectedType==="site_content"&&editing.id!=="new"?editing.id:null);
   if(selectedType!=="site_content")clean.id=editing.id;
   if(selectedType==="songs")clean.artist_id=clean.artist_id||null;
   if(selectedType==="albums")clean.artist_id=clean.artist_id||null;
   if(selectedType==="categories")clean.parent_id=clean.parent_id||null;
   if(selectedType==="songs")clean.category_id=clean.category_ids[0]||null;
   if(selectedType==="contact_messages")clean.id=editing.id;
   if(selectedType==="home_recommendations")clean.id=editing.id;
   if(selectedType==="site_content")clean.content_key=editing.id==="new"||!editing.id?clean.content_key:editing.id;
   await store.upsertDraft(owner,{id:selectedType==="site_content"?clean.content_key:editing.id,type:selectedType,body:clean,status:queue?"queued":"draft",expected_updated:editing.expected});
   await reloadDrafts();setTab("Pendientes");setForm(null);
   setMessage(queue?"Guardado en cola; se publicará al recuperar internet y validar permisos.":"Borrador guardado solo en tu teléfono.");
   if(queue&&await network())await sendQueue();
  }catch(e){Alert.alert("No se pudo guardar",e.message);}
 }
 function confirmRemove(record){
  if(!effective(access,selectedType+".delete"))return Alert.alert("Sin permiso","No puedes eliminar este contenido");
  Alert.alert("Eliminar contenido","Esta acción elimina datos del servidor. ¿Continuar?",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:async()=>{
    try{await api.remove(selectedType,record.id||record.content_key);await reloadCatalog();setMessage("Contenido eliminado");}
    catch(e){Alert.alert("No se pudo eliminar",e.message);}
   }}
  ]);
 }
 async function logout(){await auth.signOut();setSession(null);setAccess(null);setLists({});setDrafts([]);setTab("Inicio");setMessage("");}
 async function createRole(){
  if(!newRole.trim())return Alert.alert("Nombre requerido");
  try{if(editingRole)await api.changeRole({id:editingRole,name:newRole,description:roleDescription,permissions:rolePermissions});
   else await api.createRole({name:newRole,description:roleDescription,permissions:rolePermissions});
   setEditingRole(null);setShowRoleEditor(false);setNewRole("");setRoleDescription("");setRolePermissions([]);await loadUsers();setMessage("Rol guardado.");
  }catch(e){Alert.alert("Error de rol",e.message);}
 }
 async function sendInvite(){
  if(!inviteEmail.trim()||!inviteRoles.length)return Alert.alert("Faltan datos","Indica correo y al menos un rol.");
  try{await api.invite(inviteEmail.trim(),inviteRoles);setMessage("Invitación preparada para "+inviteEmail+". Comparte el correo y pide registrarse con esa dirección.");setInviteEmail("");}
  catch(e){Alert.alert("Invitación",e.message);}
 }
 function usersPanel(){
  if(!access?.owner)return h(View,{style:S.card},txt("Solo el superadministrador puede gestionar usuarios y roles.",S.subtitle));
  return h(View,{style:{gap:15}},
   heading("Administradores y roles"),
   txt("Solo tú gestionas invitaciones, permisos, suspensiones y roles. Los usuarios pueden tener varios roles.",S.subtitle),
   button(showRoleEditor?"Cerrar nuevo rol":"+ Crear rol personalizado",()=>setShowRoleEditor(!showRoleEditor),"secondary"),
   showRoleEditor?h(View,{style:S.card},
    input("Nombre del rol",newRole,setNewRole),
    input("Descripción",roleDescription,setRoleDescription),
    txt("Permisos por apartado",S.label),
    RESOURCES.map(([resource,label])=>h(View,{key:resource,style:{gap:8}},txt(label,S.itemTitle),
     wrapChips(ACTIONS.map(([verb,name])=>[resource+"."+verb,name]),rolePermissions,v=>setRolePermissions(old=>old.includes(v)?old.filter(x=>x!==v):[...old,v])))),
    button("Guardar rol",createRole)
   ):null,
   heading("Roles existentes"),
   roles.map(r=>h(View,{key:r.id,style:S.card},txt(r.name,S.itemTitle),txt(r.description||"Sin descripción",S.note),txt((r.permissions||[]).join(" · "),S.caption),
    button("Editar este rol",()=>{setEditingRole(r.id);setNewRole(r.name);setRoleDescription(r.description||"");setRolePermissions(r.permissions||[]);setShowRoleEditor(true);},"secondary"))),
   heading("Invitar a un administrador"),
   input("Correo del invitado",inviteEmail,setInviteEmail,{email:true}),
   txt("Asignar uno o varios roles",S.label),
   wrapChips(roles.map(r=>[r.id,r.name]),inviteRoles,id=>setInviteRoles(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])),
   button("Preparar invitación",sendInvite,null,!inviteRoles.length),
   heading("Usuarios autorizados"),
   profiles.map(u=>h(View,{key:u.user_id,style:S.card},
    txt(u.display_name||u.email||u.user_id,S.itemTitle),txt(u.email||"",S.itemSub),
    txt(blockedUsers.some(b=>b.user_id===u.user_id)?"ACCESO BLOQUEADO":"Roles activos",blockedUsers.some(b=>b.user_id===u.user_id)?S.error:S.caption),
    wrapChips(roles.map(r=>[r.id,r.name]),assigned[u.user_id]||[],async id=>{
     const current=assigned[u.user_id]||[];const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];
     try{await api.assignUserRoles(u.user_id,next);setAssigned(old=>({...old,[u.user_id]:next}));}catch(e){Alert.alert("Error",e.message);}
    }),
    h(View,{style:S.row},button("Bloquear acceso",()=>Alert.alert("Bloquear administrador","Sus permisos dejarán de funcionar al consultar el servidor.",[
      {text:"Cancelar"},{text:"Bloquear",style:"destructive",onPress:async()=>{try{await api.blockUser(u.user_id,"Revocado por propietario");await loadUsers();}catch(e){Alert.alert("Error",e.message);}}}
    ]),"danger"),button("Restaurar",async()=>{try{await api.unblockUser(u.user_id);await loadUsers();}catch(e){Alert.alert("Error",e.message);}},"secondary")))
   ))
  );
 }
 function editorPanel(){
  if(!form)return null;
  const specs=FIELDS[selectedType]||[];
  const song=selectedType==="songs";
  const available= song && section==="Datos"?specs.filter(x=>!["lyrics","links","capos"].includes(x[0])):
    song&&section==="Letra"?specs.filter(x=>x[0]==="lyrics"):
    song&&section==="Capos"?specs.filter(x=>x[0]==="capos"):
    song&&section==="Enlaces"?specs.filter(x=>x[0]==="links"):song?[]:specs;
  const update=(key,v)=>setForm(f=>({...f,[key]:v}));
  return h(View,{style:{gap:14}},
   h(View,{style:S.apart},h(View,null,txt("Editar "+(TITLES[selectedType]||selectedType),S.kicker),txt(form.title||form.name||"Nuevo contenido",S.section)),button("Volver",()=>{setForm(null);setTab(selectedType==="songs"?"Cantos":"Catálogo");},"secondary")),
   song?wrapChips(["Datos","Letra","Capos","Enlaces","Vista previa"].map(x=>[x,x]),section,setSection):null,
   section==="Vista previa"&&song?h(View,{style:S.preview},
    txt(form.title||"Canto sin título",S.section),
    txt("TONO "+(form.tone||"—")+" · CAPO "+(form.capo_position||0),S.caption),
    renderLines(form.lyrics).map((r,i)=>txt(r.text,[r.type==="chords"?S.chords:r.type==="section"?S.kicker:S.lyrics,{marginTop:r.type==="section"?10:0}]))
   ):available.map(spec=>h(Field,{key:spec[0],spec,form,onChange:update,lists})),
   h(View,{style:S.divider}),
   h(View,{style:{gap:9}},button("Guardar borrador local",()=>saveDraft(false),"secondary"),
    button("Enviar a publicación",()=>saveDraft(true),null,!canPublish(access,selectedType)&&!offline)),
   txt("Sin internet se guarda localmente. La publicación se confirma solo después de verificar sesión y permisos en Supabase.",S.note)
  );
 }
 function catalogPanel(type){
  const rows=(lists[type]||[]).filter(x=>displayTitle(type,x).toLowerCase().includes(search.toLowerCase()));
  return h(View,{style:{gap:13}},
   h(View,{style:S.apart},heading(TITLES[type]),button("+ Nuevo",()=>begin(type),null,!canEdit(access,type)&&!offline)),
   input("Buscar "+TITLES[type],search,setSearch),
   rows.map(r=>h(View,{key:String(r.id||r.content_key),style:S.item},
    itemRow(displayTitle(type,r),(r.tone?"Tono "+r.tone:"")+(r.song_type?" · "+r.song_type:""),()=>begin(type,r)),
    !!access&&effective(access,type+".delete")?button("Eliminar",()=>confirmRemove(r),"danger"):null
   )),
   !rows.length&&txt("No hay registros descargados. Conéctate y pulsa Actualizar para consultar el catálogo.",S.note)
  );
 }
 function pendingPanel(){
  return h(View,{style:{gap:14}},heading("Guardados en este teléfono"),
   txt("Los borradores no salen de tu dispositivo hasta que pulses Enviar a publicación. La cola se reintenta con internet.",S.subtitle),
   button(busy?"Sincronizando...":"Sincronizar pendientes",sendQueue,null,busy||offline),
   drafts.map(d=>h(View,{key:d.id,style:S.card},
    h(View,{style:S.apart},txt(displayTitle(d.type,d.body),S.itemTitle),txt(d.status.toUpperCase(),{color:d.status==="conflict"?C.danger:C.green,fontSize:10,fontWeight:"800"})),
    txt(TITLES[d.type]||d.type,S.itemSub),d.error?txt(d.error,S.error):null,
    h(View,{style:S.row},
     button("Editar",()=>begin(d.type,null,d),"secondary"),
     button(d.status==="queued"?"Volver a borrador":"Enviar",async()=>{await store.upsertDraft(owner,{...d,status:d.status==="queued"?"draft":"queued"});await reloadDrafts();},"secondary"),
     button("Borrar",()=>Alert.alert("Eliminar borrador local","No podrás recuperar los cambios sin publicar.",[
      {text:"Cancelar"},{text:"Eliminar",style:"destructive",onPress:async()=>{await store.dropDraft(owner,d.id);await reloadDrafts();}}
     ]),"danger")))),
   !drafts.length&&txt("No hay borradores pendientes.",S.note)
  );
 }
 function homePanel(){
  return h(View,{style:{gap:15}},
   txt("HOLA, ADMINISTRACIÓN",S.kicker),txt("Bienvenido a SHALOM",S.title),
   txt("Un mismo cancionero para la página y las apps. Adminístralo desde cualquier lugar.",S.subtitle),
   h(View,{style:S.row},...[["Cantos",(lists.songs||[]).length],["Artistas",(lists.artists||[]).length],["Pendientes",drafts.length]].map(([label,value])=>h(View,{key:label,style:S.metric},txt(value,S.metricNumber),txt(label,S.caption)))),
   h(View,{style:S.card},txt("Continuar trabajando",S.section),txt("Crea, corrige o publica incluso si no tienes conexión.",S.note),button("+ Crear canto",()=>begin("songs"))),
   h(View,{style:S.card},txt("Misa y repertorios",S.section),txt("Prepara las celebraciones y ensayos de SHALOM.",S.note),button("Administrar repertorios",()=>{setSelectedType("repertoires");setTab("Catálogo");},"secondary")),
   button(busy?"Actualizando...":"↻ Actualizar y sincronizar",refresh,"secondary",busy||offline),
   txt("Sesión: "+(session?.email||"")+(access?.owner?" · Superadministrador":""),S.note),
   button("Cerrar sesión",logout,"secondary")
  );
 }
 if(boot)return h(View,{style:{flex:1,backgroundColor:C.bg,justifyContent:"center",alignItems:"center"}},h(ActivityIndicator,{color:C.green}),txt("Preparando SHALOM Admin...",S.subtitle));
 if(!session)return h(Login,{onSuccess:hydrate});
 return h(SafeAreaView,{style:S.screen,edges:["top","bottom"]},
  h(View,{style:{paddingHorizontal:18,paddingVertical:13,borderBottomColor:C.border,borderBottomWidth:1}},
   h(View,{style:S.apart},h(View,null,txt("SHALOM  ·  ADMIN",S.brand),txt("Panel privado · minimalista",S.caption)),
    h(Pressable,{onPress:refresh,disabled:busy},txt(offline?"SIN CONEXIÓN":"● CONECTADO",{color:offline?C.danger:C.green,fontSize:10,fontWeight:"800"})))),
  h(ScrollView,{keyboardShouldPersistTaps:"handled",contentContainerStyle:S.body},
   !!message&&h(View,{style:S.warning},txt(message,S.note),button("Cerrar aviso",()=>setMessage(""),"secondary")),
   tab==="Inicio"?homePanel():tab==="Editor"?editorPanel():tab==="Cantos"?catalogPanel("songs"):tab==="Catálogo"?
    h(View,{style:{gap:13}},wrapChips(catalogTabs.map(x=>[x,TITLES[x]]),selectedType,v=>{setSelectedType(v);setSearch("");}),catalogPanel(catalogTabs.includes(selectedType)?selectedType:"artists")):
    tab==="Pendientes"?pendingPanel():usersPanel()
  ),
  tab!=="Editor"?h(View,{style:S.nav},tabs.map(([name,symbol])=>h(Pressable,{key:name,style:[S.navItem,tab===name&&S.navCurrent],onPress:()=>{setTab(name);setSearch("");if(name==="Catálogo"&&!catalogTabs.includes(selectedType))setSelectedType("artists");}},
   txt(symbol,[S.navSymbol,tab===name&&{color:C.green}]),txt(name,[S.navText,tab===name&&{color:C.text}])))):null
 );
}
module.exports=function App(){return h(SafeAreaProvider,null,h(Main));};
