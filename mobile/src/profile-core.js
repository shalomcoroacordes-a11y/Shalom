// Los datos personales del perfil son locales; no se guardan ni publican en Supabase.
const PROFILE_KEY="shalom_local_profile_v1";
const {COVER_FILE}=require("./personal-collections");
const BANNER_ACTIONS=["explorar","repertorios","recientes","favoritos","popurris"];
const PRESETS=["dove","sunrise","guitar","adoration","book","flowers","choir","music"];
const defaults=()=>({version:1,name:"Mi perfil",subtitle:"Coro y Alabanza",avatar:null,cover:null,
 banner:null,bannerPreset:"sunrise",bannerAction:"explorar",bannerTitle:"Cantos para acercarte a Dios"});
const trimmed=(v,n)=>String(v||"").trim().slice(0,n);
const validPhoto=v=>typeof v==="string"&&COVER_FILE.test(v)?v:null;
function parseProfile(raw){
 try{
  const data=JSON.parse(String(raw||"{}")),base=defaults();
  if(!data||data.version!==1)return base;
  return {...base,name:trimmed(data.name,45)||base.name,
   subtitle:trimmed(data.subtitle,75)||base.subtitle,
   avatar:validPhoto(data.avatar),cover:validPhoto(data.cover),banner:validPhoto(data.banner),
   bannerPreset:PRESETS.includes(data.bannerPreset)?data.bannerPreset:base.bannerPreset,
   bannerAction:BANNER_ACTIONS.includes(data.bannerAction)?data.bannerAction:base.bannerAction,
   bannerTitle:trimmed(data.bannerTitle,88)||base.bannerTitle};
 }catch(_){return defaults();}
}
module.exports={PROFILE_KEY,BANNER_ACTIONS,defaults,parseProfile};
