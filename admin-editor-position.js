/* Session-local cursor and scroll position for the admin song editor.
   The editor owner explicitly calls this service at its lifecycle boundaries. */
(() => {
  const KEY = "shalom-admin-editor-positions-v1";
  function create(getStorage) {
    const positions = Object.create(null);
    try {
      const stored = JSON.parse(getStorage().getItem(KEY) || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const [key, value] of Object.entries(stored)) {
          if (value && typeof value === "object" && !Array.isArray(value)) positions[key] = value;
        }
      }
    } catch {}
    function persist() {
      try { getStorage().setItem(KEY, JSON.stringify(positions)); } catch {}
    }
    function remember(editor) {
      const key = editor?.dataset?.scrollSong;
      if (!key) return;
      positions[key] = {
        top: editor.scrollTop,
        left: editor.scrollLeft,
        start: editor.selectionStart,
        end: editor.selectionEnd
      };
      persist();
    }
    function restore(editor) {
      const key = editor?.dataset?.scrollSong;
      if (!key) return;
      const saved = positions[key];
      if (!saved) return;
      const start = Math.min(editor.value.length, Math.max(0, Number(saved.start) || 0));
      const end = Math.min(editor.value.length, Math.max(start, Number(saved.end) || start));
      editor.setSelectionRange(start, end);
      editor.scrollTop = Number(saved.top) || 0;
      editor.scrollLeft = Number(saved.left) || 0;
    }
    function clear(key) {
      delete positions[key];
      persist();
    }
    return Object.freeze({remember, restore, clear});
  }
  window.ShalomAdminEditorPosition = Object.freeze({create});
})();
