// Contrato visual e interactivo de componentes nativos sin arrancar Android.
const assert=require("node:assert/strict");
const Module=require("node:module");
const originalLoad=Module._load;
const mock={View:"View",Text:"Text",TextInput:"TextInput",
 Pressable:"Pressable",ScrollView:"ScrollView",Image:"Image"};
try{
 Module._load=function(request,parent,isMain){
  if(request==="react-native")return mock;
  return originalLoad.call(this,request,parent,isMain);
 };
 const React=require("react");
 const create=require("../src/app-components");
 const styles=new Proxy({}, {get:(_target,key)=>String(key)});
 const colors={muted:"#aaa",text:"#fff",green:"#27c98b"};
 const images={logo:"dove.png",song:"song.png",mass:"mass.png"};
 function InitialCover(){}
 const ui=create({styles,colors,images,InitialCover});
 assert.strictEqual(Object.isFrozen(ui),true);
 assert.equal(ui.label("Canto").props.children,"Canto");
 assert.equal(ui.label(null).props.children,"");
 assert.equal(ui.AppDetailHeader({section:"Prueba"}).type,ui.AppSectionHeader);
 const header=ui.AppSectionHeader({section:"Repertorios",onBack:()=>{}});
 assert.equal(header.type,"View");
 assert.equal(header.props.children.length,3);
 assert.equal(header.props.children[1].props.children[0].type,"Image");
 assert.equal(header.props.children[1].props.children[0].props.source,"dove.png");
 let selected=null;
 const options=[["todos","Todos",null],["misa","Misa","mass"]];
 const filter=ui.SectionFilterBar({options,value:"misa",onChange:v=>selected=v});
 const chips=filter.props.children;
 assert.equal(chips.length,2);
 assert.equal(chips[1].props.accessibilityState.selected,true);
 assert.equal(chips[0].props.accessibilityState.selected,false);
 chips[0].props.onPress();
 assert.equal(selected,"todos");
 const card=ui.SectionListCard({title:"Misa de hoy",subtitle:"3 cantos",meta:"Domingo",onPress:()=>{}});
 assert.equal(card.type,"Pressable");
 assert.match(card.props.accessibilityLabel,/Misa de hoy/);
 assert.equal(card.props.children[0].type,InitialCover);
 const empty=ui.SectionEmpty({message:"Aún no hay cantos"});
 assert.equal(empty.props.children[0].props.source,"dove.png");
 assert.equal(ui.SectionHero({title:"Repertorio",icon:"mass"}).props.children[0].props.source,"mass.png");
 const search=ui.SectionSearch({value:"Gloria",placeholder:"Buscar",onChangeText:()=>{}});
 assert.equal(search.props.value,"Gloria");
 assert.equal(search.props.accessibilityLabel,"Buscar");
 console.log("SHALOM: componentes comunes preservan paloma, filtros, accesibilidad y tarjetas.");
}finally{
 Module._load=originalLoad;
}
