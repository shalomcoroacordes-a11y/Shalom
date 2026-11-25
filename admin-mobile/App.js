"use strict";
const React=require("react");
const {useState,useEffect,useRef}=React;
const RN=require("react-native");
const {View,Text,Pressable,ScrollView,Platform,Alert,AppState,ActivityIndicator,BackHandler}=RN;
const {SafeAreaProvider,SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const SecureStore=require("expo-secure-store");
const Crypto=require("expo-crypto");
const NetInfo=require("@react-native-community/netinfo").default;
const {S,C}=require("./src/styles");
const {TITLES,FIELDS,initial,fromServer,draftRecord,displayTitle}=require("./src/model");
const {RESOURCES,ACTIONS,effective,canPublish,canEdit,mapped}=require("./src/permissions");
const {TABLES}=require("./src/config");
const {renderLines}=require("./src/score");
const {txt,heading,button,input,wrapChips,itemRow}=require("./src/components/Controls");
const {Field}=require("./src/components/EditorFields");
const {createAuth}=require("./src/auth");
const {createApi}=require("./src/api");
const {recoveryFormat}=require("./src/trash-format");
const {createSync}=require("./src/sync");
const store=require("./src/store");
const h=React.createElement;
const auth=createAuth(fetch,SecureStore);
const api=createApi(fetch,auth);
const network=async()=>{const n=await NetInfo.fetch();return !!(n.isConnected&&n.isInternetReachable!==false);};
const sync=createSync(api,auth,network);
const tabs=[["Inicio","⌂"],["Cantos","♫"],["Catálogo","▤"],["Pendientes","⇧"],["Usuarios","♙"]];
const catalogTabs=["artists","albums","categories","repertoires","medleys","contact_messages","home_recommendations","site_content","donation_settings"];
function localId(){return Crypto.randomUUID();}
function Login({onSuccess}){
 const [email,setEmail]=useState(""),[pass,setPass]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[creating,setCreating]=useState(false);
 useEffect(()=>{if(Platform.OS!=="android")return;const sub=BackHandler.addEventListener("hardwareBackPress",()=>{if(busy)return true;if(creating){setCreating(false);setMessage("");return true;}return false});return()=>sub.remove()},[creating,busy]);
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
  button("Olvidé mi contraseña",async()=>{if(!email.trim())return setMessage("Escribe tu correo primero");try{await auth.requestRecovery(email);setMessage("Solicitud enviada. Consulta tu correo para restablecer la contraseña.");}catch(e){setMessage(e.message);}},"secondary"),
  !!message&&txt(message,S.error),
  txt("La primera sesión requiere internet. Tus borradores posteriores se guardan en el dispositivo.",S.note)
 );
}
function Main(){
 const insets=useSafeAreaInsets();
 const [session,setSession]=useState(null),[access,setAccess]=useState(null),[boot,setBoot]=useState(true);
 const [tab,setTab]=useState("Inicio"),[selectedType,setSelectedType]=useState("songs"),[form,setForm]=useState(null),[editing,setEditing]=useState(null);
 const [section,setSection]=useState("Datos"),[lists,setLists]=useState({}),[drafts,setDrafts]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [search,setSearch]=useState(""),[offline,setOffline]=useState(false),[roles,setRoles]=useState([]),[profiles,setProfiles]=useState([]);
 const [newRole,setNewRole]=useState(""),[roleDescription,setRoleDescription]=useState(""),[rolePermissions,setRolePermissions]=useState([]);
 const [inviteEmail,setInviteEmail]=useState(""),[inviteRoles,setInviteRoles]=useState([]),[showRoleEditor,setShowRoleEditor]=useState(false),[editingRole,setEditingRole]=useState(null),[assigned,setAssigned]=useState({}),[blockedUsers,setBlockedUsers]=useState([]);
 const [overrides,setOverrides]=useState({}),[overrideUser,setOverrideUser]=useState(null),[trash,setTrash]=useState([]);
 const [studioPayload,setStudioPayload]=useState(null),[studioStatus,setStudioStatus]=useState(null);
 const editorOrigin=useRef("Cantos"),editorBaseline=useRef(null),leavingEditor=useRef(false);
 const owner=session?.user_id;
 async function hydrate(s){
  setSession(s);setBoot(false);
  if(!s)return;
  const d=await store.listDrafts(s.user_id);setDrafts(d);
  const cached=await sync.snapshot(s.user_id);setLists(cached);
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
   if(on){if(access?.authorized)sendQueue();else refresh();}
  });
  const app=AppState.addEventListener("change",state=>{if(state==="active"&&access?.authorized)sendQueue();});
  return()=>{active=false;unsub();app.remove();};
 },[owner,access?.authorized]);
 async function reloadDrafts(){if(owner)setDrafts(await store.listDrafts(owner));}
 async function reloadCatalog(id=owner){
  if(!id)return;
  const r=await sync.pull(id);
  if(r?.offline){setOffline(true);return;}
  const o=await sync.snapshot(id);
  setLists(o);setOffline(false);
 }
 async function loadUsers(a=access){
  if(!a?.owner)return;
  try{
   const [r,u,assignments,blocks,exceptions,trashItems]=await Promise.all([api.roles(),api.list("admin_profiles"),api.list("admin_user_roles"),api.list("admin_access_blocks"),api.list("admin_permission_overrides"),api.list("admin_trash")]);
   setRoles(r);setProfiles(u);setBlockedUsers(blocks);setTrash(trashItems);
   setOverrides(Object.fromEntries(u.map(p=>[p.user_id,Object.fromEntries(exceptions.filter(x=>x.user_id===p.user_id).map(x=>[x.permission,x.allowed]))])));
   setAssigned(Object.fromEntries(u.map(p=>[p.user_id,assignments.filter(x=>x.user_id===p.user_id).map(x=>x.role_id)])));
  }catch(e){setMessage("Permisos: "+e.message);}
 }
 async function sendQueue(){
  if(!owner||busy)return;
  try{const r=await sync.push(owner);await reloadDrafts();
   if(r?.sent){setMessage(r.sent+" publicación(es) sincronizadas");await reloadCatalog();}
   if(r?.failed||r?.conflicts)setMessage("Pendientes: "+r.failed+" errores, "+r.conflicts+" conflictos. Revisar.");
   if(r?.preserved)setMessage(value=>(value?value+" · ":"")+r.preserved+" borrador(es) cambiaron durante el envío; se conservó la versión actual.");
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
  editorOrigin.current=tab;const nextForm=fromDraft?{...fromDraft.body}:record?fromServer(table,record,lists):initial(table);editorBaseline.current=JSON.stringify(nextForm);
  setSelectedType(table);setSection("Datos");setTab("Editor");
  setEditing({id:fromDraft?.id||record?.id||record?.content_key||(table==="site_content"?"new":localId()),expected:fromDraft?.expected_updated||record?.updated_at||null});
  setForm(nextForm);
 }
 async function saveDraft(queue=false){
  if(!owner||!form||!editing)return;
  try{
   await store.upsertDraft(owner,draftRecord(selectedType,form,editing,queue));
   await reloadDrafts();setTab("Pendientes");setForm(null);
   setMessage(queue?"Guardado en cola; se publicará al recuperar internet y validar permisos.":"Borrador guardado solo en tu teléfono.");
   if(queue&&await network())await sendQueue();
  }catch(e){Alert.alert("No se pudo guardar",e.message);}
 }
 function confirmRemove(record){
  if(!effective(access,mapped(selectedType)+".delete"))return Alert.alert("Sin permiso","No puedes eliminar este contenido");
  Alert.alert("Eliminar contenido","Esta acción elimina datos del servidor. ¿Continuar?",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:async()=>{
    try{await api.remove(selectedType,record.id||record.content_key);await reloadCatalog();setMessage("Contenido eliminado");}
    catch(e){Alert.alert("No se pudo eliminar",e.message);}
   }}
  ]);
 }
 async function logout(){setStudioPayload(null);await auth.signOut();setSession(null);setAccess(null);setLists({});setDrafts([]);setTab("Inicio");setMessage("");}
 async function createRole(){
  if(!newRole.trim())return Alert.alert("Nombre requerido");
  try{if(editingRole)await api.changeRole({id:editingRole,name:newRole,description:roleDescription,permissions:rolePermissions});
   else await api.createRole({name:newRole,description:roleDescription,permissions:rolePermissions});
   setEditingRole(null);setShowRoleEditor(false);setNewRole("");setRoleDescription("");setRolePermissions([]);await loadUsers();setMessage("Rol guardado.");
  }catch(e){Alert.alert("Error de rol",e.message);}
 }
 async function updateOverride(userId,permission){
  const old=overrides[userId]||{};
  const exists=Object.prototype.hasOwnProperty.call(old,permission);
  const next=!exists?true:old[permission]===true?false:null;
  try{await api.setPermissionOverride(userId,permission,next);
   setOverrides(value=>{const u={...(value[userId]||{})};if(next===null)delete u[permission];else u[permission]=next;return {...value,[userId]:u};});
  }catch(e){Alert.alert("Error de permiso",e.message);}
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
    button(overrideUser===u.user_id?"Ocultar permisos individuales":"Permisos individuales",()=>setOverrideUser(overrideUser===u.user_id?null:u.user_id),"secondary"),
    overrideUser===u.user_id?h(View,{style:{gap:12}},txt("Permiso individual: ✓ permitir, ✕ denegar, · heredar del rol",S.note),
      RESOURCES.map(([resource,label])=>h(View,{key:resource,style:{gap:5}},txt(label,S.itemTitle),
        wrapChips(ACTIONS.map(([verb,name])=>{const key=resource+"."+verb;const val=(overrides[u.user_id]||{})[key];return [key,name+" "+(val===true?"✓":val===false?"✕":"·")];}),
        Object.entries(overrides[u.user_id]||{}).filter(([_,value])=>value===true).map(([key])=>key),
        key=>updateOverride(u.user_id,key))
      ))):null,
    h(View,{style:S.row},button("Bloquear acceso",()=>Alert.alert("Bloquear administrador","Sus permisos dejarán de funcionar al consultar el servidor.",[
      {text:"Cancelar"},{text:"Bloquear",style:"destructive",onPress:async()=>{try{await api.blockUser(u.user_id,"Revocado por propietario");await loadUsers();}catch(e){Alert.alert("Error",e.message);}}}
    ]),"danger"),button("Restaurar",async()=>{try{await api.unblockUser(u.user_id);await loadUsers();}catch(e){Alert.alert("Error",e.message);}},"secondary")))
   ),
   heading("Papelera de cantos"),
   txt("Conserva el canto eliminado con sus enlaces, capos y relaciones para poder restaurarlo.",S.note),
   trash.filter(t=>t.item_type==="song").map(t=>{
    const format=recoveryFormat(t);
    return h(View,{key:t.id,style:S.card},
     txt(t.item_name||"Canto eliminado",S.itemTitle),txt("Eliminado el "+String(t.deleted_at||"").slice(0,10),S.itemSub),
     format==="native"?button("Restaurar canto",()=>Alert.alert("Restaurar canto","Se recuperará el canto con sus relaciones guardadas si los artistas y categorías todavía existen.",[
      {text:"Cancelar"},{text:"Restaurar",onPress:async()=>{try{const restored=await api.restoreSong(t.id);if(restored!==true)throw Error("No se confirmó la restauración del canto.");await loadUsers();await reloadCatalog();setMessage("Canto restaurado de la papelera.");}catch(e){Alert.alert("No se pudo restaurar",e.message);}}}
     ]),"secondary"):txt(format==="web"?"Respaldo del administrador web. Restáuralo desde Respaldo en SHALOM Admin web.":"Formato de respaldo no reconocido. Conserva esta copia y revisa su contenido antes de restaurar.",S.note));
   }),
   !trash.some(t=>t.item_type==="song")&&txt("No hay cantos en la papelera.",S.note)
  );
 }
 async function getStudioState(saved){
  const local=(await store.cachedList(owner,"studio:"+saved.id))[0];let arrangement=null,checked=false;
  if(!offline){const rows=await api.raw("/rest/v1/song_studio_arrangements?select=arrangement,song_revision&song_id=eq."+encodeURIComponent(saved.id)+"&song_revision=eq."+encodeURIComponent(saved.updated_at)+"&limit=1");arrangement=rows?.[0]?.arrangement||null;checked=true;await store.cacheList(owner,"studio-published:"+saved.id,arrangement?[{id:saved.id,revision:saved.updated_at,arrangement}]:[]);}
  else{const old=(await store.cachedList(owner,"studio-published:"+saved.id))[0];if(old?.revision===saved.updated_at)arrangement=old.arrangement;}
  return {id:saved.id,revision:saved.updated_at,arrangement,draft:local?.revision===saved.updated_at?local.arrangement:null,checked};
 }
 useEffect(()=>{let active=true;const saved=(lists.songs||[]).find(s=>s.id===editing?.id);setStudioStatus(null);if(tab==="Editor"&&selectedType==="songs"&&owner&&saved?.updated_at)getStudioState(saved).then(s=>{if(active)setStudioStatus(s)}).catch(()=>{if(active)setStudioStatus({id:saved.id,error:true})});return()=>{active=false};},[owner,editing?.id,tab,selectedType,offline,lists.songs,studioPayload===null]);
 async function openStudio(){
  const saved=(lists.songs||[]).find(s=>s.id===editing?.id);
  if(!saved?.updated_at||String(form?.lyrics||"")!==String(saved.lyrics||""))return Alert.alert("SHALOM Studio","Publica primero la letra y los acordes del canto.");
  try{
   const state=await getStudioState(saved);setStudioStatus(state);
   setStudioPayload({type:"shalom-studio-init",mode:"admin",song:{id:saved.id,title:saved.title,lyrics:saved.lyrics||"",revision:saved.updated_at},arrangement:state.arrangement,draft:state.draft,shift:0,capo:0});
  }catch(e){Alert.alert("SHALOM Studio",e.message);}
 }
 async function studioDraft(arrangement){
  if(!owner||!studioPayload)throw Error("Sesión no disponible.");
  const song=studioPayload.song;
  await store.cacheList(owner,"studio:"+song.id,[{id:song.id,revision:song.revision,arrangement}]);
 }
 async function studioPublish(arrangement){
  if(!owner||!studioPayload||!await network())throw Error("Conéctate para publicar. Puedes guardar un borrador local.");
  const current=await api.myAccess();if(!canPublish(current,"songs"))throw Error("No tienes permiso de publicación.");
  const song=studioPayload.song;
  const rows=await api.raw("/rest/v1/song_studio_arrangements?on_conflict=song_id&select=song_id,song_revision","POST",{song_id:song.id,song_revision:song.revision,arrangement},"resolution=merge-duplicates,return=representation");
  if(!Array.isArray(rows)||rows[0]?.song_id!==song.id)throw Error("No se confirmó la publicación.");
  const verified=await api.raw("/rest/v1/song_studio_arrangements?select=arrangement,song_revision&song_id=eq."+encodeURIComponent(song.id)+"&song_revision=eq."+encodeURIComponent(song.revision)+"&limit=1");
  if(!verified?.[0]?.arrangement)throw Error("No se pudo verificar la publicación. Vuelve a abrir Studio para revisar el estado.");
  const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);if(canonical(verified[0].arrangement)!==canonical(arrangement))throw Error("La versión guardada difiere de la enviada. Revisa Studio.");
  await store.cacheList(owner,"studio-published:"+song.id,[{id:song.id,revision:song.revision,arrangement}]);
  await store.cacheList(owner,"studio:"+song.id,[]);
 }
 function leaveEditor(){
  if(leavingEditor.current)return;
  const leave=()=>{leavingEditor.current=false;setForm(null);setEditing(null);setSection("Datos");setTab(editorOrigin.current==="Editor"?(selectedType==="songs"?"Cantos":"Catálogo"):editorOrigin.current);};
  if(form&&JSON.stringify(form)!==editorBaseline.current){leavingEditor.current=true;Alert.alert("Cambios sin guardar","¿Quieres salir del editor? Los cambios nuevos se perderán.",[{text:"Seguir editando",style:"cancel",onPress:()=>{leavingEditor.current=false}},{text:"Salir sin guardar",style:"destructive",onPress:leave}],{cancelable:true,onDismiss:()=>{leavingEditor.current=false}});}
  else leave();
 }
 function adminBack(){
  if(!session||boot)return false;
  if(tab==="Editor"){if(section!=="Datos"){setSection("Datos");return true;}leaveEditor();return true;}
  if(tab==="Usuarios"){if(overrideUser){setOverrideUser(null);return true;}if(showRoleEditor){setShowRoleEditor(false);return true;}}
  if(search){setSearch("");return true;}
  if(tab!=="Inicio"){setTab("Inicio");return true;}
  return false;
 }
 useEffect(()=>{if(Platform.OS!=="android")return;const sub=BackHandler.addEventListener("hardwareBackPress",adminBack);return()=>sub.remove()},[session,boot,tab,section,form,search,overrideUser,showRoleEditor,selectedType]);
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
   h(View,{style:S.apart},h(View,null,txt("Editar "+(TITLES[selectedType]||selectedType),S.kicker),txt(form.title||form.name||"Nuevo contenido",S.section)),button("Volver",adminBack,"secondary")),
   song?wrapChips(["Datos","Letra","Capos","Enlaces","Vista previa"].map(x=>[x,x]),section,setSection):null,
   section==="Vista previa"&&song?h(View,{style:S.preview},
    txt(form.title||"Canto sin título",S.section),
    txt("TONO "+(form.tone||"—")+" · CAPO "+(form.capo_position||0),S.caption),
    h(ScrollView,{horizontal:true,nestedScrollEnabled:true,showsHorizontalScrollIndicator:true,
      contentContainerStyle:{paddingVertical:8,minWidth:"100%"}},
      h(View,{style:{gap:2}},renderLines(form.lyrics).map((r,i)=>h(Text,{key:"line"+i,
       style:[r.type==="chords"?S.chords:r.type==="section"?S.kicker:S.lyrics,
        {fontSize:r.type==="section"?12:15,lineHeight:24,marginTop:r.type==="section"?12:0}]},r.text))))
   ):h(View,{style:{gap:12}},available.map(spec=>h(Field,{key:spec[0],spec,form,onChange:update,lists,createId:localId}))),
   song&&editing?.expected?h(View,{style:{gap:6}},txt("SHALOM Studio",S.kicker),txt(studioStatus?.id!==editing.id?"Consultando acompañamiento…":studioStatus.error?"No se pudo consultar el estado":studioStatus.draft?(studioStatus.arrangement?"Borrador local · hay una versión publicada":"Borrador local · todavía no publicado"):studioStatus.arrangement?(studioStatus.checked?"✓ Acompañamiento publicado":"Acompañamiento guardado en caché · sin conexión"):(studioStatus.checked?"Sin acompañamiento publicado":"Sin información local · sin conexión"),S.note),button(studioStatus?.id===editing.id&&(studioStatus.arrangement||studioStatus.draft)?"Abrir acompañamiento de guitarra":"Configurar acompañamiento de guitarra",openStudio,"secondary")):null,
   h(View,{style:S.divider}),
   h(View,{style:{gap:9}},button("Guardar borrador local",()=>saveDraft(false),"secondary"),
    button("Enviar a publicación",()=>saveDraft(true),null,!canPublish(access,selectedType)&&!offline)),
   txt("Sin internet se guarda localmente. La publicación se confirma solo después de verificar sesión y permisos en Supabase.",S.note)
  );
 }
 function catalogPanel(type){
  const rows=(lists[type]||[]).filter(x=>displayTitle(type,x).toLowerCase().includes(search.toLowerCase()));
  return h(View,{style:{gap:13}},
   h(View,{style:S.apart},heading(TITLES[type]),type==="contact_messages"?null:button("+ Nuevo",()=>begin(type),null,!canEdit(access,type)&&!offline)),
   input("Buscar "+TITLES[type],search,setSearch),
   rows.map(r=>h(View,{key:String(r.id||r.content_key),style:S.item},
    itemRow(displayTitle(type,r),(r.tone?"Tono "+r.tone:"")+(r.song_type?" · "+r.song_type:""),()=>begin(type,r)),
    !!access&&effective(access,mapped(type)+".delete")?button("Eliminar",()=>confirmRemove(r),"danger"):null
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
     button(d.status==="queued"?"Volver a borrador":"Enviar",async()=>{const changed=await store.transitionDraft(owner,d,d.status==="queued"?"draft":"queued",null);await reloadDrafts();if(!changed)setMessage("El borrador cambió. Revisa la versión actual.");},"secondary"),
     button("Borrar",()=>Alert.alert("Eliminar borrador local","No podrás recuperar los cambios sin publicar.",[
      {text:"Cancelar"},{text:"Eliminar",style:"destructive",onPress:async()=>{const removed=await store.completeDraft(owner,d);await reloadDrafts();if(!removed)setMessage("El borrador cambió. Se conservó la versión actual.");}}
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
 if(!session)return h(SafeAreaView,{style:S.screen,edges:["top","bottom"]},h(Login,{onSuccess:hydrate}));
 return h(SafeAreaView,{style:S.screen,edges:["top"]},
  h(View,{style:{paddingHorizontal:18,paddingVertical:13,borderBottomColor:C.border,borderBottomWidth:1}},
   h(View,{style:S.apart},h(View,null,txt("SHALOM  ·  ADMIN",S.brand),txt("Panel privado · minimalista",S.caption)),
    h(Pressable,{onPress:refresh,disabled:busy},txt(offline?"SIN CONEXIÓN":"● CONECTADO",{color:offline?C.danger:C.green,fontSize:10,fontWeight:"800"})))),
  h(ScrollView,{style:{flex:1},keyboardShouldPersistTaps:"handled",keyboardDismissMode:"on-drag",
    contentContainerStyle:[S.body,{paddingBottom:tab==="Editor"?Math.max(32,insets.bottom+24):24}]},
   !!message&&h(View,{style:S.warning},h(View,{style:{flex:1}},txt(message,S.note)),
    h(Pressable,{onPress:()=>setMessage(""),accessibilityRole:"button",accessibilityLabel:"Cerrar aviso",style:{paddingHorizontal:7,paddingVertical:5}},txt("✕",{fontSize:17,color:C.muted}))),
   tab==="Inicio"?homePanel():tab==="Editor"?editorPanel():tab==="Cantos"?catalogPanel("songs"):tab==="Catálogo"?
    h(View,{style:{gap:13}},wrapChips(catalogTabs.map(x=>[x,TITLES[x]]),selectedType,v=>{setSelectedType(v);setSearch("");}),catalogPanel(catalogTabs.includes(selectedType)?selectedType:"artists")):
    tab==="Pendientes"?pendingPanel():usersPanel()
  ),
  studioPayload?h(require("./src/studio-screen"),{payload:studioPayload,onClose:()=>setStudioPayload(null),onSaveDraft:studioDraft,onPublish:studioPublish}):null,
  tab!=="Editor"?h(View,{style:[S.navShell,{paddingBottom:Math.max(insets.bottom,Platform.OS==="android"?24:12)}]},
   h(View,{style:S.nav},tabs.map(([name,symbol])=>h(Pressable,{
     key:name,
     style:[S.navItem,tab===name&&S.navCurrent],
     accessibilityRole:"tab",
     accessibilityState:{selected:tab===name},
     accessibilityLabel:name,
     onPress:()=>{setTab(name);setSearch("");if(name==="Catálogo"&&!catalogTabs.includes(selectedType))setSelectedType("artists");}
    },
    txt(symbol,[S.navSymbol,tab===name&&{color:C.green}]),
    txt(name,[S.navText,tab===name&&{color:C.text}]))))):null
 );
}
module.exports=function App(){return h(SafeAreaProvider,null,h(Main));};
