"use strict";
const {initial,fromServer,draftRecord}=require("./model");
// A single editor session owns its baseline, pending save and exit confirmation.
function createEditorController({store,createId,apply,alert,onSaved,onBusy,notice}){
 let current=null,sequence=0,saving=false,confirming=false;
 function begin({owner,table,record,fromDraft,lists,origin}){
  const form=fromDraft?{...fromDraft.body}:record?fromServer(table,record,lists):initial(table);
  const editing={id:fromDraft?.id||record?.id||record?.content_key||(table==="site_content"?"new":createId()),expected:fromDraft?.expected_updated||record?.updated_at||null};
  current={token:++sequence,owner,table,form,editing,origin,baseline:JSON.stringify(form)};
  confirming=false;
  apply({table,form,editing,section:"Datos",tab:"Editor"});
 }
 function update(key,value){
  if(!current)return;
  current={...current,form:{...current.form,[key]:value}};
  apply({form:current.form});
 }
 function reset(){
  current=null;sequence++;confirming=false;
 }
 async function save(queue=false){
  if(!current||!current.owner||saving)return false;
  const snapshot=current;
  saving=true;onBusy(true);
  try{
   await store.upsertDraft(snapshot.owner,draftRecord(snapshot.table,snapshot.form,snapshot.editing,queue));
   if(current?.token!==snapshot.token)return false;
   if(current.form!==snapshot.form){
    current={...current,baseline:JSON.stringify(snapshot.form)};
    notice("Se guardó la versión anterior. Tus cambios recientes siguen abiertos en el editor.");
    return false;
   }
   reset();
   apply({form:null,editing:null,section:"Datos",tab:"Pendientes"});
   await onSaved(snapshot.owner,queue);
   return true;
  }catch(error){
   if(current?.token===snapshot.token)alert("No se pudo guardar",error.message);
   else notice("No se pudo completar la actualización de borradores: "+error.message);
   return false;
  }finally{saving=false;onBusy(false);}
 }
 function leave(){
  if(!current||saving||confirming)return;
  const snapshot=current;
  const dismiss=()=>{if(current?.token===snapshot.token)confirming=false;};
  const exit=()=>{
   if(current?.token!==snapshot.token||saving){dismiss();return;}
   const origin=snapshot.origin==="Editor"?(snapshot.table==="songs"?"Cantos":"Catálogo"):snapshot.origin;
   reset();apply({form:null,editing:null,section:"Datos",tab:origin});
  };
  if(JSON.stringify(snapshot.form)!==snapshot.baseline){
   confirming=true;
   alert("Cambios sin guardar","¿Quieres salir del editor? Los cambios nuevos se perderán.",[{text:"Seguir editando",style:"cancel",onPress:dismiss},{text:"Salir sin guardar",style:"destructive",onPress:exit}],{cancelable:true,onDismiss:dismiss});
  }else exit();
 }
 return {begin,update,reset,save,leave};
}
module.exports={createEditorController};
