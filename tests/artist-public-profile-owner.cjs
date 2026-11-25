const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("artist-page.js","utf8"),html=fs.readFileSync("artista.html","utf8");
assert.deepEqual([...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]).filter(src=>!src.startsWith("https://")).map(src=>src.split("?")[0]),["Supabase.js","seo.js","artist-page.js"]);
for(const name of ["artist-profile-data.js","artist-profile-fields.js"])assert.equal(fs.existsSync(name),false);
const end=source.lastIndexOf('  document.addEventListener("DOMContentLoaded"');
assert.ok(end>0);
const exposed=source.slice(0,end)+"  window.testLoad=load;\n})();";
async function run(artist,search,featured){
 const queries=[],profile={innerHTML:""},nodes=new Map([["#artistProfile",profile]]);
 const document={title:"",querySelector:selector=>nodes.get(selector)||null};
 const db={
  from(table){
   const call={table};queries.push(call);
   const response=()=>({data:table==="artists"?artist:table==="artist_featured_songs"?featured:table==="songs"?[{id:"first",title:"Primer canto",tone:"C",song_type:"catolico"},{id:"second",title:"Segundo canto",tone:"D",song_type:"catolico"}]:[]});
   return {select(columns){call.columns=columns;return this},eq(key,value){call.eq=[key,value];return this},order(key){call.order=key;return this},limit(n){call.limit=n;return this},in(key,ids){call.in=[key,ids];return this},maybeSingle(){return Promise.resolve(response())},then(resolve,reject){return Promise.resolve(response()).then(resolve,reject)}};
  },
  rpc(name,args){queries.push({rpc:name,args});return Promise.resolve({data:name==="get_artist_profile_summary"?[{song_count:2,album_count:0,collaboration_count:0,categories:[]}]:[]})}
 };
 const window={supabaseClient:db};
 vm.runInNewContext(exposed,{window,document,location:{search},URLSearchParams,URL});
 await window.testLoad();
 return {queries,markup:profile.innerHTML,title:document.title};
}
async function test(){
 const modern=await run({id:"a",name:"Coro & fe",bio:"Biografía <actual>",youtube_url:"https://example.test/video",spotify_url:"javascript:alert(1)",description:'Biografía anterior <!--JHD_ARTIST_META:{"links":{"youtube":"https://old.test/"}}-->'},"?id=a",[{song_id:"second"},{song_id:"first"}]);
 assert.equal(modern.title,"Coro & fe | SHALOM");
 assert.match(modern.markup,/Biografía &lt;actual&gt;/);assert.doesNotMatch(modern.markup,/Biografía anterior|JHD_ARTIST_META|javascript:|old\.test/);
 assert.match(modern.markup,/https:\/\/example\.test\/video/);
 assert.ok(modern.markup.indexOf("Segundo canto")<modern.markup.indexOf("Primer canto"));
 assert.equal(modern.queries.filter(q=>q.table==="artists").length,1);
 assert.equal(modern.queries.filter(q=>q.table==="artist_featured_songs").length,1);
 assert.equal(modern.queries.find(q=>q.table==="artist_featured_songs").limit,6);
 assert.deepEqual(modern.queries.find(q=>q.table==="artists").eq,["id","a"]);
 const old=await run({id:"b",name:"Perfil antiguo",description:'Texto histórico <!--JHD_ARTIST_META:{"links":{"instagram":"https://example.test/legacy"}}-->'},"?slug=perfil-antiguo",[]);
 assert.match(old.markup,/Texto histórico/);assert.doesNotMatch(old.markup,/JHD_ARTIST_META/);
 assert.match(old.markup,/https:\/\/example\.test\/legacy/);assert.match(old.markup,/No hay canciones destacadas todavía/);
 assert.deepEqual(old.queries.find(q=>q.table==="artists").eq,["slug","perfil-antiguo"]);
 assert.equal(old.queries.filter(q=>q.table==="songs").length,0);
 console.log("Artist profile: single data owner, modern and legacy fields, safe social URLs, ordered featured songs and empty state verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
