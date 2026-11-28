// Generated from native-chords.js. Run node scripts/build-native-chords.js. Do not edit this copy.
// Native adapter for the canonical song-chords.js parser.
// Native transposition and column measurements remain platform-specific.
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

  // Source positions are captured before transposition changes the token widths.
  const rowAnchors = (line, transpose, offset=0) => Array.from(String(line).matchAll(/\S+/g), match=>({position:offset+match.index,chord:String(transpose(unwrap(match[0])))}));

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
    const anchors=[];

    while ((match = regex.exec(line)) !== null) {
      lyricLine += line.slice(last, match.index);
      if (isChordGroup(match[1])) {
        anchors.push(...rowAnchors(match[1],transpose,lyricLine.length));
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
    return { chordLine, lyricLine, hasChords, anchors };
  };

  function parseRows(source, transpose = chord => chord, includeAnchors=false) {
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
          rows.push({kind:"chords",layout:"stacked",chordLine:lower.hasChords?combineChordRows(upper,lower.chordLine):upper,lyricLine:lower.hasChords?lower.lyricLine:next,...(includeAnchors?{anchors:[...rowAnchors(line,transpose),...lower.anchors].sort((a,b)=>a.position-b.position)}:{})});
          index++;
        } else rows.push({kind:"chordsOnly",text:transformRow(line,transpose)});
        continue;
      }
      const parsed = inlineChords(line, transpose);
      rows.push(parsed.hasChords?{kind:"chords",layout:"inline",chordLine:parsed.chordLine,lyricLine:parsed.lyricLine,...(includeAnchors?{anchors:parsed.anchors}:{})}:{kind:"lyric",text:line});
    }
    return rows;
  }
  return Object.freeze({parseRows,isChordRow});
}
const shared=createChordParser();
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS={Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
function transposeOne(value,shift){
 const move=n=>{const i=NOTES.indexOf(FLATS[n]||n);return i<0?n:NOTES[(i+shift+120)%12]};
 return String(value).replace(/^([A-G](?:#|b)?)(.*)$/,(_,root,rest)=>move(root)+rest.replace(/\/([A-G](?:#|b)?)/g,(_,bass)=>"/"+move(bass)));
}
const chordRow=shared.isChordRow;
function parseSong(source,shift=0,includeAnchors=false){
 return shared.parseRows(source,chord=>transposeOne(chord,shift),includeAnchors).map(row=>row.kind==="chords"?{kind:"chords",chordLine:row.chordLine,lyricLine:row.lyricLine,...(includeAnchors?{anchors:row.anchors}:{})}:row);
}
// NBSP evita que Android colapse o redistribuya columnas y hace que todo el
// renglón permanezca sin saltos, incluso dentro de scroll horizontal.
const preserveColumns=text=>String(text??"").replace(/ /g,"\u00A0");
function scoreColumns(rows){
 return Math.max(24,...rows.map(row=>row.kind==="chords"?
  Math.max(row.chordLine.length,row.lyricLine.length):
  row.kind==="chordsOnly"||row.kind==="lyric"?row.text.length:0));
}
// Margen pequeño por diferencias de medición de glifos; nunca reduce las columnas.
const scoreWidth=(rows,fontSize)=>Math.ceil(scoreColumns(rows)*fontSize*0.65+18);
module.exports={parseSong,transposeOne,chordRow,preserveColumns,scoreColumns,scoreWidth};
