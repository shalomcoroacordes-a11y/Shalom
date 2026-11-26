"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={};
vm.runInNewContext(fs.readFileSync("song-related-catalog.js","utf8"),{window});
const find=window.ShalomRelatedSongs.find;
function fixture(data){
 const calls=[];
 const client={from(table){
  const q={select(fields){calls.push([table,"select",fields]);return q},in(key,ids){calls.push([table,"in",key,Array.from(ids)]);return q},order(key,opts){calls.push([table,"order",key,opts.ascending]);return q},limit(n){calls.push([table,"limit",n]);return q},then(resolve,reject){return Promise.resolve(data[table]||{data:[]}).then(resolve,reject)}};
  return q;
 }};
 return {client,calls};
}
(async()=>{
 const song={id:"current"},relations={artists:[{id:"a"}],categories:[{id:"c"}],albums:[{id:"z"}]};
 const rows=[{id:"both",title:"Z"},{id:"artist",title:"A"},{id:"category",title:"B"},{id:"album",title:"C"},{id:"tie",title:"Árbol"},{id:"last",title:"D"},{id:"extra",title:"E"}];
 const data={song_artists:{data:[{song_id:"current"},{song_id:"both"},{song_id:"artist"},{song_id:"tie"}]},song_categories:{data:[{song_id:"both"},{song_id:"category"}]},album_songs:{data:[{song_id:"both"},{song_id:"album"},{song_id:"last"},{song_id:"extra"}]},songs:{data:rows}};
 let starts=0;const f=fixture(data);
 const result=await find(f.client,song,relations,()=>starts++);
 assert.equal(starts,1);assert.deepEqual(Array.from(result,x=>x.id),["both","artist","tie","category","album","last"]);
 const candidates=f.calls.find(x=>x[0]==="songs"&&x[1]==="in")[3];assert.equal(candidates.includes("current"),false);assert.equal(new Set(candidates).size,7);
 assert.ok(f.calls.some(x=>x[0]==="songs"&&x[1]==="limit"&&x[2]===30));
 const empty=fixture({});assert.equal((await find(empty.client,song,{},()=>starts++)).length,0);assert.equal(empty.calls.length,0);assert.equal(starts,1);
 const noArtist=fixture({song_categories:{data:[{song_id:"category"}]},album_songs:{data:[{song_id:"album"}]},songs:{data:[{id:"album",title:"A"},{id:"category",title:"Z"}]}});
 assert.deepEqual(Array.from(await find(noArtist.client,song,{categories:[{id:"c"}],albums:[{id:"z"}]}),x=>x.id),["category","album"]);
 const error=fixture({song_artists:{error:{message:"network"}}});assert.equal((await find(error.client,song,{artists:[{id:"a"}]})).length,0);assert.equal(error.calls.some(x=>x[0]==="songs"),false);
 const self=fixture({song_artists:{data:[{song_id:"current"}]}});assert.equal((await find(self.client,song,{artists:[{id:"a"}]})).length,0);assert.equal(self.calls.some(x=>x[0]==="songs"),false);
 const queryError=fixture({...data,songs:{error:{message:"network"}}});assert.equal((await find(queryError.client,song,relations)).length,0);
 const page=fs.readFileSync("cancion.html","utf8"),owner=fs.readFileSync("cancion.js","utf8");
 assert.equal((page.match(/src="song-related-catalog\.js\?v=1"/g)||[]).length,1);
 assert.ok(page.indexOf('src="song-related-catalog.js')<page.indexOf('src="cancion.js'));
 assert.match(owner,/window\.ShalomRelatedSongs\.find\(client, song, relations,/);
 assert.doesNotMatch(owner,/const candidateIds|const score = new Map\(\)/);
 console.log("Related songs: exact query fields, weighted ranking, exclusion, limit and empty/error behavior.");
})().catch(e=>{console.error(e);process.exitCode=1});
