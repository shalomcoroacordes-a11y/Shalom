// Shared browser/CommonJS module. Single source of truth for web and Android.
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./liturgical-year-data"):root.ShalomLiturgicalYearData);if(typeof module==="object"&&module.exports)module.exports=api;else root.ShalomLiturgicalReadings=api;})(typeof window!=="undefined"?window:globalThis,function(annual){
// Dated lectionary references only. No copied liturgical translation.
// Sources are recorded per date: Toluca monthly missal, FDLC seasonal guide, Mexican Guadalupe missal.
// Never substitute another year's or date's reading, even when offline.
const SOURCE="https://arquidiocesistoluca.org.mx/wp-content/uploads/2026/11/Misal-noviembre-2026.pdf";
const RECORDS=Object.freeze({
 "2026-11-29":Object.freeze({title:"I Domingo de Adviento",color:"morado",rank:"Domingo",first:"Is 63, 16-17.19; 64, 2-7",psalm:"Sal 79",second:"1 Cor 1, 3-9",gospel:"Mc 13, 33-37",page:160,gloria:false}),
 "2026-11-30":Object.freeze({title:"San Andrés, apóstol",color:"rojo",rank:"Fiesta",first:"Rom 10, 9-18",psalm:"Sal 18",second:null,gospel:"Mt 4, 18-22",page:166,gloria:true})
});
const EXTRA=Object.freeze([
 {
  "date": "2026-12-06",
  "title": "II Domingo de Adviento",
  "color": "morado",
  "rank": "Domingo",
  "first": "Is 40, 1-5.9-11",
  "psalm": "Sal 84, 9-14",
  "second": "2 Pe 3, 8-14",
  "gospel": "Mc 1, 1-8",
  "page": 26,
  "gloria": false,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=26"
 },
 {
  "date": "2026-12-08",
  "title": "Inmaculada Concepción de María",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Gn 3, 9-15.20",
  "psalm": "Sal 97, 1-4",
  "second": "Ef 1, 3-6.11-12",
  "gospel": "Lc 1, 26-38",
  "page": 26,
  "gloria": true,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=26"
 },
 {
  "date": "2026-12-12",
  "title": "Nuestra Señora de Guadalupe",
  "color": "blanco",
  "rank": "Solemnidad en México",
  "first": "Is 7, 10-14",
  "psalm": "Sal 66",
  "second": "Gal 4, 4-7",
  "gospel": "Lc 1, 39-48",
  "page": null,
  "gloria": true,
  "source": "La Verdad Católica · Misal México, 12 diciembre 2026",
  "url": "https://laverdadcatolica.org/misal-sabado-12-de-diciembre-del-2026/"
 },
 {
  "date": "2026-12-13",
  "title": "III Domingo de Adviento (Gaudete)",
  "color": "morado o rosa",
  "rank": "Domingo",
  "first": "Is 61, 1-2a.10-11",
  "psalm": "Lc 1, 46-48.49-50.53-54",
  "second": "1 Tes 5, 16-24",
  "gospel": "Jn 1, 6-8.19-28",
  "page": 26,
  "gloria": false,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=26"
 },
 {
  "date": "2026-12-20",
  "title": "IV Domingo de Adviento",
  "color": "morado",
  "rank": "Domingo",
  "first": "2 Sam 7, 1-5.8b-12.14a.16",
  "psalm": "Sal 88, 2-5.27.29",
  "second": "Rom 16, 25-27",
  "gospel": "Lc 1, 26-38",
  "page": 26,
  "gloria": false,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=26"
 },
 {
  "date": "2026-12-27",
  "title": "Sagrada Familia",
  "color": "blanco",
  "rank": "Fiesta",
  "first": "Gn 15, 1-6; 21, 1-3 o Eclo 3, 2-6.12-14",
  "psalm": "Sal 104, 1-6.8-9 o Sal 127, 1-5",
  "second": "Heb 11, 8.11-12.17-19 o Col 3, 12-21 (o 12-17)",
  "gospel": "Lc 2, 22-40 o 2, 22.39-40",
  "page": 27,
  "gloria": true,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 },
 {
  "date": "2027-01-01",
  "title": "Santa María, Madre de Dios",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Num 6, 22-27",
  "psalm": "Sal 66, 2-3.5-6.8",
  "second": "Gal 4, 4-7",
  "gospel": "Lc 2, 16-21",
  "page": 27,
  "gloria": true,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 },
 {
  "date": "2027-01-03",
  "title": "Epifanía del Señor",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Is 60, 1-6",
  "psalm": "Sal 71, 1-2.7-8.10-13",
  "second": "Ef 3, 2-3a.5-6",
  "gospel": "Mt 2, 1-12",
  "page": 27,
  "gloria": true,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 }
]);
const VARIANTS=Object.freeze([
 {
  "date": "2026-12-24",
  "id": "vigilia",
  "variant": "Misa vespertina de la vigilia",
  "title": "Natividad del Señor",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Is 62, 1-5",
  "psalm": "Sal 88, 4-5.16-17.27.29",
  "second": "Hch 13, 16-17.22-25",
  "gospel": "Mt 1, 1-25 o 1, 18-25",
  "gloria": true,
  "page": 27,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 },
 {
  "date": "2026-12-25",
  "id": "noche",
  "variant": "Misa de la noche",
  "title": "Natividad del Señor",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Is 9, 1-6",
  "psalm": "Sal 95, 1-3.11-13",
  "second": "Tit 2, 11-14",
  "gospel": "Lc 2, 1-14",
  "gloria": true,
  "page": 27,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 },
 {
  "date": "2026-12-25",
  "id": "aurora",
  "variant": "Misa de la aurora",
  "title": "Natividad del Señor",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Is 62, 11-12",
  "psalm": "Sal 96, 1.6.11-12",
  "second": "Tit 3, 4-7",
  "gospel": "Lc 2, 15-20",
  "gloria": true,
  "page": 27,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 },
 {
  "date": "2026-12-25",
  "id": "dia",
  "variant": "Misa del día",
  "title": "Natividad del Señor",
  "color": "blanco",
  "rank": "Solemnidad",
  "first": "Is 52, 7-10",
  "psalm": "Sal 97, 1-6",
  "second": "Heb 1, 1-6",
  "gospel": "Jn 1, 1-18 o 1, 1-5.9-14",
  "gloria": true,
  "page": 27,
  "source": "FDLC · Guía Adviento y Navidad 2026–2027",
  "url": "https://fdlc.org/wp-content/uploads/2026/11/Adviento-Navidad-YEAR-B-2026-a-2027.pdf#page=27"
 }
]);
const SPECIAL=Object.freeze([
 {
  "date": "2027-03-21",
  "title": "Domingo de Ramos en la Pasión del Señor",
  "color": "rojo",
  "rank": "Domingo",
  "first": "Is 50, 4-7",
  "psalm": "Sal 21 (22)",
  "second": "Flp 2, 6-11",
  "gospel": "Mc 14, 1–15, 47",
  "gloria": false,
  "url": "https://bible.usccb.org/es/bible/lecturas/032424.cfm",
  "source": "Leccionario · referencia del formulario",
  "note": "Ciclo B. La procesión tiene su propia proclamación: Mc 11, 1-10 o Jn 12, 12-16; confirma las opciones del misal."
 },
 {
  "date": "2027-03-26",
  "title": "Viernes Santo de la Pasión del Señor",
  "color": "rojo",
  "rank": "Celebración de la Pasión",
  "first": "Is 52, 13–53, 12",
  "psalm": "Sal 30 (31)",
  "second": "Heb 4, 14-16; 5, 7-9",
  "gospel": "Jn 18, 1–19, 42",
  "gloria": null,
  "url": "https://bible.usccb.org/es/bible/lecturas/032924.cfm",
  "source": "Leccionario · referencia del formulario",
  "note": "No se celebra misa; corresponde a la celebración de la Pasión del Señor.",
  "gloriaLabel": "No corresponde: celebración de la Pasión."
 },
 {
  "date": "2027-05-30",
  "title": "IX Domingo del Tiempo Ordinario",
  "color": "verde",
  "rank": "Domingo",
  "first": "Dt 5, 12-15",
  "psalm": "Sal 80 (81)",
  "second": "2 Cor 4, 6-11",
  "gospel": "Mc 2, 23–3, 6",
  "gloria": true,
  "url": "https://arquidiocesisdeyucatan.org.mx/homilias/homilia-arzobispo-de-yucatan-ix-domingo-del-tiempo-ordinario-ciclo-b/",
  "source": "Arquidiócesis de Yucatán · IX Domingo, ciclo B",
  "note": "Formulario del ciclo B. En México Corpus Christi corresponde al jueves 27 de mayo; consulta el misal local."
 }
]);
const SPECIAL_VARIANTS=Object.freeze([
 ...[
 {
  "date": "2027-03-25",
  "title": "Jueves Santo · Cena del Señor",
  "color": "blanco",
  "rank": "Triduo Pascual",
  "first": "Ex 12, 1-8.11-14",
  "psalm": "Sal 115 (116)",
  "second": "1 Cor 11, 23-26",
  "gospel": "Jn 13, 1-15",
  "gloria": true,
  "url": "https://bible.usccb.org/es/bible/lecturas/032824-Supper.cfm",
  "source": "Leccionario · referencia del formulario",
  "note": "Misa vespertina de la Cena del Señor. No es la misa crismal.",
  "id": "cena",
  "variant": "Misa vespertina de la Cena del Señor"
 },
 {
  "date": "2027-03-27",
  "title": "Vigilia Pascual en la noche santa",
  "color": "blanco",
  "rank": "Vigilia Pascual",
  "first": null,
  "psalm": null,
  "second": null,
  "gospel": "Mc 16, 1-7",
  "gloria": true,
  "url": "https://bible.usccb.org/es/bible/lecturas/033024.cfm",
  "source": "Leccionario · referencia del formulario",
  "note": "La Vigilia se celebra de noche, no durante el día del Sábado Santo. El formulario incluye siete lecturas del Antiguo Testamento, con sus salmos o cánticos; se aplican las opciones y rúbricas del misal.",
  "id": "vigilia-pascual",
  "variant": "Vigilia Pascual nocturna",
  "readingList": [
   [
    "Primera lectura",
    "Gn 1, 1–2, 2"
   ],
   [
    "Salmo o cántico",
    "Sal 103 (104)"
   ],
   [
    "Segunda lectura",
    "Gn 22, 1-18"
   ],
   [
    "Salmo",
    "Sal 15 (16)"
   ],
   [
    "Tercera lectura",
    "Ex 14, 15–15, 1"
   ],
   [
    "Cántico",
    "Ex 15, 1-6.17-18"
   ],
   [
    "Cuarta lectura",
    "Is 54, 5-14"
   ],
   [
    "Salmo",
    "Sal 29 (30)"
   ],
   [
    "Quinta lectura",
    "Is 55, 1-11"
   ],
   [
    "Cántico",
    "Is 12, 2-6"
   ],
   [
    "Sexta lectura",
    "Bar 3, 9-15.32–4, 4"
   ],
   [
    "Salmo",
    "Sal 18 (19)"
   ],
   [
    "Séptima lectura",
    "Ez 36, 16-17a.18-28"
   ],
   [
    "Salmo o cántico",
    "Sal 41–42 (42–43) o Is 12"
   ],
   [
    "Epístola",
    "Rom 6, 3-11"
   ],
   [
    "Salmo pascual",
    "Sal 117 (118)"
   ],
   [
    "Evangelio",
    "Mc 16, 1-7"
   ]
  ]
 },
 {
  "date": "2027-12-24",
  "title": "Feria de Adviento · 24 de diciembre",
  "color": "morado",
  "rank": "Feria",
  "first": "2 Sam 7, 1-5.8b-12.14a.16",
  "psalm": "Sal 88 (89)",
  "second": null,
  "gospel": "Lc 1, 67-79",
  "gloria": false,
  "url": "https://bible.usccb.org/es/bible/lecturas/122426.cfm",
  "source": "Ambo · formulario del 24 de diciembre",
  "note": "Misa de la mañana, distinta de la vigilia navideña.",
  "id": "manana",
  "variant": "Misa de la mañana",
  "provisional": true
 }
],
 ...VARIANTS.map(row=>({...row,date:row.date.replace("2026-","2027-"),page:null,source:"Leccionario · formularios fijos de Navidad",url:"https://bible.usccb.org/es/bible/lecturas/122526.cfm",note:"Formulario de Navidad, con lecturas fijas cada año. Confirma la edición local."}))
]);
const ALL_VARIANTS=[...VARIANTS,...SPECIAL_VARIANTS];
function dateNotice(date){return ["2027-12-12","2027-12-13"].includes(date)?"Guadalupe coincide con el III Domingo de Adviento. Pendiente de confirmar el decreto de la CEM para 2027 y el misal diocesano.":null;}
function readingRows(reading){return reading?.readingList||[["Primera lectura",reading?.first],["Salmo responsorial",reading?.psalm],["Segunda lectura",reading?.second],["Evangelio",reading?.gospel]].filter(([,value])=>value);}
function gloriaLabel(reading){return reading?.gloriaLabel||(reading?.gloria===true?"Se dice Gloria.":reading?.gloria===false?"No se dice Gloria.":"Gloria: confirmar en el misal.");}
function readingsForDay(date,variant){
 if(Object.prototype.hasOwnProperty.call(RECORDS,date)){
  const row=RECORDS[date];return {...row,date,source:"Misal noviembre 2026 · publicado por Arquidiócesis de Toluca",url:SOURCE+"#page="+row.page};
 }
 const row=EXTRA.find(x=>x.date===date)||SPECIAL.find(x=>x.date===date)||ALL_VARIANTS.find(x=>x.date===date&&x.id===variant);
 if(!row&&(variant||ALL_VARIANTS.some(x=>x.date===date)))return null;
 return row?{...row}:annual?.annualReading(date)||null;
}
function readingOptions(date){return ALL_VARIANTS.filter(x=>x.date===date).map(({id,variant})=>({id,label:variant}));}


return Object.freeze({readingsForDay,readingOptions,dateNotice,readingRows,gloriaLabel});
});
