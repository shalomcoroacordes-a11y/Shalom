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
  // A single request owner for a paginated catalog. UI owns rendering and filters.
  function createPager({ pageSize, fetchPage, onStart, onRender, onError }) {
    let version = 0, state = { page: 0, total: 0, rows: [], loading: false };
    async function load(append = false) {
      if (append && state.loading) return;
      const token = ++version;
      const isCurrent = () => token === version;
      const page = append ? state.page + 1 : 0;
      state = append ? { ...state, loading: true } : { page: 0, total: 0, rows: [], loading: true };
      try {
        onStart(append);
        const rows = await fetchPage({ offset: page * pageSize, limit: pageSize, isCurrent });
        if (!isCurrent()) return;
        const merged = mergePage(state.rows, rows, append);
        state = { page, ...merged, loading: false };
        onRender();
      } catch (error) {
        if (!isCurrent()) return;
        state = { ...state, total: 0, rows: [], loading: false };
        onError(error);
      } finally {
        if (isCurrent() && state.loading) {
          state = { ...state, loading: false };
          onRender();
        }
      }
    }
    return Object.freeze({ load, get state() { return state; } });
  }
  window.ShalomCatalogSongRow = Object.freeze({ jsonList, rowToSong, mergePage, createPager });
})();
