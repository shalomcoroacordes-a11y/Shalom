"use strict";
const React=require("react");
const {View,Text,TextInput,Pressable}=require("react-native");
const {S,C}=require("../styles");
const h=React.createElement;
function txt(value,style){return h(Text,{style},String(value??""));}
function heading(text){return txt(text,S.section);}
function button(title,action,kind,disabled){
 return h(Pressable,{accessibilityRole:"button",disabled:!!disabled,onPress:action,style:[S.btn,kind==="secondary"&&S.btnSecondary,kind==="danger"&&S.btnDanger,disabled&&{opacity:.45}]},txt(title,S.btnText));
}
function chip(text,selected,action){
 return h(Pressable,{onPress:action,style:[S.chip,selected&&S.chipSelected],accessibilityRole:"button"},txt(text,[S.chipText,selected&&S.chipTextSelected]));
}
function input(label,value,onChange,extra){
 return h(View,{style:{gap:5}},txt(label,S.label),h(TextInput,{style:[S.input,extra?.multi&&S.multi],value:String(value??""),onChangeText:onChange,placeholderTextColor:C.muted,multiline:!!extra?.multi,autoCapitalize:extra?.email?"none":"sentences",keyboardType:extra?.email?"email-address":"default",secureTextEntry:!!extra?.secure}));
}
function wrapChips(list,selected,onSelect){
 return h(View,{style:{flexDirection:"row",gap:7,flexWrap:"wrap"}},list.map(([k,label])=>h(View,{key:String(k)},chip(label,Array.isArray(selected)?selected.includes(k):selected===k,()=>onSelect(k)))));
}
function itemRow(title,sub,onPress,right){
 return h(Pressable,{onPress,style:S.item},h(View,{style:S.apart},h(View,{style:{flex:1,gap:3}},txt(title,S.itemTitle),sub?txt(sub,S.itemSub):null),txt(right||"›",{color:C.green,fontSize:20})));
}
module.exports={txt,heading,button,chip,input,wrapChips,itemRow};
