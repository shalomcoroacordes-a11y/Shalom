const h=require("react").createElement;
const {Image}=require("react-native");
const ICONS={
 heart:require("../assets/home-heart.png"),
 guitar:require("../assets/home-guitar.png"),
 share:require("../assets/home-share.png"),
 link:require("../assets/home-link.png"),
 print:require("../assets/home-print.png"),
 download:require("../assets/home-download.png"),
 fullscreen:require("../assets/home-fullscreen.png"),
 reset:require("../assets/home-reset.png"),
 edit:require("../assets/home-edit.png"),
 backup:require("../assets/home-backup.png"),
 external:require("../assets/home-external.png"),
 repertoires:require("../assets/home-repertoires.png"),
 church:require("../assets/home-church.png"),
 medleys:require("../assets/home-medleys.png"),
 more:require("../assets/home-more.png"),
 song:require("../assets/home-song.png"),
 youtube:require("../assets/social-youtube.png")
};
function ActionIcon({name,active=false}){return h(Image,{source:ICONS[name]||ICONS.more,resizeMode:"contain",accessible:false,style:{width:19,height:19,tintColor:active?"#27c98b":"#b0c0c7"}})}
module.exports=ActionIcon;
