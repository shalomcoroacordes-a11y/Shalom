const client = window.supabaseClient;
const songsGrid = document.querySelector("#songsGrid");
const searchInput = document.querySelector("#songSearch");
const filterButtons = [...document.querySelectorAll(".filter-btn")];
const resultsStatus = document.querySelector("#songsResultsStatus");
const loadMoreButton = document.querySelector("#songsLoadMore");

const PAGE_SIZE = 24;
let categoryParam = "";
let albumParam = "";
let activeType = "";
let categoriesCache = null;
let albumsCache = null;
let searchTimer = 0;

const escapeHTML = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const names = (items) => (Array.isArray(items) ? items : []).map((item) => item?.name || item?.title || "").filter(Boolean).join(" · ");





function updateFilterState() {
  filterButtons.forEach((button) => {
    const selected = normalize(button.dataset.type) === activeType;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function readRoute() {
  const params = new URLSearchParams(location.search);
  categoryParam = params.get("categoria") || "";
  albumParam = params.get("album") || "";
  activeType = normalize(params.get("tipo") || "");
  if (searchInput) searchInput.value = params.get("buscar") || "";
  updateFilterState();
}

function saveRoute(mode = "replace") {
  const url = new URL(location.href);
  url.searchParams.delete("tipo");
  url.searchParams.delete("buscar");
  if (activeType) url.searchParams.set("tipo", activeType);
  const search = String(searchInput?.value || "").trim();
  if (search) url.searchParams.set("buscar", search);
  const state = { ...(history.state || {}), jhdSongsRoute: { type: activeType, search } };
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") history.pushState(state, "", next);
  else history.replaceState(state, "", next);
}

async function getCategories() {
  if (categoriesCache) return categoriesCache;
  const { data, error } = await client.from("categories").select("id,name,slug");
  if (error) throw error;
  categoriesCache = data || [];
  return categoriesCache;
}

async function getAlbums() {
  if (albumsCache) return albumsCache;
  const { data, error } = await client.from("albums").select("id,title,slug");
  if (error) throw error;
  albumsCache = data || [];
  return albumsCache;
}

function findRecord(items, value, nameField) {
  const key = normalize(value);
  return (items || []).find((item) => String(item.id) === String(value) || normalize(item.slug) === key || normalize(item[nameField]) === key) || null;
}

async function resolveRouteFilters() {
  const filters = { categoryId: null, albumId: null, empty: false };
  if (categoryParam) {
    const category = findRecord(await getCategories(), categoryParam, "name");
    if (!category) filters.empty = true;
    else filters.categoryId = category.id;
  }
  if (albumParam) {
    const album = findRecord(await getAlbums(), albumParam, "title");
    if (!album) filters.empty = true;
    else filters.albumId = album.id;
  }
  return filters;
}

function setStatus(message) {
  if (resultsStatus) resultsStatus.textContent = message;
}

function updateLoadMore() {
  if (!loadMoreButton) return;
  const hasMore = catalog.state.rows.length < catalog.state.total;
  loadMoreButton.hidden = !hasMore;
  loadMoreButton.disabled = catalog.state.loading;
  loadMoreButton.textContent = catalog.state.loading ? "Cargando…" : "Cargar más canciones";
}

function renderSongs() {
  if (!songsGrid) return;
  setStatus(`${catalog.state.total} ${catalog.state.total === 1 ? "canción encontrada" : "canciones encontradas"}`);

  if (!catalog.state.rows.length) {
    songsGrid.innerHTML = "<article class='song-card'><h3>Sin resultados</h3><p>Prueba otro nombre, artista, tono o filtro.</p></article>";
    if (loadMoreButton) {
      loadMoreButton.hidden = true;
      loadMoreButton.disabled = false;
      loadMoreButton.textContent = "Cargar más canciones";
    }
    return;
  }

  songsGrid.innerHTML = catalog.state.rows.map((song) => {
    const title = escapeHTML(song.title || "Canción sin título");
    const type = escapeHTML(song.song_type || "Canción");
    const artistText = escapeHTML(names(song._artists) || "Sin artista");
    const categoryText = escapeHTML(names(song._categories));
    const albumText = escapeHTML(names(song._albums));
    const tone = escapeHTML(song.tone || "");
    const href = `cancion.html?id=${encodeURIComponent(song.id || "")}`;
    return `<article class="song-card song-preview-card"><div class="song-preview-main"><h3>${title}</h3><p>${artistText}</p><p>${type}${categoryText ? ` · ${categoryText}` : ""}${albumText ? ` · ${albumText}` : ""}</p>${tone ? `<p><strong>Tono:</strong> ${tone}</p>` : ""}</div><div class="song-card-actions"><a class="song-btn small-btn" href="${href}">Ver canción</a><button class="song-btn small-btn secondary" type="button" data-share-title="${title}" data-share-url="${href}" aria-label="Compartir ${title}">Compartir</button></div></article>`;
  }).join("");

  songsGrid.querySelectorAll("[data-share-url]").forEach((button) => {
    button.addEventListener("click", () => shareSong(button.dataset.shareTitle || "Canción", new URL(button.dataset.shareUrl, location.href).href, button));
  });
  updateLoadMore();
}

async function shareSong(title, url, button) {
  const text = `Te comparto “${title}” en SHALOM.`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    const original = button.textContent;
    button.textContent = "Enlace copiado";
    setTimeout(() => { button.textContent = original; }, 1800);
  } catch (_) {
    window.prompt("Copia este enlace:", url);
  }
}

function beginFreshLoad() {
  if (songsGrid) songsGrid.innerHTML = "<article class='song-card shimmer-card'><h3>Buscando canciones…</h3><p>Un momento por favor.</p></article>";
  setStatus("Buscando canciones…");
  if (loadMoreButton) {
    loadMoreButton.hidden = true;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Cargar más canciones";
  }
}



function rpcErrorMessage(error) {
  const detail = String(error?.message || "");
  if (error?.code === "PGRST202" || /search_songs_catalog/i.test(detail)) {
    return "Falta activar la búsqueda escalable. Ejecuta el archivo supabase-song-catalog-search.sql en Supabase y vuelve a abrir esta página.";
  }
  return detail || "Revisa la conexión e inténtalo de nuevo.";
}

const catalog = window.ShalomCatalogSongRow.createPager({
  pageSize: PAGE_SIZE,
  fetchPage: async ({ limit, offset, isCurrent }) => {
    const filters = await resolveRouteFilters();
    if (!isCurrent() || filters.empty) return [];
    const { data, error } = await client.rpc("search_songs_catalog", { p_query: String(searchInput?.value || "").trim() || null, p_song_type: activeType || null, p_category_id: filters.categoryId, p_album_id: filters.albumId, p_limit: limit, p_offset: offset });
    if (error) throw error;
    return (data || []).map(window.ShalomCatalogSongRow.rowToSong);
  },
  onStart: append => append ? updateLoadMore() : beginFreshLoad(),
  onRender: renderSongs,
  onError: error => {
    if (songsGrid) songsGrid.innerHTML = `<article class='song-card'><h3>Error al cargar</h3><p>${escapeHTML(rpcErrorMessage(error))}</p></article>`;
    setStatus("No se pudieron cargar las canciones.");
    if (loadMoreButton) {
      loadMoreButton.hidden = true;
      loadMoreButton.disabled = false;
      loadMoreButton.textContent = "Cargar más canciones";
    }
  }
});
function fetchSongs(append = false) {
  if (!client) return;
  return catalog.load(append);
}
function resetAndFetch(mode = "replace") {
  saveRoute(mode);
  fetchSongs(false);
}

function start() {
  readRoute();
  if ((categoryParam || albumParam) && searchInput && !searchInput.value) searchInput.placeholder = `Mostrando: ${categoryParam || albumParam}`;
  if (!client) {
    if (songsGrid) songsGrid.innerHTML = "<article class='song-card'><h3>Sin conexión</h3><p>No se pudo iniciar Supabase.</p></article>";
    return;
  }
  fetchSongs(false);
}

searchInput?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => resetAndFetch("replace"), 260);
});

filterButtons.forEach((button) => button.addEventListener("click", () => {
  activeType = normalize(button.dataset.type);
  updateFilterState();
  resetAndFetch("push");
}));

loadMoreButton?.addEventListener("click", () => fetchSongs(true));
window.addEventListener("popstate", () => {
  readRoute();
  fetchSongs(false);
});

window.ShalomWebMenu.mount();
start();
