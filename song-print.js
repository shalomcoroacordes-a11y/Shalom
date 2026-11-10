/* Elige una distribución compacta antes de abrir el diálogo de impresión. */
(() => {
  const layoutClasses = ["song-print-two-columns", "song-print-dense"];

  const preparePrintLayout = () => {
    const lyrics = document.querySelector("#songLyrics");
    if (!lyrics) return;

    const blocks = Array.from(lyrics.children);
    let weightedLines = 0;
    let longestLine = 0;

    for (const block of blocks) {
      const chordLine = block.querySelector?.(".chord-line");
      const lyricLine = block.querySelector?.(".lyric-line");
      const lineParts = chordLine || lyricLine
        ? [chordLine?.textContent || "", lyricLine?.textContent || ""]
        : [block.textContent || ""];

      for (const part of lineParts) {
        longestLine = Math.max(longestLine, ...String(part).split("\n").map((line) => line.trimEnd().length));
      }

      if (block.classList.contains("song-line")) weightedLines += 2;
      else if (block.classList.contains("song-section-label")) weightedLines += 1.8;
      else if (block.classList.contains("song-empty-line")) weightedLines += 0.45;
      else weightedLines += 1;
    }

    // En una columna caben líneas largas; en dos, solo las de ancho moderado.
    const twoColumns = weightedLines > 58 && longestLine <= 38;
    document.body.classList.toggle("song-print-two-columns", twoColumns);
    document.body.classList.toggle("song-print-dense", weightedLines > (twoColumns ? 120 : 78));
  };

  const clearPrintLayout = () => document.body.classList.remove(...layoutClasses);

  window.addEventListener("beforeprint", preparePrintLayout);
  window.addEventListener("afterprint", clearPrintLayout);
})();
