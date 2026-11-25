"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const builder=require("../scripts/build-studio-native.js");
const read=name=>fs.readFileSync(name,"utf8");
builder.sync({read,check:true});
for(const file of ["mobile/src/studio-screen.js","admin-mobile/src/studio-screen.js","mobile/src/studio-collections.js"]){
 assert.throws(()=>builder.sync({read:name=>name===file?read(name)+"\n// drift":read(name),check:true}),/differs from canonical Studio sources/);
}
function fixture(file,mode,queue){
 const calls=[],injected=[],alerts=[],effects=[],events={};
 let refs=[];
 const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useRef:value=>{const ref={current:value};refs.push(ref);return ref},useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)};
 const rn={Modal:"Modal",View:"View",Text:"Text",Pressable:"Pressable",AppState:{addEventListener:(name,fn)=>{events[name]=fn;return {remove:()=>delete events[name]}}},Alert:{alert:(...args)=>alerts.push(args)}};
 const module={exports:{}};
 const req=name=>name==="react"?React:name==="react-native"?rn:name==="react-native-safe-area-context"?{SafeAreaView:"SafeAreaView"}:name==="react-native-webview"?{WebView:"WebView"}:name==="./studio-bundle"?payload=>"html:"+payload.mode:undefined;
 vm.runInNewContext(read(file),{module,require:req});
 const tree=module.exports({payload:{mode},onClose:()=>calls.push("close"),onSaveDraft:async()=>calls.push("draft"),onPublish:async()=>calls.push("publish"),queue,onNext:n=>calls.push(n)});
 const all=node=>node&&typeof node==="object"?[node,...node.children.flatMap(all)]:[];
 const elements=all(tree),web=elements.find(node=>node.type==="WebView").props;
 web.ref.current={injectJavaScript:code=>injected.push(code)};
 const cleanup=effects.map(fn=>fn());
 const message=(type,arrangement={v:1})=>web.onMessage({nativeEvent:{data:JSON.stringify({type,arrangement})}});
 return {tree,web,calls,injected,alerts,events,elements,message,cleanup};
}
async function test(){
 const pub=fixture("mobile/src/studio-screen.js","public",{index:0,entries:[1,2]});
 assert.equal(pub.web.source.html,"html:public");assert.equal(pub.web.allowFileAccess,false);assert.equal(pub.web.domStorageEnabled,false);assert.equal(pub.web.mixedContentMode,"never");
 assert.equal(pub.web.onShouldStartLoadWithRequest({url:"https://example.test"}),false);
 assert.equal(pub.web.onShouldStartLoadWithRequest({url:"about:blank"}),true);
 await pub.message("shalom-studio-publish");await pub.message("shalom-studio-draft");assert.equal(pub.calls.length,0);
 const buttons=pub.elements.filter(n=>n.type==="Pressable");
 assert.equal(buttons.length,3);assert.equal(buttons[1].props.disabled,true);
 buttons[2].props.onPress();assert.deepEqual(pub.calls,[1]);
 pub.events.change("background");assert.match(pub.injected[0],/pause/);
 const admin=fixture("admin-mobile/src/studio-screen.js","admin");
 assert.equal(admin.elements.filter(n=>n.type==="Pressable").length,1);
 await admin.message("shalom-studio-publish",{v:2});await admin.message("shalom-studio-publish",{v:1,data:"x".repeat(64000)});assert.equal(admin.calls.length,0);
 await admin.message("shalom-studio-draft");await admin.message("shalom-studio-publish");assert.deepEqual(admin.calls,["draft","publish"]);
 assert.match(admin.injected[0],/Borrador guardado/);assert.match(admin.injected[1],/✓ Acompañamiento guardado y publicado/);
 admin.web.onLoadEnd();admin.tree.props.onRequestClose();assert.match(admin.injected[2],/__shalomStudioBack/);
 await admin.message("shalom-studio-close");assert.deepEqual(admin.calls,["draft","publish","close"]);
 admin.cleanup.forEach(fn=>fn());assert.equal(admin.events.change,undefined);
 console.log("Shared Studio screen: generation, drift checks, public write rejection, admin messages, queue, WebView restrictions and close verified.");
}
test().catch(error=>{console.error(error);process.exitCode=1});
