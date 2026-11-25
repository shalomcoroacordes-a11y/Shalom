"use strict";
// The declared SQL primary keys are the only ordering fields used for pagination.
const COMPOSITE=Object.freeze({
 artist_featured_songs:["artist_id","song_id"],
 admin_role_permissions:["role_id","permission"],
 admin_user_roles:["user_id","role_id"],
 admin_permission_overrides:["user_id","permission"],
 admin_access_blocks:["user_id"],admin_profiles:["user_id"],
 admin_invites:["email"],site_content:["content_key"]
});
function keyFields(table){return COMPOSITE[table]||["id"];}
function keyOf(row,fields){
 const values=fields.map(field=>row?.[field]);
 if(values.some(value=>typeof value!=="string"||!value.length))throw Error("Identificador de catálogo inválido");
 return JSON.stringify(values);
}
async function readCatalogPages(table,fetchPage,{limit=250,maxRows=20000}={}){
 const fields=keyFields(table),order=fields.map(field=>field+".asc").join(",");
 const result=[],seen=new Set();
 let offset=0;
 while(true){
  const rows=await fetchPage({order,limit,offset});
  if(!Array.isArray(rows)||rows.length>limit)throw Error("No se pudo leer el catálogo");
  for(const row of rows){
   const key=keyOf(row,fields);
   if(seen.has(key))throw Error("El catálogo cambió durante la descarga. Vuelve a actualizar.");
   seen.add(key);result.push(row);
   if(result.length>maxRows)throw Error("Catálogo demasiado grande: supera el límite de descarga");
  }
  if(rows.length<limit)return result;
  offset+=rows.length;
 }
}
module.exports={keyFields,keyOf,readCatalogPages};
