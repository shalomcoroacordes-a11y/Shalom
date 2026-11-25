// Regression: SHALOM admin tabs must open all sections after clicking.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const src=fs.readFileSync("admin-pro.js","utf8");
const start=src.indexOf("function apRenderShell() {");
const end=src.indexOf("function apSectionHead(",start);
assert.ok(start>=0 && end>start,"Panel de pestañas presente");
const ids=["artists","categories","albums","songs","medleys","donations","backup"];
const tabs=ids.map(id=>{
  const listeners={};let active=id==="songs";
  return {dataset:{adminTab:id},
    addEventListener(name,fn){listeners[name]=fn},
    click(){assert.equal(typeof listeners.click,"function","Pestaña "+id+" sin evento");listeners.click()},
    classList:{toggle(name,on){if(name==="active")active=on},contains(){return active}}
  };
});
const workspace={innerHTML:"",contains:true};
const view={innerHTML:""};
const state={tab:"songs",user:{email:"admin@example.test"},songs:[]};
const bound=[];
const lifecycle=[];
const focusCalls=[];
const categoryMounts=[];
const artistSearchMounts=[];
const document={activeElement:null,getElementById(id){return id==="artistFilter"?{focus(options){focusCalls.push(options.preventScroll)},setSelectionRange(start,end){focusCalls.push(start,end)}}:null}};
const scope={
 document,
 AP:state,
 ap$:selector=>selector==="#adminWorkspace"?workspace:selector==="#adminView"?view:selector==="#adminLogout"?{addEventListener(){}}:null,
 ap$$:selector=>{
   assert.equal(selector,"[data-admin-tab]");
   return tabs;
 },
 apEsc:String,apCaptureSongDraft(){},apRememberEditorPosition(){},
 apArtistsHTML:()=>"<p>ARTISTS</p>",
 apCategoriesHTML:()=>"<p>CATEGORIES</p>",
 apAlbumsHTML:()=>"<p>ALBUMS</p>",
 apSongsHTML:()=>"<p>SONGS</p>",
 apDonationsHTML:()=>"<p>DONATIONS</p>",
 apBindArtists:()=>bound.push("artists"),
 apBindCategories:()=>bound.push("categories"),
 apBindAlbums:()=>bound.push("albums"),
 apBindSongs:()=>bound.push("songs"),
 apBindDonations:()=>bound.push("donations"),
 window:{ShalomMedleyAdmin:{mount:()=>bound.push("medleys")},ShalomAdminFormLayout:{enhance:()=>lifecycle.push(state.tab)},ShalomAdminSongCategories:{mount:()=>categoryMounts.push(state.tab)},ShalomAdminMainArtistSearch:{mount:()=>artistSearchMounts.push(state.tab)},ShalomAdminBackup:{mount:target=>{target.innerHTML="<p>BACKUP</p>";bound.push("backup")}}}
};
vm.createContext(scope);
vm.runInContext(src.slice(start,end)+"\napRenderShell();",scope);
assert.ok(workspace.innerHTML.includes("Popurrís"),"Falta nueva pestaña");
assert.match(workspace.innerHTML,/data-admin-tab="backup">Respaldo<\/button>/,"Backup belongs to the native tab list");
const displays=["ARTISTS","CATEGORIES","ALBUMS","SONGS","","DONATIONS","BACKUP"];
ids.forEach((id,i)=>{
 tabs[i].click();
 assert.equal(state.tab,id,"No cambió a "+id);
 if(displays[i])assert.ok(view.innerHTML.includes(displays[i]),"No pintó "+id);
 else assert.equal(bound.at(-1),"medleys","No abrió editor de popurrís");
 for(let k=0;k<tabs.length;k++)assert.equal(tabs[k].classList.contains("active"),k===i,"Activo incorrecto al pulsar "+id);
});
assert.ok(["artists","categories","albums","songs","donations","medleys","backup"].every(id=>bound.includes(id)),"No todas las pestañas abrieron");
document.activeElement={id:"artistFilter",selectionStart:1,selectionEnd:3};
tabs[0].click();
assert.deepEqual(focusCalls,[true,1,3],"Search focus and selection restored by the owner");
assert.equal(lifecycle.at(-1),"artists","Form layout mounted through explicit lifecycle");
const layout=fs.readFileSync("admin-form-layout.js","utf8");
assert.doesNotMatch(layout,/apRenderView\s*=/,"Form module must not replace renderer");
assert.match(layout,/window\.ShalomAdminFormLayout = \{ enhance: enhanceForm \}/);
assert.deepEqual(categoryMounts,["songs","songs"],"Category selector mounts only when song view is rendered");
const picker=fs.readFileSync("admin-song-category-picker.js","utf8");
assert.doesNotMatch(picker,/apRenderView\s*=/,"Category picker must not replace the owner renderer");
assert.match(picker,/window\.ShalomAdminSongCategories = \{ mount: attach \}/);
console.log("SHALOM admin: tabs, form lifecycle, category mount and search cursor respond.");

assert.deepEqual(artistSearchMounts,["songs","songs"],"Artist search mounts only after rendering the song view");

const donationsMounts=[];
scope.window.ShalomAdminDonations={mount(target){assert.equal(target,view);donationsMounts.push(state.tab);target.innerHTML="<p>DONATIONS PLUS</p>";}};
const basicBindsBefore=bound.filter(x=>x==="donations").length;
tabs[ids.indexOf("donations")].click();
assert.equal(view.innerHTML,"<p>DONATIONS PLUS</p>");
assert.deepEqual(donationsMounts,["donations"]);
assert.equal(bound.filter(x=>x==="donations").length,basicBindsBefore,"No basic donation form binding when the advanced module owns the view");
