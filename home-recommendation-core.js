/* Shared classification rules for the public home and its administrative editor. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.ShalomHomeRecommendations=api;
})(typeof globalThis==="object"?globalThis:this,function(){
  "use strict";
  const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const contentType = (value) => {
      const type = normalize(value);
      if (type.includes("catolic")) return "catolico";
      if (type.includes("cristian")) return "cristiano";
      if (type.includes("mixto")) return "mixto";
      return "general";
    };
  function sectionFor(row, item) {
    const type = contentType(item?.song_type);
    return type === "catolico" || type === "cristiano" ? type : (row.section_type === "cristiano" ? "cristiano" : "catolico");
  }
  return Object.freeze({contentType,sectionFor});
});
