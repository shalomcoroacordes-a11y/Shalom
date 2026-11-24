"use strict";
function validRow(song,row){
 return !!(song?.id&&song.updated_at&&row&&String(row.song_id)===String(song.id)&&row.song_revision===song.updated_at&&row.arrangement?.v===1);
}
function attachArrangements(songs,rows){
 const map=new Map((rows||[]).map(r=>[String(r.song_id),r]));
 return songs.map(song=>{const row=map.get(String(song.id));const {_studio,...rest}=song;return validRow(song,row)?{...rest,_studio:row.arrangement}:rest});
}
module.exports={attachArrangements};
