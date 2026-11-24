"use strict";
const FIELDS=Object.freeze({
 songs:[["title","Título","text",true],["song_type","Tipo","type"],["tone","Tonalidad","text"],["difficulty","Dificultad","difficulty"],["artist_id","Artista principal","artist"],["lyrics","Letra y acordes","multiline",true],["capo_position","Capo principal (0-12)","number"],["capo_key","Figuras con capo","text"],["category_ids","Categorías","categories"],["collaborator_ids","Artistas colaboradores","artists"],["album_id","Álbum","album"],["links","Tutoriales y enlaces","links"],["capos","Versiones de capo","capos"]],
 artists:[["name","Nombre","text",true],["artist_type","Tipo","type"],["description","Descripción","multiline"],["bio","Biografía","multiline"],["avatar_url","Fotografía URL","url"],["cover_url","Portada URL","url"],["youtube_url","YouTube","url"],["spotify_url","Spotify","url"],["instagram_url","Instagram","url"],["facebook_url","Facebook","url"],["featured_song_ids","Canciones destacadas (máx. 3)","featured"]],
 albums:[["title","Nombre del álbum","text",true],["artist_id","Artista","artist"],["description","Descripción","multiline"],["sort_order","Orden","number"]],
 categories:[["name","Categoría","text",true],["song_type","Tipo","category_type"],["parent_id","Categoría principal","category"],["description","Descripción","multiline"],["sort_order","Orden","number"]],
 medleys:[["title","Nombre del popurrí","text",true],["song_type","Tipo","type"],["base_tone","Tonalidad","text"],["description","Descripción","multiline"],["parts","Partes (JSON)","json"],["is_published","Publicado","boolean"]],
 repertoires:[["title","Nombre del repertorio","text",true],["kind","Tipo de repertorio","repertoire_type"],["event_date","Fecha (AAAA-MM-DD)","date"],["location","Lugar","text"],["notes","Notas","multiline"],["items","Cantos y orden (JSON)","json"],["is_published","Publicado","boolean"]],
 contact_messages:[["status","Estado","request_status"],["admin_notes","Notas internas","multiline"]],
 home_recommendations:[["target_type","Tipo destacado","target_type"],["target_id","ID del contenido","text"],["section_type","Sección","section_type"],["sort_order","Orden","number"],["is_visible","Visible","boolean"]],
 donation_settings:[["title","Título","text",true],["subtitle","Subtítulo","multiline"],["bank_name","Banco","text"],["account_holder","Titular","text"],["account_number","Número de cuenta","text"],["account_type","Tipo de cuenta","text"],["note","Nota","multiline"],["button_text","Texto del botón","text"],["label","Etiqueta","text"],["instructions","Instrucciones","multiline"],["sort_order","Orden","number"],["is_active","Activo","boolean"]],
 site_content:[["content_key","Clave de contenido","text",true],["content","Contenido JSON","json"]]
});
const OPTIONS={
 type:[["catolico","Católico"],["cristiano","Cristiano"],["mixto","Mixto"]],
 category_type:[["","General"],["catolico","Católico"],["cristiano","Cristiano"]],
 difficulty:[["","Sin dificultad"],["Fácil","Fácil"],["Intermedio","Intermedio"],["Avanzado","Avanzado"]],
 repertoire_type:[["misa","Misa"],["ensayo","Ensayo"]],
 request_status:[["pendiente","Pendiente"],["en_proceso","En proceso"],["resuelto","Resuelto"]],
 target_type:[["song","Canto"],["category","Categoría"]],
 section_type:[["catolico","Católico"],["cristiano","Cristiano"]]
};
const TITLES={songs:"Cantos",artists:"Artistas",albums:"Álbumes",categories:"Categorías",medleys:"Popurrís",repertoires:"Repertorios y misas",contact_messages:"Solicitudes",home_recommendations:"Destacados",donation_settings:"Donaciones",site_content:"Contenido del sitio"};
const ID_FIELDS={site_content:"content_key"};
const slug=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function baseRecord(table,form,id) {
 if(!FIELDS[table])throw Error("Tipo de contenido no permitido");
 const out={};if(id)out[ID_FIELDS[table]||"id"]=id;
 for(const [key,,kind,required] of FIELDS[table]){
  let value=form[key];
  if(kind==="number"){value=Number(value||0);if(!Number.isFinite(value))throw Error("Número inválido: "+key);}
  else if(kind==="boolean")value=!!value;
  else if(kind==="json"){if(typeof value==="string"){try{value=JSON.parse(value|| (key==="content"?"{}":"[]"));}catch(_){throw Error("JSON inválido en "+key);}}value=value==null?(key==="content"?{}:[]):value;}
  else if(["categories","artists","links","capos","featured"].includes(kind))value=Array.isArray(value)?value:[];
  else value=String(value??"").trim();
  if(required && (!value|| (Array.isArray(value)&&!value.length)))throw Error("Falta el campo: "+key);
  if(kind==="url"&&value&&!/^https:\/\//i.test(value))throw Error("El enlace debe comenzar con https://");
  out[key]=value;
 }
 if(["songs","artists","albums","categories","medleys"].includes(table))out.slug=slug(out.title||out.name);
 if(table==="songs"){
  const p=Number(out.capo_position);if(p<0||p>12||!Number.isInteger(p))throw Error("Capo principal inválido");
  if(p>0&&!out.capo_key)throw Error("Indica las figuras del capo principal");
  for(const x of out.links){if(!x.title||!/^https:\/\//i.test(x.url||""))throw Error("Enlace inválido: requiere título y URL https");}
  for(const x of out.capos){if(!(Number(x.capo_position)>0&&Number(x.capo_position)<=12)||!String(x.capo_key||"").trim())throw Error("Versión de capo inválida");}
 }
 if(table==="medleys"&&Array.isArray(out.parts))for(const part of out.parts){if(part.studio_gap_ms!=null&&(!Number.isInteger(part.studio_gap_ms)||part.studio_gap_ms<0||part.studio_gap_ms>10000))throw Error("Pausa de Studio inválida (0–10000 ms)");}
 if(table==="artists"&&out.featured_song_ids.length>3)throw Error("Máximo tres canciones destacadas");
 if(table==="categories"&&out.song_type==="mixto")throw Error("Categoría mixta no compatible con la base actual");
 return out;
}
function mainPayload(table,rec){
 const out={...rec};
 if(table==="songs")for(const field of ["category_ids","collaborator_ids","album_id","links","capos"])delete out[field];
 if(table==="artists")delete out.featured_song_ids;
 if(table==="contact_messages")return {status:out.status,admin_notes:out.admin_notes};
 return out;
}
function relations(rec){
 if(!rec)return{};
 return {
 song_artists:[...(rec.artist_id?[{artist_id:rec.artist_id,role:"principal",sort_order:0}]:[]),...(rec.collaborator_ids||[]).filter(id=>id!==rec.artist_id).map((id,i)=>({artist_id:id,role:"colaborador",sort_order:i+1}))],
 song_categories:(rec.category_ids||[]).map(id=>({category_id:id})),
 album_songs:rec.album_id?[{album_id:rec.album_id,sort_order:0}]:[],
 song_links:(rec.links||[]).map((x,i)=>({title:x.title,link_type:x.link_type||"Tutorial",platform:x.platform||"",url:x.url,sort_order:i})),
 song_capo_versions:(rec.capos||[]).map((x,i)=>({label:x.label||"Capo "+x.capo_position,capo_position:Number(x.capo_position),capo_key:x.capo_key,sort_order:i}))
 };
}
function displayTitle(table,rec){return rec.title||rec.name||rec.content_key||rec.song_title||rec.id||"Sin título";}
module.exports={FIELDS,OPTIONS,TITLES,ID_FIELDS,baseRecord,mainPayload,relations,slug,displayTitle};
