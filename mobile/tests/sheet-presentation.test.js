const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
function load(path){
 const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync(path,"utf8"),{module:mod,require(name){
 if(name==="react")return {createElement:h,useState:v=>[v,()=>{}]};
 if(name==="react-native")return {...Object.fromEntries(["Modal","View","Text","TextInput","Pressable","ScrollView","KeyboardAvoidingView"].map(x=>[x,x])),StyleSheet:{create:v=>v,absoluteFillObject:{}},Platform:{OS:"android"},Alert:{alert(){}}};
 if(name==="./visual-ui")return {InitialCover:"InitialCover"};
 if(name==="./song-actions-core")return {entriesOf:()=>[],NAMES:{}};
 throw Error(name);
 }});
 return mod.exports;
}
function find(n,p){if(!n||typeof n!=="object")return null;if(p(n))return n;for(const c of n.children||[]){const r=find(c,p);if(r)return r}return null}
const Song=load("src/song-actions-ui.js"),Profile=load("src/profile-options-menu.js");
const calls=[],dismiss=()=>calls.push("dismiss"),edit=()=>calls.push("edit");
for(const [Component,props,baseline] of [[Song,{song:{title:"Gloria"},store:{collections:[]},onDismiss:dismiss},20],[Profile,{visible:true,onDismiss:dismiss,onEdit:edit},26]]){
 const normal=Component({...props,motionEnabled:true,bottomInset:0});
 assert.equal(normal.props.animationType,"slide");
 const reduced=Component({...props,motionEnabled:false,bottomInset:34});
 assert.equal(reduced.props.animationType,"none");
 const panel=find(reduced,n=>n.type==="View"&&n.props.accessibilityViewIsModal);
 assert.equal(panel.props.style[1].paddingBottom,46);
 const defaultPanel=find(normal,n=>n.type==="View"&&n.props.accessibilityViewIsModal);
 assert.equal(defaultPanel.props.style[1].paddingBottom,baseline);
 reduced.props.onRequestClose();assert.equal(calls.at(-1),"dismiss");
 const action=find(normal,n=>n.type==="Pressable"&&typeof n.props.style==="function");
 assert.ok(action);assert.ok(action.props.style({pressed:true})[1]);assert.equal(action.props.style({pressed:false})[1],false);
}
const menu=Profile({visible:true,onDismiss:dismiss,onEdit:edit});
find(menu,n=>n.props.accessibilityLabel==="Editar perfil").props.onPress();
assert.deepEqual(calls.slice(-2),["dismiss","edit"]);
const guitar=()=>calls.push("guitar");
const full=Song({song:{title:"Gloria",_studio:{},youtube_url:"https://www.youtube.com/watch?v=example"},store:{collections:[]},onDismiss:dismiss,onStudio:guitar});
const practice=find(full,n=>n.props.accessibilityLabel==="Practicar con guitarra");
assert.ok(practice,"Studio action remains available when arrangement exists");
const favorite=find(full,n=>n.props.accessibilityLabel==="Agregar a Mis me gusta");
assert.equal(practice.props.style({pressed:false})[0],favorite.props.style({pressed:false})[0],"Studio uses the same neutral row");
assert.equal(practice.props.style({pressed:false})[0].minHeight,44);
assert.equal(practice.props.accessibilityHint,"Rasgueos y acompañamiento sin conexión");
assert.ok(!find(practice,n=>n.type==="Text"&&n.children.includes("Rasgueos y acompañamiento sin conexión")),"Main menu has no visual subtitle");
assert.ok(find(full,n=>n.props.accessibilityLabel==="Abrir YouTube"));
assert.equal(find(Song({song:{title:"Gloria"},store:{collections:[]},onDismiss:dismiss,onStudio:guitar}),n=>n.props.accessibilityLabel==="Practicar con guitarra"),null);
practice.props.onPress();
assert.deepEqual(calls.slice(-2),["dismiss","guitar"]);
console.log("Bottom sheets: native animation, reduced motion, safe-area spacing, compact neutral rows and Studio actions verified.");
