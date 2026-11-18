// Filtros de repertorios de la app. Nunca altera el catálogo ni Supabase.
function repertoireType(value){
 const kind=String(value?.kind||value||"").trim().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(["misa","mass","liturgia","liturgico"].includes(kind))return "misa";
 if(["ensayo","rehearsal","practica","practice"].includes(kind))return "ensayo";
 return "otras";
}
function filterRepertoires(repertoires,kind="todos",search=""){
 const q=String(search||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 return (Array.isArray(repertoires)?repertoires:[]).filter(rep=>{
  if(kind!=="todos"&&repertoireType(rep)!==kind)return false;
  if(!q)return true;
  const content=[rep.title,rep.location,rep.notes,rep.event_date,rep.kind]
   .map(v=>String(v||"")).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return content.includes(q);
 });
}
module.exports={repertoireType,filterRepertoires};
