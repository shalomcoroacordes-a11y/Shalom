"use strict";
const React=require("react");
const {useState,useEffect,useRef}=React;
const RN=require("react-native");
const {View,Pressable,ScrollView,Platform,Alert,AppState,ActivityIndicator,BackHandler}=RN;
const {SafeAreaProvider,SafeAreaView,useSafeAreaInsets}=require("react-native-safe-area-context");
const SecureStore=require("expo-secure-store");
const Crypto=require("expo-crypto");
const NetInfo=require("@react-native-community/netinfo").default;
const {S,C}=require("./src/styles");
const {TITLES}=require("./src/model");
const {createEditorController}=require("./src/editor-controller");
const {effective,mapped,canEdit}=require("./src/permissions");
const {txt,button,input,wrapChips}=require("./src/components/Controls");
const UsersScreen=require("./src/screens/UsersScreen");
const EditorScreen=require("./src/screens/EditorScreen");
const CatalogScreen=require("./src/screens/CatalogScreen");
const PendingScreen=require("./src/screens/PendingScreen");
const HomeScreen=require("./src/screens/HomeScreen");
const CalendarScreen=require("./src/screens/CalendarScreen");
const {draftSeed}=require("./src/calendar-core");
const {createAuth}=require("./src/auth");
const {createApi}=require("./src/api");
const {createSync}=require("./src/sync");
const {createStudioPersistence}=require("./src/studio-persistence");
const {createUserManagement}=require("./src/user-management");
const store=require("./src/store");
const h=React.createElement;
const auth=createAuth(fetch,SecureStore);
const api=createApi(fetch,auth);
const network=async()=>{const n=await NetInfo.fetch();return !!(n.isConnected&&n.isInternetReachable!==false);};
const sync=createSync(api,auth,network);
const studio=createStudioPersistence({api,store,network});
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
 const [calendarOpen,setCalendarOpen]=useState(false);
 const [search,setSearch]=useState(""),[offline,setOffline]=useState(false),[roles,setRoles]=useState([]),[profiles,setProfiles]=useState([]);
 const [newRole,setNewRole]=useState(""),[roleDescription,setRoleDescription]=useState(""),[rolePermissions,setRolePermissions]=useState([]);
 const [inviteEmail,setInviteEmail]=useState(""),[inviteRoles,setInviteRoles]=useState([]),[showRoleEditor,setShowRoleEditor]=useState(false),[editingRole,setEditingRole]=useState(null),[assigned,setAssigned]=useState({}),[blockedUsers,setBlockedUsers]=useState([]);
 const [overrides,setOverrides]=useState({}),[overrideUser,setOverrideUser]=useState(null),[trash,setTrash]=useState([]);
 const [studioPayload,setStudioPayload]=useState(null),[studioStatus,setStudioStatus]=useState(null);
 const [editorSaving,setEditorSaving]=useState(false);
 const editorRef=useRef(null),editorCallbacks=useRef(null);
 const owner=session?.user_id;
 editorCallbacks.current={owner,reloadDrafts,sendQueue};
 if(!editorRef.current)editorRef.current=createEditorController({store,createId:localId,alert:(...args)=>Alert.alert(...args),onBusy:setEditorSaving,notice:setMessage,apply:next=>{
  if("table" in next)setSelectedType(next.table);
  if("form" in next)setForm(next.form);
  if("editing" in next)setEditing(next.editing);
  if("section" in next)setSection(next.section);
  if("tab" in next)setTab(next.tab);
 },onSaved:async(id,queue)=>{
  if(editorCallbacks.current.owner!==id)return;
  await editorCallbacks.current.reloadDrafts();
  if(editorCallbacks.current.owner!==id)return;
  setMessage(queue?"Guardado en cola; se publicará al recuperar internet y validar permisos.":"Borrador guardado solo en tu teléfono.");
  if(queue&&await network()&&editorCallbacks.current.owner===id)await editorCallbacks.current.sendQueue();
 }});
 const editor=editorRef.current;
 const usersRef=useRef(null);
 if(!usersRef.current)usersRef.current=createUserManagement({api,auth,apply:data=>{
  setRoles(data.roles);setProfiles(data.profiles);setBlockedUsers(data.blocks);setTrash(data.trash);setAssigned(data.assigned);setOverrides(data.overrides);
 }});
 const users=usersRef.current;
 async function hydrate(s){
  editor.reset();users.reset(s?.user_id||null);setSession(s);setBoot(false);
  if(!s)return;
  const d=await store.listDrafts(s.user_id);setDrafts(d);
  const cached=await sync.snapshot(s.user_id);setLists(cached);
  if(await network()){
   try{const a=await api.myAccess();if(!a?.authorized)throw Error("Sin permisos de administración");
    setAccess(a);setOffline(false);
    await reloadCatalog(s.user_id);await loadUsers(a,s.user_id);
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
 async function loadUsers(a=access,id=owner){
  if(!a?.owner||!id)return;
  try{await users.load(id);}
  catch(e){setMessage("Permisos: "+e.message);}
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
 function begin(table,record,fromDraft){editor.begin({owner,table,record,fromDraft,lists,origin:tab});}
 function saveDraft(queue=false){return editor.save(queue);}
 function confirmRemove(type,record){
  if(!owner||!effective(access,mapped(type)+".delete"))return Alert.alert("Sin permiso","No puedes eliminar este contenido");
  Alert.alert("Eliminar contenido","Esta acción elimina datos del servidor. ¿Continuar?",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:async()=>{
    try{await api.remove(type,record.id||record.content_key,owner);if(editorCallbacks.current.owner===owner){await reloadCatalog();setMessage("Contenido eliminado");}}
    catch(e){Alert.alert("No se pudo eliminar",e.message);}
   }}
  ]);
 }
 async function logout(){editor.reset();editorCallbacks.current.owner=null;studioContext.current=null;users.reset();setOverrideUser(null);setEditingRole(null);setShowRoleEditor(false);setNewRole("");setRoleDescription("");setRolePermissions([]);setInviteEmail("");setInviteRoles([]);setForm(null);setEditing(null);setStudioPayload(null);await auth.signOut();setSession(null);setAccess(null);setLists({});setDrafts([]);setCalendarOpen(false);setTab("Inicio");setMessage("");}
 async function createRole(){
  if(!newRole.trim())return Alert.alert("Nombre requerido");
  try{if(editingRole)await api.changeRole({id:editingRole,name:newRole,description:roleDescription,permissions:rolePermissions});
   else await api.createRole({name:newRole,description:roleDescription,permissions:rolePermissions});
   setEditingRole(null);setShowRoleEditor(false);setNewRole("");setRoleDescription("");setRolePermissions([]);await loadUsers();setMessage("Rol guardado.");
  }catch(e){Alert.alert("Error de rol",e.message);}
 }
 async function updateOverride(userId,permission){
  try{await users.toggleOverride(owner,userId,permission);}
  catch(e){Alert.alert("Error de permiso",e.message);}
 }
 async function sendInvite(){
  if(!inviteEmail.trim()||!inviteRoles.length)return Alert.alert("Faltan datos","Indica correo y al menos un rol.");
  try{await api.invite(inviteEmail.trim(),inviteRoles);setMessage("Invitación preparada para "+inviteEmail+". Comparte el correo y pide registrarse con esa dirección.");setInviteEmail("");}
  catch(e){Alert.alert("Invitación",e.message);}
 }
 async function toggleRole(userId,id){try{await users.toggleRole(owner,userId,id);}catch(e){Alert.alert("Error",e.message);}}
 async function blockUser(userId){try{await api.blockUser(userId,"Revocado por propietario");await loadUsers();}catch(e){Alert.alert("Error",e.message);}}
 async function unblockUser(userId){try{await api.unblockUser(userId);await loadUsers();}catch(e){Alert.alert("Error",e.message);}}
 async function restoreSong(id){try{const restored=await api.restoreSong(id);if(restored!==true)throw Error("No se confirmó la restauración del canto.");await loadUsers();await reloadCatalog();setMessage("Canto restaurado de la papelera.");}catch(e){Alert.alert("No se pudo restaurar",e.message);}}
 function usersPanel(){return h(UsersScreen,{access,showRoleEditor,setShowRoleEditor,newRole,setNewRole,roleDescription,setRoleDescription,rolePermissions,setRolePermissions,createRole,roles,setEditingRole,inviteEmail,setInviteEmail,inviteRoles,setInviteRoles,sendInvite,profiles,blockedUsers,assigned,onToggleRole:toggleRole,overrideUser,setOverrideUser,overrides,updateOverride,onBlock:blockUser,onUnblock:unblockUser,trash,onRestore:restoreSong});}
 function studioSong(saved){return {id:saved.id,title:saved.title,lyrics:saved.lyrics||"",revision:saved.updated_at};}
 const studioContext=useRef(null);
 studioContext.current={owner,tab,selectedType,id:editing?.id,lyrics:form?.lyrics,revision:(lists.songs||[]).find(s=>s.id===editing?.id)?.updated_at};
 function getStudioState(saved){return studio.read(owner,studioSong(saved),offline);}
 useEffect(()=>{let active=true;const saved=(lists.songs||[]).find(s=>s.id===editing?.id);setStudioStatus(null);if(tab==="Editor"&&selectedType==="songs"&&owner&&saved?.updated_at)getStudioState(saved).then(s=>{if(active)setStudioStatus(s)}).catch(()=>{if(active)setStudioStatus({id:saved.id,error:true})});return()=>{active=false};},[owner,editing?.id,tab,selectedType,offline,lists.songs,studioPayload===null]);
 async function openStudio(){
  const saved=(lists.songs||[]).find(s=>s.id===editing?.id);
  if(!saved?.updated_at||String(form?.lyrics||"")!==String(saved.lyrics||""))return Alert.alert("SHALOM Studio","Publica primero la letra y los acordes del canto.");
  const context=studioContext.current;
  try{
   const state=await getStudioState(saved);
   const current=studioContext.current;
   if(!current||["owner","tab","selectedType","id","lyrics","revision"].some(key=>current[key]!==context[key]))return;
   setStudioStatus(state);
   setStudioPayload({type:"shalom-studio-init",mode:"admin",song:studioSong(saved),arrangement:state.arrangement,draft:state.draft,shift:0,capo:0});
  }catch(e){Alert.alert("SHALOM Studio",e.message);}
 }
 async function studioDraft(arrangement){
  if(!owner||!studioPayload)throw Error("Sesión no disponible.");
  return studio.saveDraft(owner,studioPayload.song,arrangement);
 }
 async function studioPublish(arrangement){
  if(!owner||!studioPayload)throw Error("Sesión no disponible.");
  return studio.publish(owner,studioPayload.song,arrangement);
 }

 function leaveEditor(){editor.leave();}
 function adminBack(){
  if(!session||boot)return false;
  if(tab==="Editor"){if(section!=="Datos"){setSection("Datos");return true;}leaveEditor();return true;}
  if(tab==="Usuarios"){if(overrideUser){setOverrideUser(null);return true;}if(showRoleEditor){setShowRoleEditor(false);return true;}}
  if(tab==="Catálogo"&&selectedType==="repertoires"&&calendarOpen){setCalendarOpen(false);return true;}
  if(search){setSearch("");return true;}
  if(tab!=="Inicio"){setTab("Inicio");return true;}
  return false;
 }
 useEffect(()=>{if(Platform.OS!=="android")return;const sub=BackHandler.addEventListener("hardwareBackPress",adminBack);return()=>sub.remove()},[session,boot,tab,section,form,search,overrideUser,showRoleEditor,selectedType,calendarOpen]);
 function editorPanel(){return h(EditorScreen,{form,selectedType,section,update:editor.update,adminBack,setSection,lists,localId,editing,studioStatus,openStudio,editorSaving,saveDraft,access,offline});}
 function catalogPanel(type){return h(CatalogScreen,{type,lists,search,setSearch,begin,access,offline,confirmRemove});}
 async function transitionPending(d){try{const changed=await store.transitionDraft(owner,d,d.status==="queued"?"draft":"queued",null);await reloadDrafts();if(!changed)setMessage("El borrador cambió. Revisa la versión actual.");}catch(e){Alert.alert("No se pudo actualizar",e.message);}}
 async function deletePending(d){try{const removed=await store.completeDraft(owner,d);await reloadDrafts();if(!removed)setMessage("El borrador cambió. Se conservó la versión actual.");}catch(e){Alert.alert("No se pudo borrar",e.message);}}
 function openRepertoires(){setSelectedType("repertoires");setCalendarOpen(true);setSearch("");setTab("Catálogo");}
 function beginScheduled(kind,date){
  if(!owner||access?.blocked||(!offline&&(!access?.authorized||!canEdit(access,"repertoires"))))return;
  const seed=draftSeed(kind,date);if(seed)editor.begin({owner,table:"repertoires",lists,origin:"Catálogo",seed});
 }
 function repertoireCalendar(){return h(CalendarScreen,{lists,drafts,access,offline,onOpen:record=>begin("repertoires",record),onDraft:draft=>begin("repertoires",null,draft),onNew:beginScheduled,onList:()=>setCalendarOpen(false)});}

 function pendingPanel(){return h(PendingScreen,{busy,offline,sendQueue,drafts,begin,onTransition:transitionPending,onDelete:deletePending});}
 function homePanel(){return h(HomeScreen,{lists,drafts,begin,onRepertoires:openRepertoires,busy,refresh,offline,session,access,logout});}
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
    h(View,{style:{gap:13}},wrapChips(catalogTabs.map(x=>[x,TITLES[x]]),selectedType,v=>{setSelectedType(v);setSearch("");setCalendarOpen(v==="repertoires");}),selectedType==="repertoires"?(calendarOpen?repertoireCalendar():h(View,{style:{gap:10}},button("Calendario",()=>setCalendarOpen(true),"secondary"),catalogPanel("repertoires"))):catalogPanel(catalogTabs.includes(selectedType)?selectedType:"artists")):
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
