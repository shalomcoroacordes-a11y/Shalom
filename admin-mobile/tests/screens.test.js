"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"../src"),model=require("../src/model"),permissions=require("../src/permissions");
const h=(type,props,...children)=>({type,props:props||{},children});
const styles=new Proxy({},{get:(_,key)=>String(key)});
const controls={txt:(text)=>h("text",{text}),heading:(text)=>h("text",{text}),button:(text,action,kind,disabled)=>h("button",{text,action,disabled:!!disabled}),input:(text,value,action)=>h("input",{text,value,action}),wrapChips:(choices,selected,action)=>h("chips",{choices,selected,action}),itemRow:(text,sub,action)=>h("row",{text,sub,action})};
let dialog;
const native={View:"View",Text:"Text",ScrollView:"ScrollView",Alert:{alert:(...args)=>{dialog=args}}};
const modules={"react":{createElement:h},"react-native":native,"../styles":{S:styles,C:styles},"../model":model,"../permissions":permissions,"../score":{renderLines:()=>[{type:"lyrics",text:"Letra"}]},"../components/Controls":controls,"../components/EditorFields":{Field:"Field"},"../trash-format":require("../src/trash-format"),"./StudioHistory":"StudioHistory"};
function load(name){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(root,"screens",name+".js"),"utf8"),{module,require:id=>{assert.ok(modules[id],"Unexpected dependency "+id);return modules[id]}});return module.exports;}
function nodes(value){if(Array.isArray(value))return value.flatMap(nodes);if(!value||typeof value!=="object")return [];return [value,...nodes(value.children)];}
function find(tree,type,text){const result=nodes(tree).find(n=>n.type===type&&n.props.text===text);assert.ok(result,type+" "+text);return result.props;}
const calls=[],access={authorized:true,owner:true,permissions:[]},noop=()=>{};
const Catalog=load("CatalogScreen"),song={id:"song-id",title:"Canto"},artist={id:"artist-id",name:"Artista"};
for(const [type,record] of [["songs",song],["artists",artist]]){
 const tree=Catalog({type,lists:{[type]:[record]},search:"",setSearch:noop,begin:(...args)=>calls.push(["edit",...args]),access,offline:false,confirmRemove:(...args)=>calls.push(["delete",...args])});
 find(tree,"button","Eliminar").action();find(tree,"row",model.displayTitle(type,record)).action();
 assert.deepEqual(calls.splice(0),[["delete",type,record],["edit",type,record]]);
}
const Editor=load("EditorScreen");
const editorProps={form:{...model.initial("songs"),title:"Canto",lyrics:"G\nLetra"},selectedType:"songs",section:"Letra",update:(...args)=>calls.push(args),adminBack:noop,setSection:noop,lists:{},localId:()=>"id",editing:{id:"song-id"},studioStatus:null,openStudio:noop,editorSaving:false,saveDraft:flag=>calls.push(["save",flag]),access,offline:false};
const openLyricCues=()=>calls.push(["cues"]);let tree=Editor({...editorProps,openLyricCues});const field=nodes(tree).find(n=>n.type==="Field");assert.equal(field.props.spec[0],"lyrics");assert.equal(field.props.onOpenCues,openLyricCues);field.props.onOpenCues();assert.deepEqual(calls.splice(0),[["cues"]]);field.props.onChange("lyrics","Nueva letra");find(tree,"button","Enviar a publicación").action();assert.deepEqual(calls.splice(0),[["lyrics","Nueva letra"],["save",true]]);
tree=Editor({...editorProps,editorSaving:true});assert.equal(find(tree,"button","Enviar a publicación").disabled,true);assert.equal(find(tree,"button","Guardando…").disabled,true);
const listHistory=()=>calls.push(["history-list"]),chooseHistory=(...args)=>calls.push(["history-choose",...args]);
const historyProps={...editorProps,editing:{id:"song-id",expected:"r2"},historyOwner:"owner",listStudioHistory:listHistory,chooseStudioHistory:chooseHistory};
const history=nodes(Editor(historyProps)).find(n=>n.type==="StudioHistory");
assert.ok(history);assert.equal(history.props.revision,"r2");assert.equal(history.props.key,JSON.stringify(["owner","song-id","r2"]));
history.props.onList();history.props.onChoose("revision",false);assert.deepEqual(calls.splice(0),[["history-list"],["history-choose","revision",false]]);
for(const props of [{offline:true},{access:{permissions:["songs.edit"]}},{access:{owner:true,blocked:true}},{editing:{id:"song-id"}}]){
 assert.ok(!nodes(Editor({...historyProps,...props})).some(n=>n.type==="StudioHistory"));
}
assert.notEqual(nodes(Editor({...historyProps,historyOwner:"other"})).find(n=>n.type==="StudioHistory").props.key,history.props.key);
const Pending=load("PendingScreen"),draft={id:"d",type:"songs",body:song,status:"queued"};
tree=Pending({busy:false,offline:false,sendQueue:noop,drafts:[draft],begin:(...args)=>calls.push(args),onTransition:d=>calls.push(["transition",d]),onDelete:d=>calls.push(["delete",d])});
find(tree,"button","Volver a borrador").action();find(tree,"button","Borrar").action();assert.equal(dialog[0],"Eliminar borrador local");dialog[2][1].onPress();assert.deepEqual(calls.splice(0),[["transition",draft],["delete",draft]]);
const Home=load("HomeScreen");
tree=Home({lists:{songs:[song],artists:[artist]},drafts:[draft],begin:type=>calls.push(type),onRepertoires:()=>calls.push("repertoires"),busy:false,refresh:noop,offline:false,session:{email:"admin@example.test"},access,logout:noop});
find(tree,"button","+ Crear canto").action();find(tree,"button","Administrar repertorios").action();assert.deepEqual(calls.splice(0),["songs","repertoires"]);
const Users=load("UsersScreen");
tree=Users({access:{owner:false}});assert.ok(nodes(tree).some(n=>n.props.text?.includes("Solo el superadministrador")));
tree=Users({access,showRoleEditor:false,setShowRoleEditor:noop,roles:[{id:"r",name:"Rol",permissions:[]}],profiles:[{user_id:"u",email:"user@example.test"}],blockedUsers:[],assigned:{u:[]},overrides:{u:{}},inviteRoles:[],trash:[],onToggleRole:(...args)=>calls.push(args),onBlock:id=>calls.push(["block",id]),onUnblock:noop,onRestore:noop});
const chips=nodes(tree).filter(n=>n.type==="chips");chips.at(-1).props.action("r");find(tree,"button","Bloquear acceso").action();dialog[2][1].onPress();assert.deepEqual(calls.splice(0),[["u","r"],["block","u"]]);
console.log("Admin screens: catalog type, editor fields, pending confirmation, home navigation and user callbacks verified.");
