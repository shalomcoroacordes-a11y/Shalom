"use strict";
const assert=require("node:assert/strict");
const {createAuth,SESSION_KEY}=require("../src/auth");
let store=null,server=[];
const secure={
 async setItemAsync(k,s){assert.equal(k,SESSION_KEY);store=s;},
 async getItemAsync(){return store;},async deleteItemAsync(){store=null;}
};
const fetcher=async(url,options)=>{
 server.push({url,options});
 let body;
 if(url.includes("token?grant_type=password"))body={access_token:"jwt",refresh_token:"refresh",expires_in:3600,user:{id:"u1",email:"a@ejemplo.com"}};
 else if(url.includes("admin_redeem_invite"))body=true;
 else if(url.includes("admin_my_access"))body={authorized:true,owner:false,roles:["Cantos"],permissions:["songs.publish"]};
 else if(url.includes("logout"))body={};
 else body={};
 return {ok:true,status:200,async text(){return JSON.stringify(body);}};
};
(async()=>{
 const client=createAuth(fetcher,secure);
 const s=await client.signIn("a@ejemplo.com","contraseña");
 assert.equal(s.email,"a@ejemplo.com");
 assert.ok(store&&!store.includes("contraseña"));
 assert.equal((await client.session()).user_id,"u1");
 assert.ok(server.some(x=>x.url.includes("admin_my_access")));
 await client.signOut();assert.equal(store,null);
 console.log("Inicio y cierre de sesión privada correctos.");
})().catch(e=>{console.error(e);process.exit(1);});
