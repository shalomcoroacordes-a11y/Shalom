// Navigation operates on already parsed and decorated rows, never on raw lyrics.
function sectionsOf(rows){
 const sections=[];
 let current={title:"Canto",rows:[]};
 for(const row of rows||[]){
  if(row.kind==="section"){
   const prefix=current.rows.every(r=>r.kind==="space")?current.rows:[];
   if(current.rows.some(r=>r.kind!=="space"))sections.push(current);
   current={title:row.text||"Sección",rows:[...prefix,row]};
  }else current.rows.push(row);
 }
 if(current.rows.length||!sections.length)sections.push(current);
 return sections;
}
function navigation(entries){
 return (entries||[]).flatMap((entry,entryIndex)=>sectionsOf(entry.rows).map((section,sectionIndex)=>({...section,entryIndex,sectionIndex,key:String(entryIndex)+":"+sectionIndex})));
}
function moveIndex(index,delta,length){
 return Math.max(0,Math.min(Math.max(0,length-1),index+delta));
}
// Bounded search on actual rendered dimensions. Keep a readable minimum;
// overflow remains scrollable when even that minimum cannot fit.
function chooseFitFont(min,max,fits){
 let low=Math.ceil(min*10),high=Math.floor(max*10),best=low;
 while(low<=high){
  const mid=Math.floor((low+high)/2);
  if(fits(mid/10)){best=mid;low=mid+1;}else high=mid-1;
 }
 return best/10;
}
// Measure the actual scroll viewport and the controls surrounding the score.
// Other reader metadata remains scrollable rather than shrinking the score.
const SECTION_GAP=10;
function sectionFitHeight(viewport,header,footer){
 if(!Number.isFinite(viewport)||viewport<=0||!Number.isFinite(header)||header<0||!Number.isFinite(footer)||footer<0)return 0;
 return Math.max(1,Math.floor(viewport-header-footer-2*SECTION_GAP));
}
const sectionReaderCore=Object.freeze({sectionsOf,navigation,moveIndex,chooseFitFont,sectionFitHeight,SECTION_GAP});
if(typeof module==="object"&&module.exports)module.exports=sectionReaderCore;
else globalThis.ShalomSectionReaderCore=sectionReaderCore;
