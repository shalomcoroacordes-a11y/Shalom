"use strict";
const assert=require("node:assert/strict");
const {createApi}=require("../src/api");
const calls=[];
const auth={async requireFresh(){return{access_token:"jwt"};}};
const fetcher=async(url,options)=>{
 calls.push({url,options});
 if(url.includes("rpc/admin_publish_song"))return{ok:true,status:200,async text(){return JSON.stringify({id:"id",updated_at:"2026-11-21T00:00:00Z"});}};
 if(options.method==="GET")return{ok:true,status:200,async text(){return"[]";}};
 return{ok:true,status:201,async text(){return'[{"id":"id"}]';}};
};
(async()=>{
 const api=createApi(fetcher,auth);
 const r=await api.publish("songs",{id:"id",title:"Canto",slug:"canto",song_type:"catolico",lyrics:"G\nCanto",category_ids:[],collaborator_ids:[],links:[{title:"video",url:"https://youtube.com"}],capos:[]} ,null);
 assert.equal(r.id,"id");
 assert.equal(calls.filter(x=>x.url.includes("rpc/admin_publish_song")).length,1,"La escritura del canto debe ser ATÓMICA");
 assert.ok(JSON.parse(calls[0].options.body).p_links.length===1);
 assert.ok(!calls.some(x=>x.url.includes("song_links?")),"Sin guardados parciales por REST");
 console.log("Publicación atómica vía RPC comprobada.");
})().catch(e=>{console.error(e);process.exit(1);});

const requestLog=[];
const guarded=(url,opts)=>{
 requestLog.push({url,opts});
 if(opts.method==="GET")return Promise.resolve({ok:true,status:200,text:async()=>JSON.stringify([{id:"existing",updated_at:"2026-11-21T10:00:00Z"}])});
 if(opts.method==="PATCH")return Promise.resolve({ok:true,status:200,text:async()=>JSON.stringify([{id:"existing",updated_at:"2026-11-21T11:00:00Z"}])});
 return Promise.resolve({ok:false,status:400,text:async()=>JSON.stringify({message:"Bad request"})});
};
(async()=>{
 const a=createApi(guarded,auth);
 const x=await a.publish("albums",{id:"existing",title:"Álbum nuevo",slug:"album-nuevo"},"2026-11-21T10:00:00Z");
 assert.equal(x.id,"existing");
 assert.ok(requestLog.some(r=>r.opts.method==="PATCH"&&r.url.includes("updated_at=eq.")),"Actualización atómica con marca de tiempo");
 await assert.rejects(()=>a.publish("albums",{id:"existing",title:"Otros cambios",slug:"otro"},"2026-11-21T09:00:00Z"),/CONFLICT/);
 console.log("Concurrencia optimista: no sobrescribir modificaciones de otros admins.");
})().catch(e=>{console.error(e);process.exit(1);});

(async()=>{
 const owner="admin-a";let current=owner;const requests=[];
 const records=Array.from({length:251},(_,i)=>({artist_id:"artist-"+String(Math.floor(i/2)).padStart(3,"0"),song_id:"song-"+i}));
 const a=createApi(async(url,opts)=>{
  requests.push({url,opts});
  const q=new URL(url).searchParams,offset=Number(q.get("offset"));
  assert.equal(q.get("order"),"artist_id.asc,song_id.asc");
  return{ok:true,status:200,text:async()=>JSON.stringify(records.slice(offset,offset+250))};
 },{requireFresh:async()=>({user_id:current,access_token:"token-"+current})});
 assert.deepEqual(await a.list("artist_featured_songs",owner),records);
 assert.equal(requests.length,2);
 current="admin-b";await assert.rejects(a.list("artist_featured_songs",owner),/sesión cambió/);assert.equal(requests.length,2);
 await assert.rejects(a.publish("songs",{id:"s"},null,owner),/sesión cambió/);
 await assert.rejects(a.myAccess(owner),/sesión cambió/);
 let calls=0;
 const switched=createApi(async()=>{calls++;current="admin-b";return{ok:true,status:200,text:async()=>JSON.stringify(records.slice(0,250))}},{requireFresh:async()=>({user_id:current,access_token:"token-"+current})});
 current=owner;await assert.rejects(switched.list("artist_featured_songs",owner),/sesión cambió/);assert.equal(calls,1);
 console.log("Catalog page requests and queued publication are pinned to their owner.");
})().catch(error=>{console.error(error);process.exitCode=1});
