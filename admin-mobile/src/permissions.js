"use strict";
const RESOURCES=[
 ["songs","Cantos"],["artists","Artistas"],["albums","Álbumes"],["categories","Categorías"],
 ["medleys","Popurrís"],["repertoires","Repertorios"],["contact_messages","Solicitudes"],
 ["home_recommendations","Destacados"],["site_content","Sitio web"],["roles","Roles y usuarios"]
];
const ACTIONS=[["view","Ver"],["edit","Editar"],["publish","Publicar"],["delete","Eliminar"]];
const ALL=Object.freeze(RESOURCES.flatMap(([key])=>ACTIONS.map(([verb])=>key+"."+verb)));
function effective(access,key){
 if(!access||access.blocked)return false;
 if(access.owner)return true;
 return Array.isArray(access.permissions)&&access.permissions.includes(key);
}
function canPublish(access,type){return effective(access,type+".publish");}
function canEdit(access,type){return effective(access,type+".edit")||canPublish(access,type);}
module.exports={RESOURCES,ACTIONS,ALL,effective,canPublish,canEdit};
