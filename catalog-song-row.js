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

  window.ShalomCatalogSongRow = Object.freeze({ rowToSong });
})();
