"use strict";
const React=require("react");
const {View,Alert}=require("react-native");
const {S}=require("../styles");
const {RESOURCES,ACTIONS}=require("../permissions");
const {txt,heading,button,input,wrapChips}=require("../components/Controls");
const {recoveryFormat}=require("../trash-format");
const h=React.createElement;
function UsersScreen({access,showRoleEditor,setShowRoleEditor,newRole,setNewRole,roleDescription,setRoleDescription,rolePermissions,setRolePermissions,createRole,roles,setEditingRole,inviteEmail,setInviteEmail,inviteRoles,setInviteRoles,sendInvite,profiles,blockedUsers,assigned,onToggleRole,overrideUser,setOverrideUser,overrides,updateOverride,onBlock,onUnblock,trash,onRestore}){
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
    wrapChips(roles.map(r=>[r.id,r.name]),assigned[u.user_id]||[],id=>onToggleRole(u.user_id,id)),
    button(overrideUser===u.user_id?"Ocultar permisos individuales":"Permisos individuales",()=>setOverrideUser(overrideUser===u.user_id?null:u.user_id),"secondary"),
    overrideUser===u.user_id?h(View,{style:{gap:12}},txt("Permiso individual: ✓ permitir, ✕ denegar, · heredar del rol",S.note),
      RESOURCES.map(([resource,label])=>h(View,{key:resource,style:{gap:5}},txt(label,S.itemTitle),
        wrapChips(ACTIONS.map(([verb,name])=>{const key=resource+"."+verb;const val=(overrides[u.user_id]||{})[key];return [key,name+" "+(val===true?"✓":val===false?"✕":"·")];}),
        Object.entries(overrides[u.user_id]||{}).filter(([_,value])=>value===true).map(([key])=>key),
        key=>updateOverride(u.user_id,key))
      ))):null,
    h(View,{style:S.row},button("Bloquear acceso",()=>Alert.alert("Bloquear administrador","Sus permisos dejarán de funcionar al consultar el servidor.",[
      {text:"Cancelar"},{text:"Bloquear",style:"destructive",onPress:()=>onBlock(u.user_id)}
    ]),"danger"),button("Restaurar",()=>onUnblock(u.user_id),"secondary")))
   ),
   heading("Papelera de cantos"),
   txt("Conserva el canto eliminado con sus enlaces, capos y relaciones para poder restaurarlo.",S.note),
   trash.filter(t=>t.item_type==="song").map(t=>{
    const format=recoveryFormat(t);
    return h(View,{key:t.id,style:S.card},
     txt(t.item_name||"Canto eliminado",S.itemTitle),txt("Eliminado el "+String(t.deleted_at||"").slice(0,10),S.itemSub),
     format==="native"?button("Restaurar canto",()=>Alert.alert("Restaurar canto","Se recuperará el canto con sus relaciones guardadas si los artistas y categorías todavía existen.",[
      {text:"Cancelar"},{text:"Restaurar",onPress:()=>onRestore(t.id)}
     ]),"secondary"):txt(format==="web"?"Respaldo del administrador web. Restáuralo desde Respaldo en SHALOM Admin web.":"Formato de respaldo no reconocido. Conserva esta copia y revisa su contenido antes de restaurar.",S.note));
   }),
   !trash.some(t=>t.item_type==="song")&&txt("No hay cantos en la papelera.",S.note)
  );
 }
module.exports=UsersScreen;
