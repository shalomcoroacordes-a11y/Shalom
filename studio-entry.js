/* Lazy Studio entry for existing web readers and authenticated editors. */
(() => {
"use strict";
const table="song_studio_arrangements";
const query=(client,song,withData=false)=>client.from(table).select(withData?"arrangement,song_revision":"song_id").eq("song_id",song.id).eq("song_revision",song.updated_at).maybeSingle();
async function available(client,song){if(!song?.id||!song.updated_at)return false;const {data,error}=await query(client,song);return !error&&!!data}
async function open({client,song,admin=false,shift=0,capo=0,range=null,arrangement=null,onClose,sequence=null,title=null}){
 if(!song?.id||!song.updated_at)throw Error("Guarda el canto antes de configurar su acompañamiento.");
 const {data,error}=arrangement&&!admin?{data:{arrangement},error:null}:await query(client,song,true);
 if(error)throw Error("Studio no está disponible: "+error.message);
 if(!admin&&!data)throw Error("Este canto no tiene acompañamiento vigente.");
 const dialog=document.createElement("dialog"),frame=document.createElement("iframe"),close=document.createElement("button");
 const active=document.activeElement,top=window.scrollY,previousOverflow=document.body.style.overflow;
 dialog.setAttribute("aria-label","SHALOM Studio");
 Object.assign(dialog.style,{padding:"0",border:"0",background:"#131c18",color:"#edf3ee",width:"min(100%,1100px)",maxWidth:"100%",height:"min(94dvh,900px)",maxHeight:"100%",overflow:"hidden"});
 Object.assign(close.style,{display:"block",width:"100%",height:"44px",border:0,background:"#24352b",color:"#edf3ee",font:"inherit",cursor:"pointer"});
 close.type="button";close.textContent="← Regresar al canto";
 frame.title="Editor y reproductor de SHALOM Studio";frame.allow="autoplay";
 Object.assign(frame.style,{width:"100%",height:"calc(100% - 44px)",border:"0",display:"block"});
 const origin=location.origin;
 let closed=false,busy=false;
 function send(message){if(!closed)frame.contentWindow?.postMessage(message,origin)}
 async function receive(e){
  if(e.origin!==origin||e.source!==frame.contentWindow||closed||!e.data)return;
  if(e.data.type==="shalom-studio-ready"){send({type:"shalom-studio-init",mode:admin?"admin":"public",song:{id:song.id,title:song.title,lyrics:song.lyrics||"",revision:song.updated_at},arrangement:data?.arrangement||null,shift,capo,range,sequence,title});return}
  if(e.data.type!=="shalom-studio-publish"||!admin||busy)return;
  busy=true;
  try{
   const payload=e.data.arrangement;
   if(!payload||payload.v!==1||JSON.stringify(payload).length>64000)throw Error("Acompañamiento inválido.");
   const response=await client.from(table).upsert({song_id:song.id,song_revision:song.updated_at,arrangement:payload},{onConflict:"song_id"}).select("song_id").single();
   if(response.error)throw response.error;
   send({type:"shalom-studio-result",ok:true,message:"Acompañamiento publicado."});
  }catch(err){send({type:"shalom-studio-result",ok:false,message:err.message||"No se pudo publicar."})}finally{busy=false}
 }
 function cleanup(){if(closed)return;closed=true;window.removeEventListener("message",receive);dialog.remove();document.body.style.overflow=previousOverflow;window.scrollTo(0,top);active?.focus?.({preventScroll:true});onClose?.()}
 close.onclick=()=>dialog.close();dialog.addEventListener("close",cleanup,{once:true});window.addEventListener("message",receive);
 frame.src="studio-lab.html";dialog.append(close,frame);document.body.append(dialog);document.body.style.overflow="hidden";
 try{dialog.showModal()}catch(err){cleanup();throw err}
}
window.ShalomStudioEntry=Object.freeze({available,open});
})();