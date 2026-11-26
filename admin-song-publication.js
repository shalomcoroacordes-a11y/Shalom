/* Pure song publication preparation: validates fields and builds the existing RPC contract. */
(() => {
  const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const asId = (value) => String(value || "");
  const slug = (value) => norm(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  function validate(draft) {
    if (!String(draft.title || "").trim()) return "Escribe el título de la canción.";
    if (!String(draft.tone || "").trim()) return "Escribe el tono original.";
    if (!asId(draft.main_artist_id)) return "Selecciona al menos un artista.";
    const position = Number(draft.capo_position || 0);
    if (!Number.isInteger(position) || position < 0 || position > 12) return "Capo principal inválido.";
    if (position > 0 && !String(draft.capo_key || "").trim()) return "Si usas capo principal, escribe las figuras.";
    return "";
  }
  function prepare(draft, id, expected, links, capos) {
    const main = asId(draft.main_artist_id);
    const artists = [...new Set([main, ...(draft.collaborators || []).map(asId)].filter(Boolean))];
    const categories = [...new Set((Array.isArray(draft.category_ids) ? draft.category_ids : [draft.category_id]).map(asId).filter(Boolean))];
    const position = Number(draft.capo_position || 0);
    return {
      p_song: {
        id, title: String(draft.title || "").trim(), slug: slug(draft.title),
        song_type: draft.song_type || "catolico", tone: String(draft.tone || "").trim(),
        lyrics: String(draft.lyrics || ""), difficulty: String(draft.difficulty || "").trim() || null,
        capo_position: position, capo_key: position > 0 ? String(draft.capo_key || "").trim() : "",
        artist_id: main || null, category_id: categories[0] || null
      },
      p_artists: artists.map((artist_id, index) => ({ artist_id, role: index === 0 ? "principal" : "colaborador", sort_order: index })),
      p_categories: categories.map(category_id => ({ category_id })),
      p_albums: draft.album_id ? [{ album_id: draft.album_id, sort_order: 0 }] : [],
      p_links: links.map((row, index) => ({ title: row.title || "Enlace", link_type: row.link_type || "Tutorial", platform: row.platform || "", url: row.url || "", sort_order: index })),
      p_capos: capos.map((row, index) => ({ label: row.label || "", capo_position: Number(row.capo_position || 0), capo_key: row.capo_key || "", sort_order: index })),
      p_expected: expected
    };
  }
  window.ShalomAdminSongPublication = Object.freeze({validate, prepare});
})();
