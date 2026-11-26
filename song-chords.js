/* Un mismo intérprete de acordes para el editor y la página pública de SHALOM.
 * Formatos admitidos:
 *   F#              D#m       <- acordes en la línea anterior
 *   Hola, Dios, soy yo otra vez.
 *   (F#)Hola, Dios, soy yo (D#m)otra vez. <- formato anterior
 */
(() => {
// BEGIN CANONICAL CHORD PARSER
function createChordParser() {
  const chordToken = /^[A-G](?:#|b)?(?:maj(?:7|9|11|13)?|m(?:maj7|[0-9]*)?|min(?:[0-9]*)?|sus[24]?|add\d+|dim7?|aug|\+|-|[0-9]*)?(?:\/[A-G](?:#|b)?)?$/;
  const unwrap = (token) => String(token || "").replace(/^\(([^)]+)\)$/, "$1");
  const isChord = (token) => chordToken.test(unwrap(token));
  const isChordGroup = (text) => {
    const tokens = String(text || "").trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 && tokens.every(isChord);
  };
  const isChordRow = (line) => {
    if (!String(line).trim() || /^\s*\[[^\]]+\]\s*$/.test(line)) return false;
    return isChordGroup(line);
  };

  const transformRow = (line, transpose) => String(line).replace(/\S+/g, (token) => {
    const clean = unwrap(token);
    return isChord(clean) ? String(transpose(clean)) : token;
  });

  // Combina acordes escritos en el renglón superior con los que aún estén
  // marcados entre paréntesis dentro del verso, sin duplicar su altura.
  const combineChordRows = (upper, lower) => {
    const chords = [];
    for (const line of [upper, lower]) {
      for (const match of String(line).matchAll(/\S+/g)) {
        chords.push({ position: match.index, chord: match[0] });
      }
    }
    chords.sort((a, b) => a.position - b.position);
    let result = "";
    for (const { position, chord } of chords) {
      const start = Math.max(position, result.length ? result.length + 1 : 0);
      result = result.padEnd(start, " ") + chord;
    }
    return result;
  };

  const inlineChords = (line, transpose) => {
    const regex = /\(([^)]+)\)/g;
    let chordLine = "";
    let lyricLine = "";
    let last = 0;
    let match;
    let hasChords = false;

    while ((match = regex.exec(line)) !== null) {
      lyricLine += line.slice(last, match.index);
      if (isChordGroup(match[1])) {
        const converted = transformRow(match[1], transpose);
        // Si dos acordes están muy cerca, se separan sin perder el texto.
        const position = Math.max(lyricLine.length, chordLine.length ? chordLine.length + 1 : 0);
        chordLine = chordLine.padEnd(position, " ") + converted;
        hasChords = true;
      } else {
        lyricLine += match[0];
      }
      last = regex.lastIndex;
    }

    lyricLine += line.slice(last);
    return { chordLine, lyricLine, hasChords };
  };

  function parseRows(source, transpose = chord => chord) {
    const lines = String(source ?? "").replace(/\r\n?/g, "\n").replaceAll("\t", "    ").split("\n");
    const rows = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line.trim()) { rows.push({kind:"space"}); continue; }
      const heading = line.trim().match(/^\[([^\]]+)\]$/);
      if (heading) { rows.push({kind:"section",text:heading[1]}); continue; }
      if (isChordRow(line)) {
        const next = lines[index + 1] || "";
        if (next.trim() && !/^\s*\[[^\]]+\]\s*$/.test(next) && !isChordRow(next)) {
          const lower = inlineChords(next, transpose), upper = transformRow(line, transpose);
          rows.push({kind:"chords",layout:"stacked",chordLine:lower.hasChords?combineChordRows(upper,lower.chordLine):upper,lyricLine:lower.hasChords?lower.lyricLine:next});
          index++;
        } else rows.push({kind:"chordsOnly",text:transformRow(line,transpose)});
        continue;
      }
      const parsed = inlineChords(line, transpose);
      rows.push(parsed.hasChords?{kind:"chords",layout:"inline",chordLine:parsed.chordLine,lyricLine:parsed.lyricLine}:{kind:"lyric",text:line});
    }
    return rows;
  }
  return Object.freeze({parseRows,isChordRow});
}
// END CANONICAL CHORD PARSER

  const {parseRows,isChordRow}=createChordParser();
  const escapeHTML = (text) => String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const pair = (chords, lyrics, extraClass = "") =>
    `<span class="song-line${extraClass ? ` ${extraClass}` : ""}"><span class="chord-line">${escapeHTML(chords)}</span><span class="lyric-line">${escapeHTML(lyrics)}</span></span>`;

  function render(source, options = {}) {
    const transpose = typeof options.transpose === "function" ? options.transpose : chord => chord;
    const displayRows=parseRows(source,transpose);
    const rows=(options.arrangement?.i?.length||options.arrangement?.j?.length)&&typeof window!=="undefined"&&window.ShalomReaderCues?window.ShalomReaderCues.decorate(parseRows(source),options.arrangement,displayRows):displayRows;
    return rows.map(row=>{
      if(row.kind==="cue")return '<span class="song-reader-cue">'+escapeHTML(row.text)+'</span>';
      if(row.kind==="space")return '<span class="song-empty-line"></span>';
      if(row.kind==="section")return '<span class="song-section-label">'+escapeHTML(row.text)+'</span>';
      if(row.kind==="chords")return pair(row.chordLine,row.lyricLine,"song-"+row.layout+"-chords");
      if(row.kind==="chordsOnly")return '<span class="song-standalone-chords">'+escapeHTML(row.text)+'</span>';
      return '<span class="song-plain-line">'+escapeHTML(row.text)+'</span>';
    }).join("");
  }
  const api=Object.freeze({render,isChordRow,parseRows});
  if(typeof module==="object"&&module.exports)module.exports=api;
  else window.ShalomChords=api;
})();
