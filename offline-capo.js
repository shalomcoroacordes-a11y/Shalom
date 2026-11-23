/* Capos guardados para SHALOM Offline: sin conexión y sin modificar el canto fuente. */
(function (root) {
  "use strict";
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLATS = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
  function note(value) {
    const match = String(value || "").trim().match(/^([A-G](?:#|b)?)/);
    return match ? (FLATS[match[1]] || match[1]) : "";
  }
  function offset(song, position, key) {
    const original = NOTES.indexOf(note(song?.tone || song?.key));
    const figures = NOTES.indexOf(note(key));
    if (original >= 0 && figures >= 0) return figures - original;
    return -position;
  }
  function optionsForSong(song) {
    const options = [{id:"original",label:"Sin capo",position:0,key:"",offset:0}];
    const seen = new Set();
    function add(item, id) {
      const position = Number(item?.capo_position || 0);
      if (!Number.isInteger(position) || position < 1 || position > 12) return;
      const key = String(item?.capo_key || "").trim();
      const unique = position + "|" + note(key);
      if (seen.has(unique)) return;
      seen.add(unique);
      const title = String(item?.label || "").trim() || "Capo " + position;
      const label = key && !title.toLowerCase().includes(key.toLowerCase())
        ? title + " · Figuras en " + key : title;
      options.push({id,label,position,key,offset:offset(song,position,key)});
    }
    add(song,"main");
    (song?._capos || []).forEach((item,index)=>add(item,"version:"+(item.id || index)));
    return options.length > 1 ? options : [];
  }
  const api = Object.freeze({optionsForSong,offset});
  root.ShalomOfflineCapo = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
