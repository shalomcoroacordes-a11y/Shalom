/* Song draft preparation and form merge. No DOM, storage or network. */
(() => {
  const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const id = (value) => String(value || "");
  function fromSong(song) {
    const source = song || {};
    const links = source._links || [];
    const capos = source._capos || [];
    const artistLinks = [...(source._artistLinks || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const principal = artistLinks.find((row) => norm(row.role) === "principal") || artistLinks[0];
    const songEdit = { id: song?.id || null, expected: song?.updated_at || null };
    const draft = {
      title: source.title || "",
      song_type: source.song_type || "catolico",
      main_artist_id: principal?.artist_id || "",
      collaborators: artistLinks.filter((row) => id(row.artist_id) !== id(principal?.artist_id)).map((row) => id(row.artist_id)),
      category_id: source._categories?.[0]?.id || "",
      category_ids: [...new Set((source._categories || []).map((row) => id(row.id)).filter(Boolean))],
      album_id: source._albums?.[0]?.id || "",
      tone: source.tone || "",
      difficulty: source.difficulty || "",
      capo_position: String(source.capo_position || 0),
      capo_key: source.capo_key || "",
      lyrics: source.lyrics || "",
      collaborator_query: "",
      new_link_title: "",
      new_link_type: "Tutorial",
      new_link_platform: "YouTube",
      new_link_url: "",
      new_capo_label: "",
      new_capo_position: "0",
      new_capo_key: ""
    };
    const draftLinks = links.map((row, index) => ({ title: row.title || "", link_type: row.link_type || "Tutorial", platform: row.platform || "", url: row.url || "", sort_order: index }));
    const draftCapos = capos.map((row, index) => ({ label: row.label || "", capo_position: Number(row.capo_position || 0), capo_key: row.capo_key || "", sort_order: index }));
    return { songEdit, draft, links: draftLinks, capos: draftCapos };
  }
  function capture(draft, data, collaborators) {
    return Object.assign({}, draft, data, {
      collaborators,
      category_ids: Array.isArray(draft.category_ids) ? draft.category_ids : [draft.category_id].filter(Boolean)
    });
  }
  window.ShalomAdminSongDraft = Object.freeze({fromSong, capture});
})();
