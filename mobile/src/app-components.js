// Componentes compartidos de SHALOM Android: presentacion sin navegacion ni datos.
const React=require("react");
const {useState}=React;
const {View,Text,TextInput,Pressable,ScrollView,Image}=require("react-native");
const {names,typeLabel,safeWebUrl}=require("./catalog");
const h=React.createElement;

module.exports=function createAppComponents({styles:S,colors:C,images:HOME_IMAGES,InitialCover}){
const label=(value,style)=>h(Text,{style:style||S.info},String(value??""));
const type=val=>typeLabel(val);
const inputField=(name,value,onChangeText,more={})=>h(View,{style:S.field,key:name},
 label(name,S.fieldTitle),
 h(TextInput,{style:[S.input,more.multiline&&S.multiline],value,onChangeText,
  placeholderTextColor:C.muted,placeholder:more.placeholder||"",multiline:Boolean(more.multiline),
  textAlignVertical:more.multiline?"top":"center",
  autoCapitalize:more.email?"none":"sentences",
  keyboardType:more.email?"email-address":more.url?"url":"default",
  maxLength:more.maxLength||2500})
);
function Btn({text,onPress,small=false,secondary=false,disabled=false}){
 return h(Pressable,{onPress,disabled,accessibilityRole:"button",accessibilityLabel:String(text),accessibilityState:{disabled},
   style:[S.button,secondary&&S.secondary,small&&S.smallBtn,disabled&&{opacity:.5}]},
  label(text,[S.buttonText,secondary&&S.secondaryText,small&&S.smallBtnText]));
}
function Card({children,style}){return h(View,{style:[S.card,style]},children)}
function Chip({text,active=false,onPress}){
 return h(Pressable,{onPress,accessibilityRole:"button",accessibilityLabel:String(text),accessibilityState:{selected:active},style:[S.chip,active&&S.chipActive]},
 label(text,[S.chipText,active&&{color:C.bg}]));
}
function SongRow({song,onPress}) {
 return h(Pressable,{onPress,style:S.listRow,accessibilityRole:"button",key:song.id},
  h(View,{style:{flex:1}},
   label(song.title||"Sin título",S.listTitle),
   label([names(song._artists),song.tone?"Tono "+song.tone:""].filter(Boolean).join(" · ")||type(song.song_type),S.rowMeta)),
  label("›",S.rowArrow));
}
function EntityRow({item,onPress,description,kind}) {
 const categoryIcon=kind==="folder"?(/misa|liturg/i.test(item.name||"")?"mass":"categories"):null;
 return h(Pressable,{onPress,style:S.listRow,accessibilityRole:"button",key:item.id},
  h(View,{style:S.entityIcon},h(Image,{source:HOME_IMAGES[kind==="artist"?"artists":kind==="folder"?categoryIcon:"repertoires"],resizeMode:"contain",style:{width:24,height:24,tintColor:C.green}})),
  h(View,{style:{flex:1}},
   label(item.name||item.title||"Sin nombre",S.listTitle),
   label(description||"Abrir detalles",S.rowMeta)),
  label("›",S.rowArrow));
}
function Photo({url,labelText}) {
 const uri=safeWebUrl(url);
 const [failed,setFailed]=useState(false);
 if(!uri||failed)return h(View,{style:S.photoPlaceholder},
   label((labelText||"♪").trim().slice(0,2).toUpperCase(),S.photoLetter));
 return h(Image,{source:{uri},style:S.photo,onError:()=>setFailed(true)});
}
function AppSectionHeader({section,onBack,onSettings}){
 return h(View,{style:S.sectionTopBar},
  onBack?h(Pressable,{style:S.sectionHeaderSide,onPress:onBack,accessibilityRole:"button",accessibilityLabel:"Volver"},
   h(Image,{source:HOME_IMAGES.back,resizeMode:"contain",style:{width:24,height:24,tintColor:C.text}})):h(View,{style:S.sectionHeaderSide}),
  h(View,{style:S.sectionHeaderIdentity},
   h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.sectionHeaderLogo,accessibilityLabel:"Logo oficial de SHALOM"}),
   h(View,{style:{flexShrink:1,minWidth:0}},
    label("SHALOM",S.sectionHeaderBrand),
    h(Text,{style:S.sectionHeaderSubtitle,numberOfLines:1},section||"Coro y Alabanza"))),
  onSettings?h(Pressable,{style:S.sectionHeaderSide,onPress:onSettings,accessibilityRole:"button",accessibilityLabel:"Abrir configuración"},
   h(Image,{source:HOME_IMAGES.settings,resizeMode:"contain",style:{width:24,height:24,tintColor:C.text}})):h(View,{style:S.sectionHeaderSide})
 );
}
function AppDetailHeader(props){return h(AppSectionHeader,{...props})}

