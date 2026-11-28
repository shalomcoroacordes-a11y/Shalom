const db = window.supabaseClient;
const grid = document.querySelector("#artistsGrid");
const input = document.querySelector("#artistSearch");
const params = new URLSearchParams(location.search);
const selectedKey = params.get("slug") || params.get("id") || "";
const PAGE_SIZE = 24;

let activeType = "";
let searchTimer = 0;

const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const {esc,card: catalogCard,createLoadMore} = window.ShalomCatalogListView;
const cleanDescription = (value) => String(value || "").replace(/<!--JHD_ARTIST_META:[\s\S]*?-->\s*$/, "").trim();
const biography = (person) => cleanDescription(person?.bio || person?.description);
const initials = (value) => String(value || "JHD").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();



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
  return catalogCard({
    kind:"artist",href:"artista.html?slug="+encodeURIComponent(key),
    ariaLabel:"Ver perfil de "+(person.name || "Ministerio"),
    iconClass:"catalog-avatar",icon:initials(person.name),kicker:typeLabel(person),
    title:person.name || "Ministerio",description:biography(person) || "Explora sus cantos, álbumes y colaboraciones.",
    count:Number(person.song_count || 0),action:"Ver perfil →"
  });
}

const loadMore = createLoadMore({grid,id:"artistsLoadMore",label:"Cargar más artistas",onLoad:()=>fetchArtists(true)});

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
  loadMore.update(catalog.state);
}

function beginFreshLoad() {
  if (grid) grid.innerHTML = '<article class="artist-card shimmer-card"><h3>Buscando artistas…</h3><p>Un momento por favor.</p></article>';
  setStatus("Buscando artistas…");
  loadMore.reset();
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
  onStart: append => append ? loadMore.update(catalog.state) : beginFreshLoad(),
  onRender: renderArtists,
  onError: error => {
    if (grid) grid.innerHTML = `<article class="artist-card"><h3>Error al cargar</h3><p>${esc(rpcErrorMessage(error))}</p></article>`;
    setStatus("No se pudieron cargar los artistas.");
    loadMore.hide();
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
  loadMore.ensure();
  fetchArtists(false);
}

input?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchArtists(false), 260);
});

window.ShalomWebMenu.mount();
start();
