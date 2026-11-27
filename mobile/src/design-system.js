// Interface typography only. Music score and artwork keep explicit font families.
const GUTTER=16,ICON=24,TOUCH=48;
const type=Object.freeze({hero:24,heading:20,subheading:18,body:16,secondary:14,caption:12,nav:11});
const weight=Object.freeze({regular:"400",medium:"500",semibold:"600",bold:"700"});
function normalizeStyles(styles){
 return Object.fromEntries(Object.entries(styles).map(([name,style])=>{
  if(!style||typeof style!=="object"||style.fontFamily)return [name,style];
  const value={...style};
  if(typeof value.fontSize==="number"||typeof value.fontWeight==="string"){
   value.fontFamily="Inter";
   if(typeof value.fontWeight==="string"&&/^\d+$/.test(value.fontWeight)){
    const n=Number(value.fontWeight);value.fontWeight=n>=600?(value.fontSize>=20?weight.semibold:weight.medium):n>=500?weight.medium:weight.regular;
   }
  }
  return [name,value];
 }));
}
function createStyles(StyleSheet,styles){return StyleSheet.create(normalizeStyles(styles));}
module.exports=Object.freeze({GUTTER,ICON,TOUCH,type,weight,normalizeStyles,createStyles});
