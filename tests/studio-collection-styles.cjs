const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const js=fs.readFileSync("studio-collection-web.js","utf8"),css=fs.readFileSync("studio-collection-web.css","utf8"),sw=fs.readFileSync("offline-sw.js","utf8");
assert.doesNotMatch(js,/createElement\("style"\)|dialog\.style|row\.style/);
assert.match(css,/@media print\{\.studio-collection-action\{display:none!important\}\}/);
const expected={"max-width":"min(92vw,520px)",background:"#131c18",color:"#edf3ee",border:"1px solid #46594a","border-radius":"12px",padding:"18px"};
const dialogRules=css.match(/dialog\.studio-collection-dialog\s*\{([^}]+)\}/)[1];
for(const [name,value] of Object.entries(expected))assert.ok(dialogRules.includes(name+": "+value+";"),name);
assert.match(css,/\.studio-collection-dialog \.studio-collection-row\s*\{\s*padding: 6px 0;/);
for(const [page,bundle] of [["popurris.html","medleys.css?v=1"],["repertorios.html","repertoires.css?v=1"]]){
 const html=fs.readFileSync(page,"utf8");
 assert.equal((html.match(/href="studio-collection-web\.css\?v=1"/g)||[]).length,1);
 assert.ok(html.includes(bundle));
 assert.ok(html.indexOf("collection-reader-bundle.css")<html.indexOf(bundle));
 assert.ok(html.indexOf(bundle)<html.indexOf("studio-collection-web.css"));
 assert.match(html,/src="studio-collection-web\.js\?v=2"/);
}
assert.match(sw,/shalom-offline-shell-v29-studio-chord-index/);
assert.match(sw,/"\.\/studio-collection-web\.css"/);
const dialogs=[],opened=[];
function element(tag){
 const events={};
 return {tag,children:[],className:"",textContent:"",append(...items){this.children.push(...items)},prepend(item){this.children.unshift(item)},addEventListener(k,fn){events[k]=fn},click(){return events.click?.()},showModal(){this.open=true},close(){this.open=false;events.close?.()},remove(){this.removed=true},querySelectorAll(){return []}};
}
const document={createElement:element,body:{append(node){dialogs.push(node)}}};
const payload={song:{id:"a",revision:"rev"},arrangement:{v:1},shift:0,capo:0};
const item={index:0,title:"Canto A",ready:true,payload};
const plan={ready:[item],entries:[item,{index:1,title:"Canto B",ready:false,reason:"Sin arreglo"}],total:2};
const window={ShalomStudioCollections:{plan:()=>plan,sequencePlan:()=>null},ShalomStudioEntry:{open:async args=>opened.push(args)},alert(){throw Error("Unexpected alert")}};
vm.runInNewContext(js,{window,document});
const container=element("section"),article=element("article"),client={};
window.ShalomStudioCollectionWeb.mount({client,container,articles:[article],parts:[],songs:[],kind:"ensayo"});
assert.equal(article.children.length,1);assert.equal(container.children.length,1);
container.children[0].click();
const dialog=dialogs[0];assert.equal(dialog.className,"studio-collection-dialog");assert.equal(dialog.open,true);
assert.equal(dialog.children[2].children.length,2);
for(const row of dialog.children[2].children)assert.equal(row.className,"studio-collection-row");
dialog.children[2].children[0].children[0].click();
assert.equal(dialog.removed,true);assert.equal(opened.length,1);assert.equal(opened[0].song.updated_at,"rev");
console.log("Studio collection: static CSS, exact declarations, print exclusion, cache and practice dialog verified.");
