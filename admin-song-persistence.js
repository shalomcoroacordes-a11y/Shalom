// Persistencia de canciones: validar, guardar registro y sincronizar relaciones.
// No hace render ni modifica el estado del formulario. No dispone de transacciones
// SQL: si hay un error parcial, devuelve el ID para reintentar el mismo canto.
(() => {
  "use strict";
  const RELATIONS = Object.freeze([
    "song_artists", "song_categories", "album_songs",
    "song_links", "song_capo_versions"
  ]);
  const OPTIONAL_COLUMNS = Object.freeze(["difficulty", "capo_position", "capo_key"]);
  const idOf = value => String(value || "");
  const unique = values => [...new Set(values.map(idOf).filter(Boolean))];

  function prepare(draft, links = [], capos = [], slug) {
    const song = draft || {};
    const artists = unique([song.main_artist_id, ...(Array.isArray(song.collaborators) ? song.collaborators : [])]);
    const title = String(song.title || "").trim();
    const tone = String(song.tone || "").trim();
    const key = String(song.capo_key || "").trim();
    const capoPosition = Number(song.capo_position || 0);
    if (!title) return {error: "Escribe el título de la canción."};
    if (!tone) return {error: "Escribe el tono original."};
    if (!artists.length) return {error: "Selecciona al menos un artista."};
    if (capoPosition > 0 && !key) return {error: "Si usas capo principal, escribe las figuras."};
    const payload = {
      title, slug: slug(title), song_type: song.song_type || "catolico",
      tone, lyrics: String(song.lyrics || ""),
      difficulty: String(song.difficulty || "").trim() || null,
      capo_position: capoPosition,
      capo_key: capoPosition > 0 ? key : ""
    };
    const categories = unique(Array.isArray(song.category_ids) ? song.category_ids : [song.category_id]);
    const linkRows = Array.isArray(links) ? links : [];
    const capoRows = Array.isArray(capos) ? capos : [];
    function relations(songId) {
      return [
        ["song_artists", artists.map((artistId, index) => ({
          song_id: songId, artist_id: artistId,
          role: index === 0 ? "principal" : "colaborador", sort_order: index
        }))],
        ["song_categories", categories.map(categoryId => ({
          song_id: songId, category_id: categoryId
        }))],
        ["album_songs", song.album_id ? [{
          song_id: songId, album_id: song.album_id, sort_order: 0
        }] : []],
        // Las tablas reales rechazan URL vacía y capo sin posición/figuras.
        // El RPC ya omitía filas incompletas: aplicar el mismo criterio
        // al método compatible evita borrar otras relaciones por un error.
        ["song_links", linkRows.filter(row =>
          row && String(row.url || "").trim()
        ).map((row, index) => ({
          song_id: songId, title: String(row.title || "").trim() || "Enlace",
          link_type: String(row.link_type || "").trim() || "Tutorial",
          platform: row.platform || "",
          url: String(row.url).trim(), sort_order: index
        }))],
        ["song_capo_versions", capoRows.filter(row =>
          row && Number(row.capo_position) > 0 && String(row.capo_key || "").trim()
        ).map((row, index) => ({
          song_id: songId,
          label: String(row.label || "").trim() || "Capo " + Number(row.capo_position),
          capo_position: Number(row.capo_position),
          capo_key: String(row.capo_key).trim(), sort_order: index
        }))]
      ];
    }
    return {payload, relations};
  }

  function missingOptionalColumn(message, patch) {
    const value = String(message || "").toLowerCase();
    if (!/schema cache|does not exist|unknown column|column not found/.test(value))
      return null;
    return OPTIONAL_COLUMNS.find(name => Object.prototype.hasOwnProperty.call(patch, name)
      && value.includes(name)) || null;
  }

  async function writeSong(db, payload, id) {
    const patch = {...payload};
    for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
      const query = id
        ? db.from("songs").update(patch).eq("id", id).select("id").single()
        : db.from("songs").insert([patch]).select("id").single();
      const result = await query;
      if (!result.error) return result;
      const missing = missingOptionalColumn(result.error.message, patch);
      if (!missing) return result;
      delete patch[missing];
    }
    return {error: {message: "No se pudo guardar la canción."}};
  }

  // La función original de Supabase es transaccional, pero solo admite 0 o 1
  // categoría. Nunca usarla para cantos con varias categorías.
  function legacyRpcArguments(plan, id) {
    const rows = Object.fromEntries(plan.relations(id || null));
    if (rows.song_categories.length > 1) return null;
    return {
      p_song_id: id || null,
      p_song: plan.payload,
      p_artists: rows.song_artists.map(row => ({artist_id: row.artist_id})),
      p_category_id: rows.song_categories[0]?.category_id || null,
      p_album_id: rows.album_songs[0]?.album_id || null,
      p_links: rows.song_links.filter(row => String(row.url || "").trim()).map(row => ({
        title: row.title, link_type: row.link_type, platform: row.platform, url: row.url
      })),
      p_capos: rows.song_capo_versions.filter(row =>
        Number(row.capo_position) > 0 && String(row.capo_key || "").trim()).map(row => ({
        label: row.label, capo_position: row.capo_position, capo_key: row.capo_key
      }))
    };
  }

  // El contrato futuro acepta TODAS las categorías y conserva una única
  // operación de Postgres; la propuesta SQL no se despliega desde esta rama.
  function multiCategoryRpcArguments(plan, id) {
    const rows = Object.fromEntries(plan.relations(id || null));
    return {
      p_song_id: id || null,
      p_song: plan.payload,
      p_artists: rows.song_artists.map(row => ({artist_id: row.artist_id})),
      p_categories: rows.song_categories.map(row => row.category_id),
      p_album_id: rows.album_songs[0]?.album_id || null,
      p_links: rows.song_links.filter(row => String(row.url || "").trim()).map(row => ({
        title: row.title, link_type: row.link_type, platform: row.platform, url: row.url
      })),
      p_capos: rows.song_capo_versions.filter(row =>
        Number(row.capo_position) > 0 && String(row.capo_key || "").trim()).map(row => ({
        label: row.label, capo_position: row.capo_position, capo_key: row.capo_key
      }))
    };
  }

  async function saveViaMultiCategoryRpc(db, args) {
    try {
      const result = await db.rpc("shalom_save_song_bundle_v2", args);
      if (result.error?.code === "PGRST202") return null; // Función aún no instalada.
      if (result.error) return {
        ok: false, phase: "rpc", message: "No se guardó la canción: " + result.error.message
      };
      if (typeof result.data !== "string" || !result.data) return {
        ok: false, phase: "uncertain",
        message: "El guardado no devolvió un identificador. Verifica el catálogo antes de repetirlo."
      };
      return {ok: true, phase: "complete", songId: result.data};
    } catch (error) {
      // Si la petición se completó en el servidor, repetir podría duplicar.
      return {
        ok: false, phase: "uncertain",
        message: "No se confirmó el guardado: " +
          (error?.message || "Error de conexión.") +
          ". Verifica el catálogo antes de intentar otra vez."
      };
    }
  }

  async function saveViaExistingRpc(db, args) {
    try {
      const result = await db.rpc("jhd_save_song_bundle", args);
      if (result.error) return {
        ok: false, phase: "rpc", message: "No se guardó la canción: " + result.error.message
      };
      if (typeof result.data !== "string" || !result.data) return {
        ok: false, phase: "uncertain",
        message: "No se confirmó el identificador del canto. Comprueba si aparece en el catálogo antes de volver a guardar."
      };
      return {ok: true, phase: "complete", songId: result.data};
    } catch(error) {
      // Un fallo de red puede ocurrir DESPUÉS del COMMIT del servidor.
      // No aconsejar un reintento a ciegas cuando aún no conocemos el ID.
      return {
        ok: false, phase: "uncertain",
        message: "No se confirmó el guardado: " +
          (error?.message || "Error de conexión.") +
          ". Verifica el catálogo antes de intentar otra vez."
      };
    }
  }

  async function save({db, draft, links = [], capos = [], id = null, slug}) {
    const plan = prepare(draft, links, capos, slug);
    if (plan.error) return {ok: false, phase: "validation", message: plan.error};
    const rpcArgs = legacyRpcArguments(plan, id);
    if (rpcArgs && typeof db.rpc === "function")
      return saveViaExistingRpc(db, rpcArgs);
    if (!rpcArgs && typeof db.rpc === "function") {
      const atomic = await saveViaMultiCategoryRpc(db, multiCategoryRpcArguments(plan, id));
      if (atomic !== null) return atomic;
    }
    // Compatibilidad mientras la versión SQL multicategroría no esté instalada.
    let songId = null;
    try {
      const saved = await writeSong(db, plan.payload, id);
      if (saved.error || !saved.data?.id)
        return {ok: false, phase: "song", message: "Error: " +
          (saved.error?.message || "No se pudo guardar.")};
      songId = saved.data.id;
      // Sin una función transaccional en Supabase, el reemplazo es parcial
      // ante errores. Se detiene inmediatamente y se conserva el ID y el borrador.
      for (const table of RELATIONS) {
        const removed = await db.from(table).delete().eq("song_id", songId);
        if (removed.error) return {
          ok: false, phase: "clear", songId, table,
          message: "Error al actualizar relaciones (" + table + "): " +
            removed.error.message + ". Puedes reintentar el guardado."
        };
      }
      for (const [table, rows] of plan.relations(songId)) {
        if (!rows.length) continue;
        const inserted = await db.from(table).insert(rows);
        if (inserted.error) return {
          ok: false, phase: "relations", songId, table,
          message: "La canción se guardó, pero una relación falló (" + table +
            "): " + inserted.error.message + ". Puedes reintentar el guardado."
        };
      }
      return {ok: true, phase: "complete", songId};
    } catch (error) {
      return {
        ok: false, phase: "network", songId,
        message: "No se completó el guardado: " +
          (error?.message || "Error de conexión.") +
          (songId ? " Puedes reintentar el mismo canto." : " Inténtalo nuevamente.")
      };
    }
  }

  window.ShalomAdminSongPersistence = Object.freeze({
    prepare, missingOptionalColumn, writeSong, save,
    legacyRpcArguments, saveViaExistingRpc,
    multiCategoryRpcArguments, saveViaMultiCategoryRpc, RELATIONS
  });
})();
