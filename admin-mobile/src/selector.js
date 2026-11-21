"use strict";
const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function filterChoices(options,query){
 const q=normalize(query);
 const source=Array.isArray(options)?options:[];
 const matching=!q?source:source.filter(([,label])=>normalize(label).includes(q));
 return [...matching].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"es",{sensitivity:"base"}));
}
function categoryChoices(categories){
 const list=Array.isArray(categories)?categories:[],byId=new Map(list.map(x=>[x.id,x]));
 function path(row){
  const parents=[],seen=new Set([row.id]);let parent=byId.get(row.parent_id);
  while(parent&&!seen.has(parent.id)&&parents.length<8){
   parents.unshift(parent.name);seen.add(parent.id);parent=byId.get(parent.parent_id);
  }
  return [...parents,row.name].join("  ›  ");
 }
 return list.map(row=>[row.id,path(row)]);
}
module.exports={normalize,filterChoices,categoryChoices};
