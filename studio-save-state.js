/* Pure Studio save-status presentation model. No DOM, storage or network effects. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ShalomStudioSaveState=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 function describe({fingerprint:f,publishedFingerprint,draftFingerprint,pendingSave,pendingKind,saveError}){
 const isPublished=!!publishedFingerprint;
 let state="dirty",title="Sin guardar",detail="Guarda un borrador privado o publica para los músicos.";
 if(pendingSave!==null){state="busy";title=pendingKind==="publish"?"Publicando…":"Guardando borrador…";detail="Esperando confirmación del guardado."}
 else if(saveError){state="error";title="No se confirmó el guardado";detail=saveError+(isPublished?" · La publicación anterior puede seguir disponible.":"")}
 else if(f&&f===publishedFingerprint){state="published";title="✓ Acompañamiento publicado";detail="Guardado en el servidor para este canto. Disponible en SHALOM pública al actualizar el catálogo."}
 else if(f&&f===draftFingerprint){state="draft";title="✓ Borrador guardado en este dispositivo";detail=isPublished?"La versión anterior sigue publicada. Publica para actualizarla.":"Aún no está disponible para los músicos."}
 else if(isPublished){title="Cambios sin publicar";detail="La versión anterior sigue publicada. Guarda o publica los cambios."}

 return {state,title,detail,disabled:pendingSave!==null};
 }
 return Object.freeze({describe});
});
