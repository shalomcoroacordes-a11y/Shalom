"use strict";
// One ordered owner-scoped queue for permission reads and changes.
function empty(){return{roles:[],profiles:[],blocks:[],trash:[],assigned:{},overrides:{}};}
function group(rows,key,project){
 const groups=new Map();
 for(const row of rows){const id=row[key];if(!groups.has(id))groups.set(id,[]);groups.get(id).push(project(row));}
 return groups;
}
function assemble(roles,profiles,assignments,blocks,exceptions,trash){
 const assigned=group(assignments,"user_id",x=>x.role_id),overrides=group(exceptions,"user_id",x=>[x.permission,x.allowed]);
 return {roles,profiles,blocks,trash,assigned:Object.fromEntries(profiles.map(p=>[p.user_id,assigned.get(p.user_id)||[]])),overrides:Object.fromEntries(profiles.map(p=>[p.user_id,Object.fromEntries(overrides.get(p.user_id)||[])]))};
}
function createUserManagement({api,auth,apply}){
 let owner=null,epoch=0,tail=Promise.resolve(),state=empty();
 function reset(nextOwner=null){epoch++;owner=nextOwner;state=empty();apply(state);}
 function assertCurrent(id,generation){if(!id||id!==owner||generation!==epoch)throw Error("La sesión cambió durante la gestión de usuarios");}
 function enqueue(id,work){
  const generation=epoch;
  const task=tail.then(async()=>{
   assertCurrent(id,generation);
   const session=await auth.requireFresh();assertCurrent(id,generation);
   if(session.user_id!==id)throw Error("La sesión cambió durante la gestión de usuarios");
   const next=await work(state);
   assertCurrent(id,generation);
   state=next;apply(state);
   return state;
  });
  tail=task.catch(()=>{});return task;
 }
 function load(id){
  return enqueue(id,async()=>{
   const [roles,profiles,assignments,blocks,exceptions,trash]=await Promise.all([api.roles(),api.list("admin_profiles"),api.list("admin_user_roles"),api.list("admin_access_blocks"),api.list("admin_permission_overrides"),api.list("admin_trash")]);
   return assemble(roles,profiles,assignments,blocks,exceptions,trash);
  });
 }
 function toggleRole(id,userId,roleId){
  return enqueue(id,async current=>{
   const old=current.assigned[userId]||[];
   const next=old.includes(roleId)?old.filter(x=>x!==roleId):[...old,roleId];
   await api.assignUserRoles(userId,next);
   return {...current,assigned:{...current.assigned,[userId]:next}};
  });
 }
 function toggleOverride(id,userId,permission){
  return enqueue(id,async current=>{
   const values={...(current.overrides[userId]||{})};
   const next=!Object.hasOwn(values,permission)?true:values[permission]===true?false:null;
   await api.setPermissionOverride(userId,permission,next);
   if(next===null)delete values[permission];else values[permission]=next;
   return {...current,overrides:{...current.overrides,[userId]:values}};
  });
 }
 return {reset,load,toggleRole,toggleOverride};
}
module.exports={createUserManagement,assemble};
