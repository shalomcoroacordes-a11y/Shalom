// Presentacion del formulario Solicitar: estado y envío pertenecen a AppScreen.
// Campos declarativos, sin credenciales, peticiones, escrituras ni estado global.
const React=require("react");
const {View}=require("react-native");
const {TYPES}=require("./requests");
const h=React.createElement;
const REQUEST_FIELDS=Object.freeze([
 Object.freeze({key:"title",label:"Nombre del canto o tema",
  options:Object.freeze({maxLength:160,placeholder:"Ej. Canto de entrada"})}),
 Object.freeze({key:"artist",label:"Artista o ministerio (opcional)",
  options:Object.freeze({maxLength:160})}),
 Object.freeze({key:"link",label:"Enlace de YouTube o referencia (opcional)",
  options:Object.freeze({url:true,maxLength:400,placeholder:"https://…"})}),
 Object.freeze({key:"details",label:"¿Qué propones o qué debemos corregir?",
  options:Object.freeze({multiline:true,maxLength:2500,
   placeholder:"Describe dónde está el error o qué canto te gustaría agregar…"})}),
 Object.freeze({key:"name",label:"Tu nombre (opcional)",
  options:Object.freeze({maxLength:120})}),
 Object.freeze({key:"email",label:"Correo de contacto (opcional)",
  options:Object.freeze({email:true,maxLength:160})})
]);

function RequestScreen({styles:S,online,sending,form,onChange,onSubmit,ui}){
 const {title,label,inputField,Chip,Btn}=ui;
 return h(View,null,
  title("Solicitudes y correcciones","Los administradores de SHALOM revisarán cada mensaje."),
  !online?label("Para enviar una solicitud necesitas conexión. Puedes seguir consultando los cantos descargados sin internet.",S.error):null,
  label("¿Qué deseas solicitar?",S.fieldTitle),
  h(View,{style:S.chips},
   ...Object.entries(TYPES).map(([kind,name])=>h(Chip,{
    key:kind,text:name,active:form.kind===kind,onPress:()=>onChange.kind(kind)
   }))),
  ...REQUEST_FIELDS.map(field=>inputField(field.label,form[field.key],
   onChange[field.key],field.options)),
  h(Btn,{text:sending?"Enviando solicitud…":"Enviar al administrador",
   onPress:onSubmit,disabled:sending}),
  label("Se requiere internet para enviar. No modifica la canción directamente.",S.smallMuted)
 );
}
module.exports=RequestScreen;
module.exports.REQUEST_FIELDS=REQUEST_FIELDS;
