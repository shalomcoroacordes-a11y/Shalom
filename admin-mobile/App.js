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
const {effective,mapped}=require("./src/permissions");
const {txt,button,input,wrapChips}=require("./src/components/Controls");
const UsersScreen=require("./src/screens/UsersScreen");
const EditorScreen=require("./src/screens/EditorScreen");
const CatalogScreen=require("./src/screens/CatalogScreen");
const PendingScreen=require("./src/screens/PendingScreen");
const HomeScreen=require("./src/screens/HomeScreen");
const {createAuth}=require("./src/auth");
const {createApi}=require("./src/api");
const {createSync}=require("./src/sync");
const {createStudioPersistence}=require("./src/studio-persistence");
const {createUserManagement}=require("./src/user-management");
const {createSessionScope}=require("./src/session-scope");
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
 const [search,setSearch]=useState(""),[offline,setOffline]=useState(false),[roles,setRoles]=useState([]),[profiles,setProfiles]=useState([]);
 const [newRole,setNewRole]=useState(""),[roleDescription,setRoleDescription]=useState(""),[rolePermissions,setRolePermissions]=useState([]);
 const [inviteEmail,setInviteEmail]=useState(""),[inviteRoles,setInviteRoles]=useState([]),[showRoleEditor,setShowRoleEditor]=useState(false),[editingRole,setEditingRole]=useState(null),[assigned,setAssigned]=useState({}),[blockedUsers,setBlockedUsers]=useState([]);
 const [overrides,setOverrides]=useState({}),[overrideUser,setOverrideUser]=useState(null),[trash,setTrash]=useState([]);
 const [studioPayload,setStudioPayload]=useState(null),[studioStatus,setStudioStatus]=useState(null);
 const [editorSaving,setEditorSaving]=useState(false);
 const editorRef=useRef(null),editorCallbacks=useRef(null);
 const owner=session?.user_id;
 const scopeRef=useRef(null);
 if(!scopeRef.current)scopeRef.current=createSessionScope();
 const scope=scopeRef.current,activeSession=scope.current();
 const isActive=(token=activeSession,id=owner)=>scope.matches(token,id);
 editorCallbacks.current={owner:isActive()?owner:null,reloadDrafts,sendQueue};
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
 function resetView(nextOwner=null){
  editor.reset();users.reset(nextOwner);editorCallbacks.current.owner=null;studioContext.current=null;
  setAccess(null);setLists({});setDrafts([]);setBusy(false);setMessage("");setOffline(false);
  setTab("Inicio");setSelectedType("songs");setSection("Datos");setSearch("");
  setForm(null);setEditing(null);setStudioPayload(null);setStudioStatus(null);
  setOverrideUser(null);setEditingRole(null);setShowRoleEditor(false);setNewRole("");
  setRoleDescription("");setRolePermissions([]);setInviteEmail("");setInviteRoles([]);
 }
 async function hydrate(s){
  const id=s?.user_id||null,token=scope.begin(id);
  resetView(id);setSession(s);setBoot(false);
  if(!id)return;
  try{
   const d=await store.listDrafts(id);if(!isActive(token,id))return;setDrafts(d);
   const cached=await sync.snapshot(id);if(!isActive(token,id))return;setLists(cached);
   const online=await network();if(!isActive(token,id))return;
   if(online){
    const a=await api.myAccess(id);if(!isActive(token,id))return;
    if(!a?.authorized)throw Error("Sin permisos de administración");
    setAccess(a);setOffline(false);
    await reloadCatalog(id,token);await loadUsers(a,id,token);
   }else{setOffline(true);setMessage("Sin internet: borradores disponibles. No se permite publicar hasta verificar permisos.");}
  }catch(e){
   if(!isActive(token,id))return;
   setMessage(e.message);setAccess(null);
   if(/sin permisos|bloquead|revocad/i.test(e.message)){
    const cleared=scope.begin(null);resetView();setSession(null);setBoot(true);
    try{await auth.clear();}finally{if(scope.current()===cleared)setBoot(false);}
   }
  }
 }
 useEffect(()=>{let alive=true;const initial=scope.current();auth.session().then(s=>{if(alive&&scope.current()===initial)hydrate(s).catch(e=>{if(alive){setMessage(e.message);setBoot(false);}});}).catch(()=>{if(alive&&scope.current()===initial)setBoot(false);});return()=>{alive=false;};},[]);
 useEffect(()=>{
  if(!owner)return;
  let active=true;
  const unsub=NetInfo.addEventListener(state=>{
   if(!active||!isActive())return;
   const on=!!(state.isConnected&&state.isInternetReachable!==false);
   setOffline(!on);
   if(on){if(access?.authorized)sendQueue();else refresh();}
  });
  const app=AppState.addEventListener("change",state=>{if(active&&isActive()&&state==="active"&&access?.authorized)sendQueue();});
  return()=>{active=false;unsub();app.remove();};
 },[owner,activeSession,access?.authorized]);
 async function reloadDrafts(token=activeSession,id=owner){
  if(!isActive(token,id))return;
  const rows=await store.listDrafts(id);
  if(isActive(token,id))setDrafts(rows);
 }
 async function reloadCatalog(id=owner,token=activeSession){
  if(!isActive(token,id))return;
  const r=await sync.pull(id);
  if(!isActive(token,id))return;
  if(r?.offline){setOffline(true);return;}
  const o=await sync.snapshot(id);
  if(isActive(token,id)){setLists(o);setOffline(false);}
 }
 async function loadUsers(a=access,id=owner,token=activeSession){
  if(!a?.owner||!isActive(token,id))return;
  try{await users.load(id);}
  catch(e){if(isActive(token,id))setMessage("Permisos: "+e.message);}
 }
 async function sendQueue(token=activeSession,id=owner){
  if(!isActive(token,id)||busy)return;
  try{const r=await sync.push(id);if(!isActive(token,id))return;
   await reloadDrafts(token,id);if(!isActive(token,id))return;
   if(r?.sent){setMessage(r.sent+" publicación(es) sincronizadas");await reloadCatalog(id,token);}
   if(!isActive(token,id))return;
   if(r?.failed||r?.conflicts)setMessage("Pendientes: "+r.failed+" errores, "+r.conflicts+" conflictos. Revisar.");
   if(r?.preserved)setMessage(value=>(value?value+" · ":"")+r.preserved+" borrador(es) cambiaron durante el envío; se conservó la versión actual.");
  }catch(e){if(isActive(token,id))setMessage(e.message);}
 }
 async function refresh(){
  if(!isActive())return;
  const token=activeSession,id=owner;
  setBusy(true);setMessage("");
  try{const a=await api.myAccess(id);if(!isActive(token,id))return;
   if(!a?.authorized){setAccess(null);throw Error("Permisos revocados");}setAccess(a);
   await sendQueue(token,id);await reloadCatalog(id,token);await loadUsers(a,id,token);
   if(isActive(token,id))setMessage("Catálogo actualizado");}
  catch(e){if(isActive(token,id))setMessage(e.message);}finally{if(isActive(token,id))setBusy(false);}
 }
 function begin(table,record,fromDraft){editor.begin({owner,table,record,fromDraft,lists,origin:tab});}
 function saveDraft(queue=false){return editor.save(queue);}
 function confirmRemove(type,record){
  if(!isActive()||!effective(access,mapped(type)+".delete"))return Alert.alert("Sin permiso","No puedes eliminar este contenido");
  Alert.alert("Eliminar contenido","Esta acción elimina datos del servidor. ¿Continuar?",[
   {text:"Cancelar",style:"cancel"},
   {text:"Eliminar",style:"destructive",onPress:async()=>{
    if(!isActive())return;
    try{await api.remove(type,record.id||record.content_key,owner);if(isActive()){await reloadCatalog();if(isActive())setMessage("Contenido eliminado");}}
    catch(e){if(isActive())Alert.alert("No se pudo eliminar",e.message);}
   }}
  ]);
 }
 async function logout(){
  if(!isActive())return;
  const token=scope.begin(null);resetView();setSession(null);setBoot(true);
  try{await auth.signOut();}catch(e){if(scope.current()===token)Alert.alert("Cerrar sesión",e.message);}
  finally{if(scope.current()===token)setBoot(false);}
 }
 async function createRole(){
  if(!isActive())return;
  if(!newRole.trim())return Alert.alert("Nombre requerido");
  try{if(editingRole)await api.changeRole({id:editingRole,name:newRole,description:roleDescription,permissions:rolePermissions},owner);
   else await api.createRole({name:newRole,description:roleDescription,permissions:rolePermissions},owner);
   if(!isActive())return;
   setEditingRole(null);setShowRoleEditor(false);setNewRole("");setRoleDescription("");setRolePermissions([]);await loadUsers();if(isActive())setMessage("Rol guardado.");
  }catch(e){if(isActive())Alert.alert("Error de rol",e.message);}
 }
 async function updateOverride(userId,permission){
  if(!isActive())return;
  try{await users.toggleOverride(owner,userId,permission);}
  catch(e){if(isActive())Alert.alert("Error de permiso",e.message);}
 }
 async function sendInvite(){
  if(!isActive())return;
  if(!inviteEmail.trim()||!inviteRoles.length)return Alert.alert("Faltan datos","Indica correo y al menos un rol.");
  try{await api.invite(inviteEmail.trim(),inviteRoles,owner);if(!isActive())return;setMessage("Invitación preparada para "+inviteEmail+". Comparte el correo y pide registrarse con esa dirección.");setInviteEmail("");}
  catch(e){if(isActive())Alert.alert("Invitación",e.message);}
 }
 async function toggleRole(userId,id){if(!isActive())return;try{await users.toggleRole(owner,userId,id);}catch(e){if(isActive())Alert.alert("Error",e.message);}}
 async function blockUser(userId){if(!isActive())return;try{await api.blockUser(userId,"Revocado por propietario",owner);if(isActive())await loadUsers();}catch(e){if(isActive())Alert.alert("Error",e.message);}}
 async function unblockUser(userId){if(!isActive())return;try{await api.unblockUser(userId,owner);if(isActive())await loadUsers();}catch(e){if(isActive())Alert.alert("Error",e.message);}}
 async function restoreSong(id){if(!isActive())return;try{const restored=await api.restoreSong(id,owner);if(restored!==true)throw Error("No se confirmó la restauración del canto.");if(!isActive())return;await loadUsers();await reloadCatalog();if(isActive())setMessage("Canto restaurado de la papelera.");}catch(e){if(isActive())Alert.alert("No se pudo restaurar",e.message);}}
 function usersPanel(){return h(UsersScreen,{access,showRoleEditor,setShowRoleEditor,newRole,setNewRole,roleDescription,setRoleDescription,rolePermissions,setRolePermissions,createRole,roles,setEditingRole,inviteEmail,setInviteEmail,inviteRoles,setInviteRoles,sendInvite,profiles,blockedUsers,assigned,onToggleRole:toggleRole,overrideUser,setOverrideUser,overrides,updateOverride,onBlock:blockUser,onUnblock:unblockUser,trash,onRestore:restoreSong});}
 function studioSong(saved){return {id:saved.id,title:saved.title,lyrics:saved.lyrics||"",revision:saved.updated_at};}
 const studioContext=useRef(null);
 studioContext.current={owner,tab,selectedType,id:editing?.id,lyrics:form?.lyrics,revision:(lists.songs||[]).find(s=>s.id===editing?.id)?.updated_at};
 function getStudioState(saved){return studio.read(owner,studioSong(saved),offline);}
 useEffect(()=>{let active=true;const saved=(lists.songs||[]).find(s=>s.id===editing?.id);setStudioStatus(null);if(tab==="Editor"&&selectedType==="songs"&&owner&&saved?.updated_at)getStudioState(saved).then(s=>{if(active&&isActive())setStudioStatus(s)}).catch(()=>{if(active&&isActive())setStudioStatus({id:saved.id,error:true})});return()=>{active=false};},[owner,editing?.id,tab,selectedType,offline,lists.songs,studioPayload===null]);
 async function openStudio(){
  if(!isActive())return;
  const saved=(lists.songs||[]).find(s=>s.id===editing?.id);
  if(!saved?.updated_at||String(form?.lyrics||"")!==String(saved.lyrics||""))return Alert.alert("SHALOM Studio","Publica primero la letra y los acordes del canto.");
  const context=studioContext.current;
  try{
   const state=await getStudioState(saved);
   const current=studioContext.current;
   if(!isActive()||!current||["owner","tab","selectedType","id","lyrics","revision"].some(key=>current[key]!==context[key]))return;
   setStudioStatus(state);
   setStudioPayload({type:"shalom-studio-init",mode:"admin",song:studioSong(saved),arrangement:state.arrangement,draft:state.draft,shift:0,capo:0});
  }catch(e){if(isActive())Alert.alert("SHALOM Studio",e.message);}
 }
 async function studioDraft(arrangement){
  if(!isActive()||!studioPayload)throw Error("Sesión no disponible.");
  return studio.saveDraft(owner,studioPayload.song,arrangement);
 }
 async function studioPublish(arrangement){
  if(!isActive()||!studioPayload)throw Error("Sesión no disponible.");
  return studio.publish(owner,studioPayload.song,arrangement);
 }

 function leaveEditor(){editor.leave();}
 function adminBack(){
  if(!session||boot)return false;
  if(tab==="Editor"){if(section!=="Datos"){setSection("Datos");return true;}leaveEditor();return true;}
  if(tab==="Usuarios"){if(overrideUser){setOverrideUser(null);return true;}if(showRoleEditor){setShowRoleEditor(false);return true;}}
  if(search){setSearch("");return true;}
  if(tab!=="Inicio"){setTab("Inicio");return true;}
  return false;
 }
 useEffect(()=>{if(Platform.OS!=="android")return;const sub=BackHandler.addEventListener("hardwareBackPress",adminBack);return()=>sub.remove()},[session,boot,tab,section,form,search,overrideUser,showRoleEditor,selectedType]);
 function editorPanel(){return h(EditorScreen,{form,selectedType,section,update:editor.update,adminBack,setSection,lists,localId,editing,studioStatus,openStudio,editorSaving,saveDraft,access,offline});}
 function catalogPanel(type){return h(CatalogScreen,{type,lists,search,setSearch,begin,access,offline,confirmRemove});}
 async function transitionPending(d){if(!isActive())return;try{const changed=await store.transitionDraft(owner,d,d.status==="queued"?"draft":"queued",null);await reloadDrafts();if(isActive()&&!changed)setMessage("El borrador cambió. Revisa la versión actual.");}catch(e){if(isActive())Alert.alert("No se pudo actualizar",e.message);}}
 async function deletePending(d){if(!isActive())return;try{const removed=await store.completeDraft(owner,d);await reloadDrafts();if(isActive()&&!removed)setMessage("El borrador cambió. Se conservó la versión actual.");}catch(e){if(isActive())Alert.alert("No se pudo borrar",e.message);}}
 function openRepertoires(){setSelectedType("repertoires");setTab("Catálogo");}
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
