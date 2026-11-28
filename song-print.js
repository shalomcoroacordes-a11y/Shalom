/* Elige una distribución compacta antes de abrir el diálogo de impresión. */
(() => {
  const layoutClasses = ["song-print-two-columns", "song-print-dense"];

  const preparePrintLayout = () => {
    const lyrics = document.querySelector("#songLyrics");
    if (!lyrics) return;

    const score=lyrics.firstElementChild?.classList.contains("score-proportional")?lyrics.firstElementChild:null;
    if(score)window.ShalomScoreReader?.relayout(score);
    const blocks = Array.from((score||lyrics).children).filter(block=>!lyrics.classList.contains("song-reader-cues-hidden")||!block.classList.contains("song-reader-cue"));
    let weightedLines = 0;
    let longestLine = 0;

    for (const block of blocks) {
      const chordLine = block.querySelector?.(".chord-line,.score-chords");
      const lyricLine = block.querySelector?.(".lyric-line,.score-lyric");
      const lineParts = chordLine || lyricLine
        ? [chordLine?.textContent || "", lyricLine?.textContent || ""]
        : [block.textContent || ""];

      for (const part of lineParts) {
        longestLine = Math.max(longestLine, ...String(part).split("\n").map((line) => line.trimEnd().length));
      }

      if (block.classList.contains("song-line")||block.classList.contains("score-pair")) weightedLines += 2;
      else if (block.classList.contains("song-section-label")||block.classList.contains("score-section")) weightedLines += 1.8;
      else if (block.classList.contains("song-empty-line")||block.classList.contains("score-empty")) weightedLines += 0.45;
      else weightedLines += 1;
    }

    // En una columna caben líneas largas; en dos, solo las de ancho moderado.
    const twoColumns = !score && weightedLines > 58 && longestLine <= 38;
    document.body.classList.toggle("song-print-two-columns", twoColumns);
    document.body.classList.toggle("song-print-dense", weightedLines > (twoColumns ? 120 : 78));
  };

  const clearPrintLayout = () => document.body.classList.remove(...layoutClasses);

  window.addEventListener("beforeprint", preparePrintLayout);
  window.addEventListener("afterprint", clearPrintLayout);
})();
