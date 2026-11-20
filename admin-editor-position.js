// Memoria del cursor y del desplazamiento del editor SHALOM.
// Es un servicio aislado: no modifica el render, no sobrescribe controles
// globales y no necesita acceso a Supabase.
(() => {
  "use strict";

  const KEY = "shalom-admin-editor-positions-v1";
  const findEditor = () => document.querySelector("#songLyricsField");

  function readPositions() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(KEY) || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored)
        ? stored : {};
    } catch { return {}; }
  }

  const positions = readPositions();
  function persist() {
    try { sessionStorage.setItem(KEY, JSON.stringify(positions)); }
    catch { /* Navegadores con almacenamiento bloqueado: sesión actual intacta. */ }
  }

  function remember() {
    const editor = findEditor();
    const key = editor?.dataset?.scrollSong;
    if (!editor || !key) return;
    positions[key] = {
      top: editor.scrollTop,
      left: editor.scrollLeft,
      start: editor.selectionStart,
      end: editor.selectionEnd
    };
    persist();
  }

  function restore() {
    const editor = findEditor();
    if (!editor) return;
    const saved = positions[editor.dataset?.scrollSong];
    if (!saved) return;
    const start = Math.min(editor.value.length, Math.max(0, Number(saved.start) || 0));
    const end = Math.min(editor.value.length, Math.max(start, Number(saved.end) || start));
    editor.setSelectionRange(start, end);
    editor.scrollTop = Number(saved.top) || 0;
    editor.scrollLeft = Number(saved.left) || 0;
  }

  function forget(key) {
    if (!key || !Object.prototype.hasOwnProperty.call(positions, key)) return;
    delete positions[key];
    persist();
  }

  window.ShalomAdminEditorPosition = Object.freeze({ remember, restore, forget });
})();
