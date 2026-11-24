(() => {
  "use strict";
  // SHALOM Offline: solo datos publicos. No se descargan usuarios, sesiones ni datos de administración.
  const SUPABASE_URL = "https://ehpvsasyzlrlypjjpzuk.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_v5IM8FT4I63jqZPLBRO6hQ_eoR_vW6E";
  const TABLES = [
    "songs", "artists", "categories", "albums",
    "song_artists", "song_categories", "album_songs", "song_links", "song_capo_versions"
  ];
  const PAGE_SIZE = 250;
  const DB_NAME = "shalom-offline-cancionero-v1";
  const STORE_NAME = "snapshots";
  const SNAPSHOT_KEY = "complete-public-catalog";
  const WIFI_PREF_KEY = "shalom-offline-auto-wifi-v1";
  const AUTO_INTERVAL_MS = 20 * 60 * 1000;
  const $ = (selector) => document.querySelector(selector);
  const state = { snapshot: null, songs: [], activeId: "", shift: 0, capoChoice: "original", busy: false, limit: 80, lastAuto: 0, autoFailures: 0 };

  const normalize = (value) => String(value || "").toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const compare = (a, b) => String(a || "").localeCompare(String(b || ""), "es", { sensitivity: "base" });
  const uniq = (rows) => [...new Set(rows.filter(Boolean))];

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("Este navegador no admite guardar el catálogo sin conexión."));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("No se pudo abrir la memoria del teléfono."));
      request.onblocked = () => reject(new Error("Cierra otras pestañas de SHALOM e inténtalo otra vez."));
    });
  }

  async function getSaved() {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function saveComplete(snapshot) {
    // Una sola escritura atómica: el último catálogo no desaparece ante una descarga parcial.
    const db = await openDB();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error || new Error("No hay espacio suficiente para guardar el catálogo."));
        transaction.onerror = () => reject(transaction.error || new Error("No se pudo guardar el catálogo."));
      });
    } finally {
      db.close();
    }
  }

  function setMessage(text, error = false) {
    $("#syncStatus").textContent = text;
    $("#syncStatus").classList.toggle("error", error);
  }

  function connectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection || !connection.type) return "unknown";
    return String(connection.type).toLowerCase();
  }

  function connectionUI() {
    const online = navigator.onLine;
    const badge = $("#connectionState");
    const type = connectionType();
    badge.textContent = !online ? "Sin internet · lectura disponible"
      : type === "wifi" ? "Conectado a Wi-Fi" : "Con internet";
    badge.className = "connection-state " + (online ? "online" : "offline");
  }

  function savedSummary() {
    const snapshot = state.snapshot;
    const rows = snapshot?.data || {};
    $("#countSongs").textContent = (rows.songs || []).length.toLocaleString("es-MX");
    $("#countArtists").textContent = (rows.artists || []).length.toLocaleString("es-MX");
    $("#countCategories").textContent = (rows.categories || []).length.toLocaleString("es-MX");
    const date = snapshot?.savedAt ? new Date(snapshot.savedAt) : null;
    $("#syncInfo").textContent = date && !Number.isNaN(date.valueOf())
      ? "Última actualización: " + date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
      : "Todavía no hay una copia local.";
    $("#syncBadge").textContent = snapshot ? "Disponible offline" : "Sin descargar";
    $("#syncBadge").classList.toggle("done", Boolean(snapshot));
    $("#syncButton").textContent = snapshot ? "Actualizar cancionero" : "Descargar cancionero completo";
  }

  async function fetchAll(table, idField = "id", optional = false) {
    const records = [];
    let cursor = null;
    for (;;) {
      const url = new URL("/rest/v1/" + table, SUPABASE_URL);
      url.searchParams.set("select", "*");
      url.searchParams.set("order", idField + ".asc");
      url.searchParams.set("limit", String(PAGE_SIZE));
      if (cursor !== null) url.searchParams.set(idField, "gt." + cursor);
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: { "apikey": PUBLISHABLE_KEY, "Accept": "application/json" }
      });
      if (!response.ok) {
        if (optional && cursor === null && response.status === 404) { const body = await response.json().catch(() => null); if (["PGRST205","42P01"].includes(body?.code)) return []; }
        throw new Error("Error consultando " + table + " (HTTP " + response.status + ").");
      }
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length > PAGE_SIZE) throw new Error("Respuesta inválida de " + table + ".");
      for (const row of rows) { const id = row?.[idField]; if (typeof id !== "string" || !id || (cursor !== null && id <= cursor)) throw new Error("Página duplicada o desordenada de " + table + "."); cursor = id; }
      records.push(...rows);
      if (rows.length < PAGE_SIZE) return records;
    }
  }

  async function downloadCatalog({ manual = false } = {}) {
    if (state.busy) return;
    if (!navigator.onLine) {
      setMessage("No hay internet. Puedes usar el catálogo ya guardado.", true);
      return;
    }
    if (manual) {
      const network = connectionType();
      if (network !== "wifi" && $("#wifiOnly").checked) {
        const text = network === "cellular"
          ? "Se detectaron datos móviles. ¿Quieres descargar de todos modos?"
          : "Este teléfono no informa si estás conectado a Wi-Fi. Compruébalo en Ajustes. ¿Quieres continuar la descarga?";
        if (!window.confirm(text)) return;
      }
    } else if ($("#wifiOnly").checked && connectionType() !== "wifi") {
      return; // El navegador no puede garantizar Wi-Fi: no usar datos sin autorización.
    }
    state.busy = true;
    $("#syncButton").disabled = true;
    $("#syncProgress").hidden = false;
    $("#syncProgress").value = 0;
    setMessage("Preparando copia completa…");
    try {
      const data = {};
      for (const [index, table] of TABLES.entries()) {
        setMessage("Descargando " + (index + 1) + " de " + TABLES.length + ": " + table.replaceAll("_", " ") + "…");
        data[table] = await fetchAll(table);
        $("#syncProgress").value = index + 1;
      }
      setMessage("Descargando acompañamientos de guitarra publicados…");
      const arrangements = await fetchAll("song_studio_arrangements", "song_id", true);
      const bySong = new Map(arrangements.map(row => [row.song_id, row]));
      data.songs = data.songs.map(song => { const row = bySong.get(song.id); const {_studio,...rest} = song; return row && song.updated_at && row.song_revision === song.updated_at && row.arrangement?.v === 1 ? {...rest,_studio:row.arrangement} : rest; });
      const snapshot = {
        version: 1,
        savedAt: new Date().toISOString(),
        source: "ehpvsasyzlrlypjjpzuk",
        data
      };
      await saveComplete(snapshot);
      state.autoFailures = 0;
      state.snapshot = snapshot;
      prepareData();
      savedSummary();
      renderFilters();
      renderList();
      if (state.activeId) showSong(state.activeId, false);
      setMessage("Copia completa guardada. Ya puedes desactivar internet y consultar tus cantos.");
      if (manual && navigator.storage && typeof navigator.storage.persist === "function") {
        try { await navigator.storage.persist(); } catch (_) { /* No todos los navegadores permiten persistencia. */ }
      }
    } catch (error) {
      if (!manual) state.autoFailures = Math.min(state.autoFailures + 1, 5);
      setMessage("No se completó la actualización: " + (error?.message || "error desconocido") +
        ". La copia anterior se conserva.", true);
    } finally {
      state.busy = false;
      $("#syncButton").disabled = false;
      $("#syncProgress").hidden = true;
      savedSummary();
    }
  }

  function prepareData() {
    const data = state.snapshot?.data || {};
    const artistsById = new Map((data.artists || []).map((item) => [item.id, item]));
    const categoriesById = new Map((data.categories || []).map((item) => [item.id, item]));
    const albumsById = new Map((data.albums || []).map((item) => [item.id, item]));
    const artistLinks = new Map();
    const categoryLinks = new Map();
    const albumLinks = new Map();
    const capos = new Map();
    const links = new Map();
    function add(map, songId, value) {
      if (!songId || !value) return;
      if (!map.has(songId)) map.set(songId, []);
      map.get(songId).push(value);
    }
    for (const row of data.song_artists || []) {
      add(artistLinks, row.song_id, artistsById.get(row.artist_id));
    }
    for (const row of data.song_categories || []) {
      add(categoryLinks, row.song_id, categoriesById.get(row.category_id));
    }
    for (const row of data.album_songs || []) {
      add(albumLinks, row.song_id, albumsById.get(row.album_id));
    }
    for (const row of data.song_links || []) add(links, row.song_id, row);
    for (const row of data.song_capo_versions || []) add(capos, row.song_id, row);

    function categoryPath(item) {
      const items = [];
      const seen = new Set();
      let parent = item;
      while (parent && !seen.has(parent.id)) {
        seen.add(parent.id);
        items.unshift(parent.name || "Categoría");
        parent = categoriesById.get(parent.parent_id);
      }
      const root = item?.song_type || categoriesById.get(item?.parent_id)?.song_type || "";
      const type = { catolico: "Católico", cristiano: "Cristiano", mixto: "Mixto" }[root] || "General";
      return [type, ...items].join(" › ");
    }

    state.categoryPath = categoryPath;
    state.categories = categoriesById;
    state.songs = (data.songs || []).map((song) => ({
      ...song,
      _artists: artistLinks.get(song.id) || (song.artist_id ? [artistsById.get(song.artist_id)].filter(Boolean) : []),
      _categories: categoryLinks.get(song.id) || (song.category_id ? [categoriesById.get(song.category_id)].filter(Boolean) : []),
      _albums: albumLinks.get(song.id) || [],
      _links: (links.get(song.id) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      _capos: (capos.get(song.id) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    })).sort((a, b) => compare(a.title, b.title));
  }

  function makeOption(select, id, label) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    select.append(option);
  }

  function renderFilters() {
    const categories = $("#categoryFilter");
    const artists = $("#artistFilter");
    const previousCat = categories.value, previousArtist = artists.value;
    categories.replaceChildren();
    artists.replaceChildren();
    makeOption(categories, "", "Todas las categorías");
    makeOption(artists, "", "Todos los artistas");
    const data = state.snapshot?.data || {};
    for (const item of (data.categories || []).slice().sort((a, b) => compare(state.categoryPath(a), state.categoryPath(b)))) {
      makeOption(categories, item.id, state.categoryPath(item));
    }
    for (const item of (data.artists || []).slice().sort((a, b) => compare(a.name, b.name))) {
      makeOption(artists, item.id, item.name || "Artista");
    }
    if ([...categories.options].some((item) => item.value === previousCat)) categories.value = previousCat;
    if ([...artists.options].some((item) => item.value === previousArtist)) artists.value = previousArtist;
  }

  function descendantIds(categoryId) {
    const ids = new Set([categoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of state.snapshot?.data?.categories || []) {
        if (row.parent_id && ids.has(row.parent_id) && !ids.has(row.id)) {
          ids.add(row.id);
          changed = true;
        }
      }
    }
    return ids;
  }

  function filteredSongs() {
    const query = normalize($("#songSearch").value.trim());
    const type = $("#typeFilter").value;
    const artist = $("#artistFilter").value;
    const category = $("#categoryFilter").value;
    const categoryIds = category ? descendantIds(category) : null;
    return state.songs.filter((song) => {
      if (type && song.song_type !== type) return false;
      if (artist && !song._artists.some((row) => row.id === artist)) return false;
      if (categoryIds && !song._categories.some((row) => categoryIds.has(row.id))) return false;
      if (!query) return true;
      const searchable = [song.title, song.lyrics, song.tone,
        ...song._artists.map((item) => item.name),
        ...song._categories.map((item) => item.name)].join(" ");
      return normalize(searchable).includes(query);
    });
  }

  function renderList() {
    const list = $("#songList");
    list.replaceChildren();
    const results = filteredSongs();
    $("#resultCount").textContent = results.length + (results.length === 1 ? " resultado" : " resultados");
    if (!state.snapshot) {
      list.append(simple("div", "empty", "Primero descarga el cancionero conectado a internet."));
      return;
    }
    if (!results.length) {
      list.append(simple("div", "empty", "No encontramos canciones con estos filtros."));
      return;
    }
    for (const song of results.slice(0, state.limit)) {
      const btn = simple("button", "song-item");
      btn.type = "button";
      const content = simple("span");
      content.append(simple("strong", "", song.title || "Sin título"));
      const meta = uniq([...song._artists.map((row) => row.name), song.tone ? "Tono " + song.tone : ""]);
      content.append(simple("small", "", meta.join(" · ") || "Ver letra y acordes"));
      btn.append(content, simple("span", "arrow", "›"));
      btn.addEventListener("click", () => showSong(song.id));
      list.append(btn);
    }
    if (results.length > state.limit) {
      const more = simple("button", "small-btn", "Mostrar más cantos");
      more.type = "button";
      more.addEventListener("click", () => { state.limit += 80; renderList(); });
      list.append(more);
    }
  }

  function simple(tag, className = "", content = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }

  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLATS = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
  function transposeChord(chord, offset) {
    const shift = (name) => {
      const i = NOTES.indexOf(FLATS[name] || name);
      return i === -1 ? name : NOTES[(i + offset + 120) % 12];
    };
    return String(chord || "").replace(/^([A-G](?:#|b)?)(.*)$/, (_all, root, suffix) => {
      return shift(root) + suffix.replace(/\/([A-G](?:#|b)?)/g, (_all2, bass) => "/" + shift(bass));
    });
  }
  function selectedCapo(song) {
    const options = window.ShalomOfflineCapo?.optionsForSong(song) || [];
    return options.find((item) => item.id === state.capoChoice)
      || { id:"original", label:"Sin capo", offset:0 };
  }

  function renderCapoControls(song) {
    const options = window.ShalomOfflineCapo?.optionsForSong(song) || [];
    const panel = $("#capoPanel");
    const choices = $("#capoChoices");
    choices.replaceChildren();
    panel.hidden = options.length < 2;
    if (panel.hidden) {
      state.capoChoice = "original";
      return;
    }
    if (!options.some((item) => item.id === state.capoChoice)) state.capoChoice = "original";
    for (const item of options) {
      const button = simple("button", "capo-btn", item.label);
      button.type = "button";
      const active = item.id === state.capoChoice;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", () => {
        state.capoChoice = item.id;
        for (const other of choices.querySelectorAll("button")) {
          const pressed = other === button;
          other.classList.toggle("active", pressed);
          other.setAttribute("aria-pressed", String(pressed));
        }
        renderLyrics(song);
      });
      choices.append(button);
    }
  }

  function renderLyrics(song) {
    const target = $("#offlineLyrics");
    const capo = selectedCapo(song);
    const shift = state.shift + capo.offset;
    if (window.ShalomChords?.render) {
      target.innerHTML = window.ShalomChords.render(song.lyrics || "Sin letra.", {
        transpose: (value) => String(value || "").split(/(\s+)/).map((token) =>
          /^[A-G](?:#|b)?/.test(token) ? transposeChord(token, shift) : token).join("")
      });
    } else {
      target.textContent = song.lyrics || "Sin letra.";
    }
    const tone = state.shift === 0 ? "Tono original"
      : (state.shift > 0 ? "+" : "") + state.shift + " semitonos";
    $("#transposeLabel").textContent = ($("#capoPanel").hidden ? tone : tone + " · " + capo.label);
  }

  function showSong(id, scroll = true) {
    const song = state.songs.find((row) => row.id === id);
    if (!song) return;
    if (state.activeId !== id) {
      state.shift = 0;
      state.capoChoice = "original";
    }
    state.activeId = id;
    $("#browseSection").hidden = true;
    $("#mainIntro").hidden = true;
    document.querySelector(".sync-card").hidden = true;
    $("#songReader").hidden = false;
    $("#readerTitle").textContent = song.title || "Canción";
    $("#readerType").textContent = ({catolico:"Canto católico",cristiano:"Canto cristiano",mixto:"Canto mixto"})[song.song_type] || "Canto";
    $("#readerMeta").textContent = [
      ...(song._artists || []).map((person) => person.name),
      song.tone ? "Tono " + song.tone : "",
      song.difficulty,
      ...song._categories.map((category) => state.categoryPath(category))
    ].filter(Boolean).join(" · ");
    renderCapoControls(song);
    renderLyrics(song);
    const more = $("#readerAdditional");
    more.replaceChildren();
    const practice = window.ShalomStudioCollections?.resolve(song);
    const toolbar = $(".reader-toolbar");
    toolbar?.querySelector("#offlineStudio")?.remove();
    if (practice?.ready && toolbar && window.ShalomStudioEntry) {
      const b = simple("button", "small-btn", "♫ Practicar con guitarra");
      b.id = "offlineStudio"; b.type = "button";
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          const capo = selectedCapo(song);
          const payload = window.ShalomStudioCollections.resolve(song, {shift:state.shift + capo.offset,capo:Number(capo.position)||0}).payload;
          if (!payload) throw Error("Tono o capo inválido.");
          await window.ShalomStudioEntry.open({song,arrangement:payload.arrangement,shift:payload.shift,capo:payload.capo});
        } catch (e) { window.alert(e.message || "No se pudo abrir Studio. Actualiza la copia con internet."); }
        finally { b.disabled = false; }
      });
      toolbar.append(b);
    }
    if (song._albums.length) more.append(simple("p", "", "Álbumes: " + song._albums.map((item) => item.title).join(" · ")));
    if (song._links.length) {
      more.append(simple("p", "", "Recursos externos (necesitan internet):"));
      for (const item of song._links) {
        try {
          const url = new URL(item.url);
          if (!["https:", "http:"].includes(url.protocol)) continue;
          const link = simple("a", "", item.title || item.platform || "Abrir recurso");
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          more.append(link, simple("span", "", " · "));
        } catch (_) { /* Ignorar enlaces inválidos. */ }
      }
    }
    if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
  }

  function backToList() {
    $("#songReader").hidden = true;
    $("#browseSection").hidden = false;
    $("#mainIntro").hidden = false;
    document.querySelector(".sync-card").hidden = false;
    state.activeId = "";
    state.capoChoice = "original";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function tryAuto(force = false) {
    if (!navigator.onLine || state.busy || !state.snapshot) return;
    const wait = AUTO_INTERVAL_MS * Math.pow(2, state.autoFailures);
    if ((!force || state.autoFailures > 0) && Date.now() - state.lastAuto < wait) return;
    if ($("#wifiOnly").checked && connectionType() !== "wifi") return;
    state.lastAuto = Date.now();
    downloadCatalog();
  }

  async function main() {
    $("#wifiOnly").checked = localStorage.getItem(WIFI_PREF_KEY) !== "false";
    $("#wifiOnly").addEventListener("change", (event) => {
      localStorage.setItem(WIFI_PREF_KEY, event.target.checked ? "true" : "false");
      tryAuto(true);
    });
    $("#syncButton").addEventListener("click", () => downloadCatalog({manual:true}));
    $("#backButton").addEventListener("click", backToList);
    $("#transposeDown").addEventListener("click", () => { state.shift = Math.max(-11, state.shift - 1); const song = state.songs.find((item) => item.id === state.activeId); if (song) renderLyrics(song); });
    $("#transposeUp").addEventListener("click", () => { state.shift = Math.min(11, state.shift + 1); const song = state.songs.find((item) => item.id === state.activeId); if (song) renderLyrics(song); });
    $("#transposeReset").addEventListener("click", () => { state.shift = 0; const song = state.songs.find((item) => item.id === state.activeId); if (song) renderLyrics(song); });
    for (const field of ["#songSearch","#typeFilter","#categoryFilter","#artistFilter"]) {
      $(field).addEventListener("input", () => { state.limit = 80; renderList(); });
    }
    connectionUI();
    window.addEventListener("offline", () => { connectionUI(); setMessage("Sin internet. Tus cantos guardados siguen disponibles."); });
    window.addEventListener("online", () => { connectionUI(); tryAuto(true); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { connectionUI(); tryAuto(); }
    });
    const net = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    net?.addEventListener?.("change", () => { connectionUI(); tryAuto(true); });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./offline-sw.js", {scope:"./"}).catch(() => {
        setMessage("No se pudo preparar la aplicación para abrirla sin conexión. Comprueba que estás usando HTTPS.", true);
      });
    }
    try {
      state.snapshot = await getSaved();
      if (state.snapshot?.source && state.snapshot.source !== "ehpvsasyzlrlypjjpzuk") {
        state.snapshot = null; // Nunca mezclar otro Supabase en la copia.
      }
      if (state.snapshot) prepareData();
      savedSummary();
      renderFilters();
      renderList();
      if (state.snapshot) {
        setMessage("Puedes consultar el cancionero descargado aunque no haya internet.");
        tryAuto();
      }
    } catch (error) {
      setMessage("No se pudo leer la copia local: " + (error.message || "error desconocido"), true);
    }
  }

  document.addEventListener("DOMContentLoaded", main);
})();
