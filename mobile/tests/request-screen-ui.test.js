// Contrato del formulario nativo sin acceder al servidor ni iniciar Android.
const assert=require("node:assert/strict");
const Module=require("node:module");
const previous=Module._load;
try{
 Module._load=function(request,parent,isMain){
  if(request==="react-native")return {View:"View"};
  return previous.call(this,request,parent,isMain);
 };
 const React=require("react");
 const h=React.createElement;
 const RequestScreen=require("../src/request-screen-ui");
 const {TYPES}=require("../src/requests");
 const labels=[];
 const ui={
  title:(text,subtitle)=>h("Title",{text,subtitle}),
  label:(text,style)=>h("Label",{text,style}),
  inputField:(name,value,onChangeText,options)=>h("Input",{name,value,onChangeText,options}),
  Chip:({text,active,onPress})=>h("Chip",{text,active,onPress}),
  Btn:({text,onPress,disabled})=>h("Button",{text,onPress,disabled})
 };
 const styles={error:"error",fieldTitle:"fieldTitle",chips:"chips",smallMuted:"smallMuted"};
 let kind="";
 let submitted=0;
 const changes={kind:value=>{kind=value}};
 for(const key of RequestScreen.REQUEST_FIELDS.map(f=>f.key))
  changes[key]=value=>labels.push([key,value]);
 const form={kind:"song",title:"Misa",artist:"Coro",link:"",details:"Prueba",
  name:"",email:""};
 const screen=RequestScreen({styles,online:false,sending:false,
  form,onChange:changes,onSubmit:()=>{submitted++},ui});
 assert.equal(screen.type,"View");
 const nodes=screen.props.children;
 assert.equal(nodes[0].props.text,"Solicitudes y correcciones");
 assert.match(nodes[1].props.text,/necesitas conexión/);
 const chips=nodes[3].props.children;
 assert.deepEqual(chips.map(x=>x.key),Object.keys(TYPES));
 assert.equal(chips[0].props.active,true);
 chips[1].props.onPress();
 assert.equal(kind,"lyrics");
 const inputs=nodes.slice(4,10);
 assert.deepEqual(inputs.map(x=>x.props.name),RequestScreen.REQUEST_FIELDS.map(f=>f.label));
 assert.deepEqual(inputs.map(x=>x.props.value),
  [form.title,form.artist,form.link,form.details,form.name,form.email]);
 assert.deepEqual(inputs.map(x=>x.props.options.maxLength),[160,160,400,2500,120,160]);
 assert.equal(inputs[2].props.options.url,true);
 assert.equal(inputs[3].props.options.multiline,true);
 assert.equal(inputs[5].props.options.email,true);
 inputs[3].props.onChangeText("Corrige el coro");
 assert.deepEqual(labels,[["details","Corrige el coro"]]);
 assert.equal(nodes[10].props.disabled,false);
 assert.equal(nodes[10].props.text,"Enviar al administrador");
 nodes[10].props.onPress();
 assert.equal(submitted,1);
 const submitting=RequestScreen({...{styles,form,onChange:changes,ui},
  online:true,sending:true,onSubmit:()=>{}});
 assert.equal(submitting.props.children[1],null);
 assert.equal(submitting.props.children[10].props.disabled,true);
 assert.equal(submitting.props.children[10].props.text,"Enviando solicitud…");
 assert.equal(submitting.props.children[11].props.text,
  "Se requiere internet para enviar. No modifica la canción directamente.");
 console.log("SHALOM: formulario nativo mantiene campos, límites, modo offline y envío.");
}finally{
 Module._load=previous;
}
