// Dated lectionary references only. No copied liturgical translation.
// Verified against the monthly missal published on the Archdiocese of Toluca website.
// Never substitute another year's or date's reading, even when offline.
const SOURCE="https://arquidiocesistoluca.org.mx/wp-content/uploads/2026/11/Misal-noviembre-2026.pdf";
const RECORDS=Object.freeze({
 "2026-11-29":Object.freeze({title:"I Domingo de Adviento",color:"morado",rank:"Domingo",first:"Is 63, 16-17.19; 64, 2-7",psalm:"Sal 79",second:"1 Cor 1, 3-9",gospel:"Mc 13, 33-37",page:160,gloria:false}),
 "2026-11-30":Object.freeze({title:"San Andrés, apóstol",color:"rojo",rank:"Fiesta",first:"Rom 10, 9-18",psalm:"Sal 18",second:null,gospel:"Mt 4, 18-22",page:166,gloria:true})
});
function readingsForDay(date){
 if(!Object.prototype.hasOwnProperty.call(RECORDS,date))return null;
 const row=RECORDS[date];
 return {...row,date,source:"Misal noviembre 2026 · publicado por Arquidiócesis de Toluca",url:SOURCE+"#page="+row.page};
}
module.exports={readingsForDay};