function SectionHero({title,subtitle,icon}){
 return h(View,{style:S.repHeading},
  h(Image,{source:HOME_IMAGES[icon]||HOME_IMAGES.song,resizeMode:"contain",style:S.repHeadingIcon}),
  h(View,{style:{flex:1,minWidth:0}},
   h(Text,{style:S.repTitle,numberOfLines:2,adjustsFontSizeToFit:true,minimumFontScale:.8},title),
   h(Text,{style:S.repSubtitle,numberOfLines:2},subtitle||"")));
}
function SectionFilterBar({options,value,onChange,compact=false}){
 return h(ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
  contentContainerStyle:[S.repFilters,compact&&S.sectionFiltersCompact]},
  ...options.map(([code,text,icon])=>{
   const selected=value===code;
   return h(Pressable,{key:String(code),onPress:()=>onChange(code),
    accessibilityRole:"button",accessibilityLabel:"Filtrar: "+text,
    accessibilityState:{selected},style:[S.repFilterChip,selected&&S.repFilterActive]},
    icon?h(Image,{source:HOME_IMAGES[icon]||HOME_IMAGES.song,resizeMode:"contain",
     style:[S.repFilterIcon,{tintColor:selected?C.bg:C.text}]}):null,
    label(text,[S.repFilterText,selected&&S.repFilterTextActive]));
  }));
}
function SectionSearch({value,onChangeText,placeholder}){
 return h(TextInput,{style:S.repSearchInput,value,onChangeText,
  placeholder,placeholderTextColor:C.muted,autoCorrect:false,
  accessibilityLabel:placeholder,returnKeyType:"search"});
}
function SectionListCard({title,subtitle,meta,icon,onPress}){
 return h(Pressable,{style:S.repCard,onPress,accessibilityRole:"button",
  accessibilityLabel:[title,subtitle].filter(Boolean).join(", ")},
  icon&&HOME_IMAGES[icon]?h(View,{style:S.repCardIconWrap},h(Image,{source:HOME_IMAGES[icon],style:S.repCardIcon,resizeMode:"contain",accessible:false})):h(InitialCover,{title:title||"Canto",size:53}),
  h(View,{style:{flex:1,minWidth:0}},
   h(Text,{style:S.repCardTitle,numberOfLines:2},title||"Sin título"),
   subtitle?h(Text,{style:S.repCardCount,numberOfLines:2},subtitle):null,
   meta?h(Text,{style:S.repCardMeta,numberOfLines:1},meta):null),
  h(Image,{source:HOME_IMAGES.chevron,resizeMode:"contain",style:{width:24,height:24,tintColor:C.muted},accessible:false}));
}
function SectionEmpty({message}){
 return h(View,{style:S.repEmptyCard},
  h(Image,{source:HOME_IMAGES.logo,resizeMode:"contain",style:S.repEmptyLogo}),
  label(message,S.repEmptyText));
}

 return Object.freeze({label,type,inputField,Btn,Card,Chip,SongRow,EntityRow,Photo,AppSectionHeader,AppDetailHeader,SectionHero,SectionFilterBar,SectionSearch,SectionListCard,SectionEmpty});
};
