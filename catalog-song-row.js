/* Shared catalog RPC row normalization; no DOM or database side effects. */
(() => {
  function jsonList(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function rowToSong(row) {
    return {
      ...row,
      _artists: jsonList(row.artists),
      _categories: jsonList(row.categories),
      _albums: jsonList(row.albums)
    };
  }

  // Merge a successful server page only after the owning screen checks its request token.
  function mergePage(previous, rows, append) {
    const serverTotal = rows.length ? Number(rows[0].total_count || 0) : 0;
    return {
      total: append ? (rows.length ? serverTotal : previous.length) : serverTotal,
      rows: append ? [...previous, ...rows] : rows
    };
  }
  window.ShalomCatalogSongRow = Object.freeze({ jsonList, rowToSong, mergePage });
})();
