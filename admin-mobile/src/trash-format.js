"use strict";
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const owns=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function recoveryFormat(row){
 if(row?.item_type!=="song"||!row.original_id||!object(row.snapshot))return "invalid";
 const s=row.snapshot;
 if(owns(s,"song")&&owns(s,"record"))return "invalid";
 if(owns(s,"song"))return object(s.song)&&s.song.id===row.original_id?"native":"invalid";
 if(owns(s,"record"))return object(s.record)&&s.record.id===row.original_id?"web":"invalid";
 return "invalid";
}
module.exports={recoveryFormat};
