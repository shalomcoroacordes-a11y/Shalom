/* Related catalog lookup and ranking. The song page owns its UI. */
(() => {
  async function find(client, song, relations, onStart = () => {}) {
    const artistIds = (relations.artists || []).map((artist) => artist.id).filter(Boolean);
    const categoryIds = (relations.categories || []).map((category) => category.id).filter(Boolean);
    const albumIds = (relations.albums || []).map((album) => album.id).filter(Boolean);
    if (!artistIds.length && !categoryIds.length && !albumIds.length) {
      return [];
    }
  
    onStart();
  
    const requests = [];
    if (artistIds.length) requests.push(client.from("song_artists").select("song_id").in("artist_id", artistIds));
    if (categoryIds.length) requests.push(client.from("song_categories").select("song_id").in("category_id", categoryIds));
    if (albumIds.length) requests.push(client.from("album_songs").select("song_id").in("album_id", albumIds));
    const responses = await Promise.all(requests);
    if (responses.some((response) => response.error)) {
      return [];
    }
  
    const candidateIds = [...new Set(responses.flatMap((response) => (response.data || []).map((row) => row.song_id)).filter((id) => String(id) !== String(song.id)))];
    if (!candidateIds.length) {
      return [];
    }
  
    const result = await client.from("songs").select("id,title,slug,song_type,tone").in("id", candidateIds).order("title", { ascending: true }).limit(30);
    if (result.error || !(result.data || []).length) {
      return [];
    }
  
    const score = new Map();
    responses.forEach((response, index) => {
      const weight = artistIds.length && index === 0 ? 3 : categoryIds.length && index === (artistIds.length ? 1 : 0) ? 2 : 1;
      (response.data || []).forEach((row) => {
        const id = String(row.song_id);
        score.set(id, (score.get(id) || 0) + weight);
      });
    });
  
    const suggestions = (result.data || [])
      .sort((a, b) => (score.get(String(b.id)) || 0) - (score.get(String(a.id)) || 0) || String(a.title || "").localeCompare(String(b.title || ""), "es"))
      .slice(0, 6);
    return suggestions;
  }
  window.ShalomRelatedSongs = Object.freeze({find});
})();
