(() => {
  if (window.__jhdAdminBackup) return;
  window.__jhdAdminBackup = true;

  const db = window.supabaseClient || window.AdminPro;
  const TRASH_TABLE = "admin_trash";
  const { TABLES, FORMAT, VERSION, cleanRow, missingRelations, selectAll: readAll, downloadJson, filenameDate } = window.ShalomAdminBackupCore;
  let trashRows = [];
  let busy = false;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const say = (message, bad = false) => {
    if (typeof window.apNote === "function") window.apNote(message, bad);
  };
  // AP is the state owned by admin-pro.js (a classic-script lexical binding).
  const app = () => AP;
  const idOf = (value) => String(value || "");
  const safeDate = (value) => {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  };




  const selectAll = (table) => readAll(db, table);

  async function one(table, id) {
    const result = await db.from(table).select("*").eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new Error("No se encontró el registro que intentas eliminar.");
    return result.data;
  }

  async function rows(table, key, value) {
    const result = await db.from(table).select("*").eq(key, value);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function buildSnapshot(kind, id) {
    if (kind === "album") {
      const [record, albumSongs] = await Promise.all([one("albums", id), rows("album_songs", "album_id", id)]);
      return { version: 1, record: cleanRow(record, true), relations: { album_songs: albumSongs.map((row) => cleanRow(row, false)) } };
    }
    if (kind === "artist") {
      const [record, featured] = await Promise.all([one("artists", id), rows("artist_featured_songs", "artist_id", id)]);
      return { version: 1, record: cleanRow(record, true), relations: { artist_featured_songs: featured.map((row) => cleanRow(row, false)) } };
    }
    if (kind === "category") {
      const record = await one("categories", id);
      return { version: 1, record: cleanRow(record, true), relations: {} };
    }
    throw new Error("Tipo de elemento no compatible.");
  }

  function itemName(kind, id) {
    const state = app();
    const collections = { song: state?.songs, artist: state?.artists, category: state?.categories, album: state?.albums };
    const row = (collections[kind] || []).find((item) => idOf(item.id) === idOf(id));
    return row?.title || row?.name || "Elemento sin nombre";
  }

  async function archive(kind, id) {
    const snapshot = await buildSnapshot(kind, id);
    const payload = {
      item_type: kind,
      original_id: id,
      item_name: itemName(kind, id),
      snapshot,
      deleted_by: app()?.user?.id || null
    };
    const result = await db.from(TRASH_TABLE).insert([payload]).select("id").single();
    if (result.error) throw result.error;
    return result.data?.id || null;
  }

  function checkDelete(kind, id) {
    const state = app();
    if (kind === "artist") {
      const usedSongs = (state?.songs || []).some((song) => (song._artists || []).some((artist) => idOf(artist.id) === idOf(id)));
      const usedAlbums = (state?.albums || []).some((album) => idOf(album.artist_id) === idOf(id));
      if (usedSongs || usedAlbums) {
        say("No se puede eliminar: este artista tiene canciones o álbumes relacionados.", true);
        return false;
      }
    }
    if (kind === "category") {
      const hasChildren = (state?.categories || []).some((row) => idOf(row.parent_id) === idOf(id));
      const hasSongs = (state?.songs || []).some((song) => (song._categories || []).some((category) => idOf(category.id) === idOf(id)));
      if (hasChildren) { say("No se puede eliminar una categoría con subcategorías.", true); return false; }
      if (hasSongs) { say("No se puede eliminar: hay canciones relacionadas.", true); return false; }
    }
    return true;
  }

  async function deleteSavedItem(kind, id) {
    if (busy) return;
    if (!checkDelete(kind, id)) return;
    const label = itemName(kind, id);
    if (!confirm(`¿Enviar “${label}” a la papelera? Podrás restaurarlo desde Respaldo.`)) return;

    busy = true;
    let archiveId = null, songConfirmed = false;
    try {
      if (kind === "song") {
        say("Enviando canto y acompañamiento a la papelera...");
        const { data, error } = await db.rpc("admin_delete_song_complete", { p_song_id: id });
        if (error) throw error;
        if (data !== true) throw new Error("No se confirmó la eliminación del canto.");
        songConfirmed = true;
        await window.apRefresh?.("Canto enviado a la papelera.");
        return;
      }
      say("Creando respaldo antes de eliminar...");
      archiveId = await archive(kind, id);
      if (!archiveId) throw new Error("No se confirmó el identificador del respaldo.");

      let error = null;
      if (kind === "artist") error = (await db.from("artists").delete().eq("id", id)).error;
      if (kind === "category") error = (await db.from("categories").delete().eq("id", id)).error;
      if (kind === "album") {
        const links = await db.from("album_songs").delete().eq("album_id", id);
        error = links.error || (await db.from("albums").delete().eq("id", id)).error;
      }

      if (error) throw error;
      await window.apRefresh?.("Elemento enviado a la papelera.");
    } catch (error) {
      const detail = error?.message || "Error desconocido.";
      if (kind === "song") {
        say(songConfirmed
          ? `El canto está en la papelera, pero no se pudo actualizar el catálogo: ${detail}.`
          : `No se confirmó la eliminación segura: ${detail}. Verifica la papelera y que la protección completa esté instalada. No se intentó una eliminación alternativa.`, true);
        return;
      }
      say(archiveId
        ? `No se pudo completar la operación: ${detail}. El respaldo se conserva en la papelera; algunas relaciones pueden haberse eliminado. Revisa el registro antes de reintentar o restaurar.`
        : `No se inició la eliminación: ${detail}. No se confirmó el respaldo; revisa la papelera y la configuración.`, true);
    } finally {
      busy = false;
    }
  }

  async function downloadBackup() {
    const status = document.getElementById("jhdBackupStatus");
    const button = document.getElementById("jhdDownloadBackup");
    if (button) button.disabled = true;
    if (status) status.textContent = "Preparando respaldo del catálogo...";
    try {

      const catalog = {};
      for (const table of TABLES) {
        if (status) status.textContent = `Respaldando ${table}...`;
        catalog[table] = await selectAll(table);
      }
      const payload = { format: FORMAT, version: VERSION, created_at: new Date().toISOString(), catalog };
      downloadJson(payload, `juntos-hacia-dios-respaldo-${filenameDate()}.json`);
      if (status) status.textContent = "Respaldo descargado. Guárdalo en Drive o en otra ubicación segura.";
    } catch (error) {
      if (status) status.textContent = `No se pudo crear el respaldo: ${error?.message || "Error desconocido."}`;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function trashHTML() {
    if (!trashRows.length) return '<div class="admin-empty">La papelera está vacía.</div>';
    return trashRows.map((row) => `<article class="admin-trash-item"><div><h4>${esc(row.item_name || "Elemento eliminado")}</h4><p>${esc({ song: "Canción", artist: "Artista", category: "Categoría", album: "Álbum" }[row.item_type] || "Elemento")} · Eliminado ${esc(safeDate(row.deleted_at))}</p></div><div class="admin-trash-actions"><button class="song-btn small-btn" type="button" data-jhd-restore="${esc(row.id)}">Restaurar</button><button class="song-btn small-btn secondary" type="button" data-jhd-purge="${esc(row.id)}">Borrar definitivo</button></div></article>`).join("");
  }

  async function loadTrash() {
    const holder = document.getElementById("jhdTrashList");
    if (!holder || !db) return;
    holder.innerHTML = '<div class="admin-empty">Cargando papelera...</div>';
    const result = await db.from(TRASH_TABLE).select("*").order("deleted_at", { ascending: false }).limit(100);
    if (result.error) {
      holder.innerHTML = '<div class="admin-empty">La papelera se activará al ejecutar ADMIN_RESPALDO_PAPELERA.sql en Supabase.</div>';
      return;
    }
    trashRows = result.data || [];
    holder.innerHTML = trashHTML();
    bindTrashActions();
  }

  async function restoreRelations(kind, id, relations) {
    const scopes = {
      song: { song_artists: "song_id", song_categories: "song_id", album_songs: "song_id", song_links: "song_id", song_capo_versions: "song_id", artist_featured_songs: "song_id" },
      album: { album_songs: "album_id" },
      artist: { artist_featured_songs: "artist_id" },
      category: {}
    }[kind];
    // Preserve the established insertion order, and reject unrelated snapshot rows.
    const plan = [];
    for (const [table, key] of Object.entries(scopes || {})) {
      const saved = relations?.[table] || [];
      if (!Array.isArray(saved) || saved.some((row) => !row || String(row[key]) !== String(id))) {
        throw new Error(`${table}: el respaldo contiene relaciones no válidas.`);
      }
      if (!saved.length) continue;
      const existing = await rows(table, key, id);
      const values = missingRelations(saved, existing);
      if (values.length) plan.push({ table, values });
    }
    for (const { table, values } of plan) {
      const result = await db.from(table).insert(values);
      if (result.error) throw new Error(`${table}: ${result.error.message}`);
    }
  }

  async function restoreTrash(id) {
    const row = trashRows.find((item) => idOf(item.id) === idOf(id));
    if (!row || busy) return;
    if (!confirm(`¿Restaurar “${row.item_name}”?`)) return;
    busy = true;
    try {
      const snapshot = row.snapshot || {};
      // Native snapshots include full database rows and song_versions. Use the same
      // transactional owner-only endpoint as native Admin; never fall back on errors.
      if (row.item_type === "song" && Object.hasOwn(snapshot, "song")) {
        if (!snapshot.song?.id || idOf(snapshot.song.id) !== idOf(row.original_id) || Object.hasOwn(snapshot, "record")) {
          throw new Error("El respaldo nativo no coincide con el canto original.");
        }
        const { data, error } = await db.rpc("admin_restore_song", { p_trash_id: row.id });
        if (error) throw error;
        if (data !== true) throw new Error("No se confirmó la restauración del canto.");
      } else {
        const table = { song: "songs", artist: "artists", category: "categories", album: "albums" }[row.item_type];
        if (!table || !snapshot.record) throw new Error("El respaldo no tiene datos suficientes.");
        const exists = await db.from(table).select("id").eq("id", snapshot.record.id).maybeSingle();
        if (exists.error) throw exists.error;
        if (!exists.data) {
          const created = await db.from(table).insert([cleanRow(snapshot.record, true)]);
          if (created.error) throw created.error;
        }
        await restoreRelations(row.item_type, snapshot.record.id, snapshot.relations || {});
        const removed = await db.from(TRASH_TABLE).delete().eq("id", row.id);
        if (removed.error) throw removed.error;
      }
      await window.apRefresh?.("Elemento restaurado correctamente.");
    } catch (error) {
      say(`No se pudo restaurar: ${error?.message || "Error desconocido."}`, true);
    } finally {
      busy = false;
    }
  }

  async function purgeTrash(id) {
    const row = trashRows.find((item) => idOf(item.id) === idOf(id));
    if (!row || !confirm(`¿Borrar definitivamente “${row.item_name}”? Esta acción no se puede deshacer.`)) return;
    const result = await db.from(TRASH_TABLE).delete().eq("id", id);
    if (result.error) return say(`No se pudo borrar de la papelera: ${result.error.message}`, true);
    await loadTrash();
    say("Elemento eliminado definitivamente.");
  }

  function bindTrashActions() {
    document.querySelectorAll("[data-jhd-restore]").forEach((button) => button.addEventListener("click", () => restoreTrash(button.dataset.jhdRestore)));
    document.querySelectorAll("[data-jhd-purge]").forEach((button) => button.addEventListener("click", () => purgeTrash(button.dataset.jhdPurge)));
  }

  function backupViewHTML() {
    const state = app();
    return `<section class="admin-section" id="jhdBackupView"><div class="admin-section-heading"><div><p class="hero-kicker">Protección del catálogo</p><h2>Respaldo y recuperación</h2></div><p class="admin-count">${esc((state?.songs || []).length + (state?.artists || []).length + (state?.categories || []).length)} elementos</p></div><div class="admin-backup-summary"><span>${esc((state?.songs || []).length)} canciones</span><span>${esc((state?.artists || []).length)} artistas</span><span>${esc((state?.categories || []).length)} categorías</span><span>${esc((state?.albums || []).length)} álbumes</span></div><div class="admin-backup-grid"><article class="admin-backup-card"><h3>Descargar respaldo</h3><p>Guarda una copia completa del cancionero en un archivo JSON. Incluye canciones, artistas, categorías, álbumes, enlaces, versiones con capo, versiones alternativas, donaciones, destacadas y arreglos Studio publicados accesibles para tu cuenta.</p><div class="admin-backup-actions"><button class="song-btn" type="button" id="jhdDownloadBackup">Descargar respaldo</button></div><p class="admin-backup-status" id="jhdBackupStatus"></p></article><article class="admin-backup-card"><h3>Papelera segura</h3><p>Antes de eliminar una canción, artista, categoría o álbum, el panel guarda una copia para poder restaurarla después.</p><div class="admin-backup-actions"><button class="song-btn secondary" type="button" id="jhdRefreshTrash">Actualizar papelera</button></div></article></div><p class="admin-backup-warning"><strong>Recomendación:</strong> descarga un respaldo antes de hacer cambios grandes. La papelera protege eliminaciones hechas desde este panel; no sustituye una copia guardada fuera del sitio.</p><section class="artist-profile-section"><div class="admin-section-heading"><div><p class="hero-kicker">Recuperación</p><h2>Papelera</h2></div></div><div class="admin-trash-list" id="jhdTrashList"><div class="admin-empty">Cargando papelera...</div></div></section></section>`;
  }

  function renderBackupView(view) {
    if (!view) return;
    view.innerHTML = backupViewHTML();
    document.getElementById("jhdDownloadBackup")?.addEventListener("click", downloadBackup);
    document.getElementById("jhdRefreshTrash")?.addEventListener("click", loadTrash);
    window.ShalomAdminBackupImport?.mount();
    loadTrash();
  }

  // The main admin renderer owns tab selection and invokes this view.
  window.ShalomAdminBackup = { mount: renderBackupView, deleteSong: (id) => deleteSavedItem("song", id) };

  function installDeleteInterception() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-artist],[data-delete-category],[data-delete-album],[data-cat2-delete]");
      if (!button) return;
      let kind = "", id = "";
      if (button.dataset.deleteArtist) { kind = "artist"; id = button.dataset.deleteArtist; }
      if (button.dataset.deleteCategory) { kind = "category"; id = button.dataset.deleteCategory; }
      if (button.dataset.deleteAlbum) { kind = "album"; id = button.dataset.deleteAlbum; }
      if (button.dataset.cat2Delete) { kind = "category"; id = button.dataset.cat2Delete; }
      if (!kind || !id) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      deleteSavedItem(kind, id);
    }, true);
  }

  function boot() {
    installDeleteInterception();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
