const db = window.supabaseClient;
const grid = document.querySelector("#artistsGrid");
const input = document.querySelector("#artistSearch");
const params = new URLSearchParams(location.search);
const selectedKey = params.get("slug") || params.get("id") || "";
const PAGE_SIZE = 24;

let activeType = "";
let searchTimer = 0;

const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const esc = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const cleanDescription = (value) => String(value || "").replace(/<!--JHD_ARTIST_META:[\s\S]*?-->\s*$/, "").trim();
const biography = (person) => cleanDescription(person?.bio || person?.description);
const initials = (value) => String(value || "JHD").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
const countLabel = (count) => `${count} ${count === 1 ? "canto" : "cantos"}`;



function artistGroup(person) {
  const type = norm(person.artist_type || person.type);
  if (type.includes("catolico")) return "catolico";
  if (type.includes("cristiano")) return "cristiano";
  return "otros";
}

function typeLabel(person) {
  const group = artistGroup(person);
  if (group === "catolico") return "Católico";
  if (group === "cristiano") return "Cristiano";
  return person.artist_type || person.type || "Ministerio";
}

function card(person) {
  const key = person.slug || person.id;
  const description = biography(person) || "Explora sus cantos, álbumes y colaboraciones.";
  const count = Number(person.song_count || 0);
  return `<a class="artist-card catalog-artist-card" href="artista.html?slug=${encodeURIComponent(key)}" aria-label="Ver perfil de ${esc(person.name || "Ministerio")}"><div class="catalog-card-heading"><span class="catalog-avatar" aria-hidden="true">${esc(initials(person.name))}</span><div><p class="catalog-card-kicker">${esc(typeLabel(person))}</p><h3>${esc(person.name || "Ministerio")}</h3></div><span class="catalog-card-arrow" aria-hidden="true">→</span></div><p class="catalog-card-description">${esc(description)}</p><div class="catalog-card-footer"><span class="catalog-card-count"><span aria-hidden="true">♫</span> ${esc(countLabel(count))}</span><strong>Ver perfil →</strong></div></a>`;
}

function ensureLoadMore() {
  let button = document.querySelector("#artistsLoadMore");
  if (button || !grid) return button;
  const wrap = document.createElement("div");
  wrap.className = "catalog-load-more";
  wrap.innerHTML = '<button class="song-btn secondary" id="artistsLoadMore" type="button" hidden>Cargar más artistas</button>';
  grid.after(wrap);
  button = wrap.querySelector("#artistsLoadMore");
  button.addEventListener("click", () => fetchArtists(true));
  return button;
}

function updateLoadMore() {
  const button = ensureLoadMore();
  if (!button) return;
  const hasMore = catalog.state.rows.length < catalog.state.total;
  button.hidden = !hasMore;
  button.disabled = catalog.state.loading;
  button.textContent = catalog.state.loading ? "Cargando…" : "Cargar más artistas";
}

function mountFilters() {
  if (document.querySelector("#artistTypeFilters")) return;
  const searchBox = input?.closest(".search-container");
  if (!searchBox) return;
  const filters = document.createElement("div");
  filters.id = "artistTypeFilters";
  filters.className = "song-filters";
  filters.setAttribute("aria-label", "Filtrar artistas por tipo");
  filters.innerHTML = '<button class="filter-btn active" type="button" data-artist-type="" aria-pressed="true">Todas</button><button class="filter-btn" type="button" data-artist-type="catolico" aria-pressed="false">Católicos</button><button class="filter-btn" type="button" data-artist-type="cristiano" aria-pressed="false">Cristianos</button>';
  searchBox.after(filters);
  filters.querySelectorAll("[data-artist-type]").forEach((button) => button.addEventListener("click", () => {
    activeType = button.dataset.artistType || "";
    filters.querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    fetchArtists(false);
  }));
}

function setStatus(message) {
  const status = document.querySelector("#artistResultsStatus");
  if (status) status.textContent = message;
}

function renderArtists() {
  if (!grid) return;
  setStatus(`${catalog.state.total} ${catalog.state.total === 1 ? "artista encontrado" : "artistas encontrados"}`);
  grid.className = "artists-grid";
  grid.innerHTML = catalog.state.rows.length
    ? catalog.state.rows.map(card).join("")
    : '<article class="artist-card"><h3>Sin resultados</h3><p>Prueba con otro nombre o tipo de artista.</p></article>';
  updateLoadMore();
}

function beginFreshLoad() {
  if (grid) grid.innerHTML = '<article class="artist-card shimmer-card"><h3>Buscando artistas…</h3><p>Un momento por favor.</p></article>';
  setStatus("Buscando artistas…");
  const button = ensureLoadMore();
  if (button) {
    button.hidden = true;
    button.disabled = true;
    button.textContent = "Cargar más artistas";
  }
}

function rpcErrorMessage(error) {
  const detail = String(error?.message || "");
  if (error?.code === "PGRST202" || /search_artists_catalog/i.test(detail)) {
    return "Falta activar la búsqueda escalable de artistas. Ejecuta supabase-artists-scale.sql en Supabase.";
  }
  return detail || "Revisa la conexión e inténtalo de nuevo.";
}

const catalog = window.ShalomCatalogSongRow.createPager({
  pageSize: PAGE_SIZE,
  fetchPage: async ({ limit, offset }) => {
    const { data, error } = await db.rpc("search_artists_catalog", { p_query: String(input?.value || "").trim() || null, p_artist_type: activeType || null, p_limit: limit, p_offset: offset });
    if (error) throw error;
    return data || [];
  },
  onStart: append => append ? updateLoadMore() : beginFreshLoad(),
  onRender: renderArtists,
  onError: error => {
    if (grid) grid.innerHTML = `<article class="artist-card"><h3>Error al cargar</h3><p>${esc(rpcErrorMessage(error))}</p></article>`;
    setStatus("No se pudieron cargar los artistas.");
    const button = ensureLoadMore();
    if (button) button.hidden = true;
  }
});
function fetchArtists(append = false) {
  if (!db) return;
  return catalog.load(append);
}
function start() {
  if (!db || !grid) return;
  if (selectedKey) {
    const key = params.get("id") ? `id=${encodeURIComponent(selectedKey)}` : `slug=${encodeURIComponent(selectedKey)}`;
    location.replace(`artista.html?${key}`);
    return;
  }
  mountFilters();
  ensureLoadMore();
  fetchArtists(false);
}

input?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchArtists(false), 260);
});

window.ShalomWebMenu.mount();
start();
