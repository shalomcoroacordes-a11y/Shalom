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
