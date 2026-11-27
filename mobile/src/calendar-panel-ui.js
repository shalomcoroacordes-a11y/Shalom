// Calendar presentation: only verified base seasons and real published repertoire dates.
const React=require("react"),h=React.createElement;
const {View,Text,Pressable,StyleSheet}=require("react-native");
const {liturgicalDay,monthDays,shiftMonth}=require("./liturgical-calendar");
const {repertoireType}=require("./repertoire-ui");
const {readingsForDay,readingOptions}=require("./liturgical-readings");
const {seasonalSongs}=require("./liturgical-suggestions");
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COLORS={advent:"#b6a0d9",christmas:"#e8e5d7",lent:"#b6a0d9",triduum:"#b9bdc9",easter:"#e8e5d7",ordinary:"#70c69c"};
function CalendarPanel({context,onOpen,openWeb,songs,onSong}){
 const [selected,setSelected]=React.useState(context.today);
 const [month,setMonth]=React.useState(context.today.slice(0,7));
 const [choice,setChoice]=React.useState(null);
 const options=readingOptions(selected),reading=readingsForDay(selected,choice?.date===selected?choice.id:null);
 const day=liturgicalDay(selected),events=context.events.filter(e=>e.event_date===selected);
 const suggestions=seasonalSongs(songs,day,reading);
 const dateLabel=selected.split("-").reverse().join("/");
 const change=delta=>{const next=shiftMonth(month,delta);setMonth(next);setSelected(next+"-01");};
 const nav=(name,text,fn)=>h(Pressable,{style:S.nav,onPress:fn,accessibilityRole:"button",accessibilityLabel:name},h(Text,{style:S.text},text));
 return h(View,{style:S.root},
  h(Text,{style:S.heading},"Calendario"),
  h(View,{style:S.monthRow},nav("Mes anterior","‹",()=>change(-1)),h(Text,{style:S.month},MONTHS[Number(month.slice(5))-1]+" "+month.slice(0,4)),nav("Mes siguiente","›",()=>change(1))),
  h(View,{style:S.grid},...["L","M","X","J","V","S","D"].map((d,i)=>h(View,{key:"w"+i,style:S.cell},h(Text,{style:S.muted},d))),
   ...monthDays(month).map((d,i)=>d?h(Pressable,{key:d,style:[S.cell,selected===d&&S.selected],onPress:()=>setSelected(d),accessibilityRole:"button",accessibilityLabel:d,accessibilityState:{selected:selected===d}},
    h(Text,{style:[S.text,d===context.today&&S.today]},String(Number(d.slice(-2)))),
    h(View,{style:[S.dot,{backgroundColor:context.events.some(e=>e.event_date===d)?"#27c98b":"transparent"}]})):h(View,{key:"empty"+i,style:S.cell}))),
  h(View,{style:S.line}),
  h(Text,{style:S.muted},dateLabel+" · Ciclo "+(day?.cycle||"—")+"/"+(day?.weekdayCycle||"—")),
  h(View,{style:S.seasonRow},h(View,{style:[S.seasonDot,{backgroundColor:COLORS[day?.season]||"#b0c0c7"}]}),h(Text,{style:S.heading},day?.seasonName||"Fecha no disponible")),
  (reading?.title||day?.title)?h(Text,{style:S.text},reading?.title||day.title):null,
  h(Text,{style:S.muted},"Calendario base. El color indica el tiempo litúrgico, no necesariamente los ornamentos del día."),
  h(Text,{style:S.heading},"Actividades del coro"),
  ...events.map(e=>h(Pressable,{key:String(e.id),style:S.event,onPress:()=>onOpen(e),accessibilityRole:"button",accessibilityLabel:"Abrir "+e.title},
   h(View,{style:{flex:1,minWidth:0}},h(Text,{style:S.text},e.title||"Repertorio SHALOM"),h(Text,{style:S.muted},[repertoireType(e)==="misa"?"Misa":repertoireType(e)==="ensayo"?"Ensayo":"Celebración",e.items.length+" cantos",e.location].filter(Boolean).join(" · "))),h(Text,{style:S.text},"›"))),
  !events.length?h(Text,{style:S.muted},"No hay repertorios publicados para esta fecha."):null,
  h(View,{style:S.line}),
  h(Text,{style:S.heading},"Lecturas de la misa"),
  options.length?h(View,{style:S.readings},h(Text,{style:S.muted},selected.endsWith("-24")?"Referencias de la vigilia vespertina; no corresponden a la misa de la mañana.":"Selecciona la misa que vas a celebrar."),...options.map(option=>h(Pressable,{key:option.id,style:[S.source,choice?.date===selected&&choice.id===option.id&&S.selected],onPress:()=>setChoice({date:selected,id:option.id}),accessibilityRole:"button",accessibilityState:{selected:choice?.date===selected&&choice.id===option.id}},h(Text,{style:S.sourceText},option.label)))):null,
  reading?h(View,{style:S.readings},
   h(Text,{style:S.muted},reading.rank+" · Color de la celebración: "+reading.color),
   ...[["Primera lectura",reading.first],["Salmo responsorial",reading.psalm],["Segunda lectura",reading.second],["Evangelio",reading.gospel]].filter(([,value])=>value).map(([name,value])=>h(View,{key:name,style:S.readingRow},h(Text,{style:S.muted},name),h(Text,{style:S.text},value))),
   h(Text,{style:S.muted},reading.gloria===true?"Se dice Gloria.":reading.gloria===false?"No se dice Gloria.":"Gloria: confirmar en el misal."),
   reading.provisional?h(Text,{style:S.muted},reading.note):null,
   h(Text,{style:S.muted},reading.source+(reading.page?" · p. "+reading.page:"")),
   openWeb?h(Pressable,{style:S.source,onPress:()=>openWeb(reading.url),accessibilityRole:"link",accessibilityLabel:"Consultar misal original"},h(Text,{style:S.sourceText},"Consultar misal original ↗")):null
  ):h(Text,{style:S.muted},options.length?"Elige la celebración para consultar sus lecturas.":"Aún no tenemos lecturas verificadas para esta fecha. Consulta el misal correspondiente. No se muestran lecturas de otro día."),
  h(View,{style:S.line}),h(Text,{style:S.heading},"Cantos relacionados"),
  h(Text,{style:S.muted},"Según las categorías del cancionero. Revisa su adecuación a la celebración antes de elegir."),
  ...suggestions.map(song=>h(Pressable,{key:String(song.id),style:S.event,onPress:()=>onSong?.(song),accessibilityRole:"button",accessibilityLabel:"Abrir canto "+song.title},h(View,{style:{flex:1,minWidth:0}},h(Text,{style:S.text},song.title),h(Text,{style:S.muted},song.tone?"Tono "+song.tone:"Canto del catálogo")),h(Text,{style:S.text},"›"))),
  !suggestions.length?h(Text,{style:S.muted},"No hay cantos con una categoría relacionada."):null
 );
}
const S=StyleSheet.create({root:{gap:10,paddingBottom:12},heading:{fontSize:17,fontWeight:"700",color:"#f4f7f7"},text:{fontSize:14,color:"#f4f7f7"},muted:{fontSize:12,lineHeight:17,color:"#b0c0c7"},monthRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},month:{fontSize:15,color:"#f4f7f7",fontWeight:"600"},nav:{width:44,height:44,alignItems:"center",justifyContent:"center"},grid:{flexDirection:"row",flexWrap:"wrap"},cell:{width:"14.2857%",minHeight:44,alignItems:"center",justifyContent:"center",gap:3},selected:{backgroundColor:"#23483c",borderRadius:8},today:{color:"#27c98b",fontWeight:"700"},dot:{width:5,height:5,borderRadius:3},line:{height:1,backgroundColor:"#354650"},readings:{gap:7},readingRow:{paddingVertical:5,gap:2,borderBottomWidth:1,borderColor:"#354650"},source:{minHeight:44,justifyContent:"center"},sourceText:{fontSize:13,fontWeight:"600",color:"#b5ffe0"},seasonRow:{flexDirection:"row",alignItems:"center",gap:8},seasonDot:{width:9,height:9,borderRadius:5},event:{minHeight:54,flexDirection:"row",alignItems:"center",gap:12,paddingVertical:8,borderBottomWidth:1,borderColor:"#354650"}});
module.exports=CalendarPanel;
