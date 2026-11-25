const client = window.supabaseClient;
const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
const slugParam = params.get("slug");
const $ = (selector) => document.querySelector(selector);

let currentSong = null;
let transpose = 0;
let capoShift = 0;
let capoLabel = "Sin capo";

const escapeHTML = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const N = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flat = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const rootNote = (value) => (String(value || "").match(/[A-G](?:#|b)?/) || [""])[0];
const toneIndex = (value) => N.indexOf(flat[String(value || "")] || String(value || ""));
const moveNote = (value, move) => {
  const index = toneIndex(value);
  return index < 0 ? value : N[(index + Number(move || 0) + 120) % 12];
};
const chord = (value, move) => String(value || "").replace(/^([A-G](?:#|b)?)(.*)$/, (_, root, rest) => {
  const bass = String(rest || "").replace(/\/([A-G](?:#|b)?)/g, (_match, note) => `/${moveNote(note, move)}`);
  return moveNote(root, move) + bass;
});
const capoOffset = (position, capoKey) => {
  const original = toneIndex(rootNote(currentSong?.tone || currentSong?.key));
  const shape = toneIndex(rootNote(capoKey));
  if (original >= 0 && shape >= 0) return shape - original;
  return -Number(position || 0);
};



function setSongError(message) {
  $("#songTitle").textContent = "No se pudo cargar";
  $("#songSubtitle").textContent = message;
  $("#songLyrics").textContent = "Vuelve a la lista de canciones e intenta abrir el canto nuevamente.";
}

function names(items) {
  return (items || []).map((item) => item?.name || item?.title || "").filter(Boolean).join(" · ");
}

function categoryKey(category) {
  return category?.slug || category?.id || "";
}

function categoryPath(category, allCategories) {
  const path = [];
  const seen = new Set();
  let current = category;
  while (current && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    path.unshift(current);
    current = (allCategories || []).find((item) => String(item.id) === String(current.parent_id));
  }
  return path;
}

function localReferrer() {
  try {
    const url = new URL(document.referrer || "");
    return url.origin === location.origin && !url.pathname.endsWith("/cancion.html") ? url : null;
  } catch (_) {
    return null;
  }
}

function prepareReaderToolbar() {
  const meta = $("#songMeta");
  if (!meta) return null;
  let toolbar = $("#songReaderToolbar");
  if (!toolbar) {
    toolbar = document.createElement("aside");
    toolbar.id = "songReaderToolbar";
    toolbar.className = "song-reader-toolbar";
    meta.parentElement?.insertBefore(toolbar, meta);
    toolbar.append(meta);
  }
  if (!$("#songBackBar")) {
    const back = document.createElement("div");
    back.id = "songBackBar";
    back.className = "song-back-bar";
    toolbar.prepend(back);
  }
  return toolbar;
}

function renderReaderNavigation(song, relations) {
  const primaryCategory = (relations.categories || [])[0];
  const path = primaryCategory ? categoryPath(primaryCategory, relations.categoryTree || []) : [];
  const hero = document.querySelector(".hero .hero-content");
  let breadcrumb = $("#songBreadcrumb");
  if (!breadcrumb && hero) {
    breadcrumb = document.createElement("nav");
    breadcrumb.id = "songBreadcrumb";
    breadcrumb.className = "song-breadcrumb";
    breadcrumb.setAttribute("aria-label", "Ruta de navegación");
    hero.prepend(breadcrumb);
  }

  if (breadcrumb) {
    const crumbs = [
      `<a href="index.html">Inicio</a>`,
      `<span aria-hidden="true">›</span>`,
      `<a href="canciones.html">Canciones</a>`,
      ...path.flatMap((item, index) => {
        const finalCategory = index === path.length - 1;
        const key = encodeURIComponent(categoryKey(item));
        const href = finalCategory ? `categorias.html?categoria=${key}` : `categorias.html?carpeta=${key}`;
        return [`<span aria-hidden="true">›</span>`, `<a href="${href}">${escapeHTML(item.name || "Categoría")}</a>`];
      }),
      `<span aria-hidden="true">›</span>`,
      `<span aria-current="page">${escapeHTML(song.title || "Canción")}</span>`
    ];
    breadcrumb.innerHTML = crumbs.join("");
  }

  const toolbar = prepareReaderToolbar();
  const backBar = $("#songBackBar");
  if (!toolbar || !backBar) return;

  const referrer = localReferrer();
  const pathName = referrer?.pathname.split("/").pop() || "";
  const fallback = referrer
    ? `${referrer.pathname}${referrer.search}${referrer.hash}`
    : primaryCategory
      ? `categorias.html?categoria=${encodeURIComponent(categoryKey(primaryCategory))}`
      : "canciones.html";
  const label = pathName === "categorias.html"
    ? "← Volver a Categorías"
    : pathName === "artista.html" || pathName === "artistas.html"
      ? "← Volver al artista"
      : pathName === "albumes.html"
        ? "← Volver al álbum"
        : "← Volver a Canciones";
  backBar.innerHTML = `<a class="song-back-link" id="songBackLink" href="${fallback}">${label}</a>`;
  $("#songBackLink")?.addEventListener("click", (event) => {
    if (referrer && history.length > 1) {
      event.preventDefault();
      history.back();
    }
  });
}

async function loadRelations(songId) {
  const [artistRes, categoryRes, albumRes, linksRes, capoRes, allCategoriesRes] = await Promise.all([
    client.from("song_artists").select("artists(id,name,slug,artist_type)").eq("song_id", songId),
    client.from("song_categories").select("categories(id,name,slug,song_type,parent_id)").eq("song_id", songId),
    client.from("album_songs").select("albums(id,title,slug,artist_id)").eq("song_id", songId),
    client.from("song_links").select("*").eq("song_id", songId).order("sort_order", { ascending: true }),
    client.from("song_capo_versions").select("*").eq("song_id", songId).order("sort_order", { ascending: true }),
    client.from("categories").select("id,name,slug,parent_id,sort_order").order("sort_order", { ascending: true }).order("name", { ascending: true })
  ]);
  return {
    artists: (artistRes.data || []).map((row) => row.artists).filter(Boolean),
    categories: (categoryRes.data || []).map((row) => row.categories).filter(Boolean),
    albums: (albumRes.data || []).map((row) => row.albums).filter(Boolean),
    links: linksRes.data || [],
    capos: capoRes.data || [],
    categoryTree: allCategoriesRes.data || []
  };
}

function renderChordLyrics() {
  const target = $("#songLyrics");
  if (!target || !currentSong) return;
  const lyrics = currentSong.lyrics || currentSong.letter || currentSong.content || "Letra no disponible.";
  const move = transpose + capoShift;
  target.className = "lyrics-block";
  const renderer = window.ShalomChords?.render;
  if (typeof renderer === "function") {
    // The canonical renderer validates and unwraps each chord token.
    target.innerHTML = renderer(lyrics, { transpose: (value) => chord(value, move) });
  } else {
    // Preserve the source as readable text if the shared script fails to load.
    // Never reinterpret or transpose it with a different parser.
    target.textContent = lyrics;
  }

  const status = $("#transposeStatus");
  if (status) status.textContent = typeof renderer === "function"
    ? `${transpose === 0 ? "Tono original" : `Transposición ${transpose > 0 ? "+" : ""}${transpose}`} · ${capoLabel}`
    : "Intérprete no disponible. Recarga la página para ajustar tono y capo.";
}

function renderControls(relations) {
  const toolbar = prepareReaderToolbar();
  if (!toolbar || $("#transposeBox")) return;
  const versions = relations.capos || [];
  const mainCapo = Number(currentSong.capo_position || 0);
  const mainKey = currentSong.capo_key || "";
  const mainButton = mainCapo > 0
    ? `<button class="song-btn small-btn" type="button" data-position="${mainCapo}" data-key="${escapeHTML(mainKey)}" data-label="Capo ${mainCapo}${mainKey ? ` · Figuras en ${escapeHTML(mainKey)}` : ""}">Capo ${mainCapo}</button>`
    : "";
  const versionButtons = versions.map((item) => {
    const position = Number(item.capo_position || 0);
    const key = item.capo_key || "";
    const label = item.label || `Capo ${position}${key ? ` · Figuras en ${key}` : ""}`;
    return `<button class="song-btn small-btn" type="button" data-position="${position}" data-key="${escapeHTML(key)}" data-label="${escapeHTML(label)}">${escapeHTML(label)}</button>`;
  }).join("");

  toolbar.insertAdjacentHTML("beforeend", `<div class="song-reader-controls"><div class="transpose-box" id="transposeBox" aria-label="Control de tono"><button class="song-btn small-btn" type="button" data-tone="-1" aria-label="Bajar un semitono">Bajar tono</button><span id="transposeStatus" aria-live="polite">Tono original · Sin capo</span><button class="song-btn small-btn" type="button" data-tone="1" aria-label="Subir un semitono">Subir tono</button><button class="song-btn small-btn secondary" type="button" data-tone="0">Original</button></div><div class="song-filters" id="capoControls" aria-label="Opciones de capo"><button class="filter-btn active" type="button" data-position="0" data-key="" data-label="Sin capo" aria-pressed="true">Sin capo</button>${mainButton}${versionButtons}</div></div>`);

  $("#transposeBox").querySelectorAll("[data-tone]").forEach((button) => button.addEventListener("click", () => {
    const value = Number(button.dataset.tone);
    transpose = value === 0 ? 0 : transpose + value;
    window.ShalomSongPreferences?.saveTranspose(transpose);
    renderChordLyrics();
  }));

  $("#capoControls").querySelectorAll("[data-position]").forEach((button) => button.addEventListener("click", () => {
    capoShift = capoOffset(button.dataset.position, button.dataset.key);
    capoLabel = button.dataset.label || "Sin capo";
    $("#capoControls").querySelectorAll("button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderChordLyrics();
  }));
}

function renderMeta(song, relations) {
  const items = [song.song_type || song.type, names(relations.categories), song.tone || song.key, names(relations.artists)].filter(Boolean);
  const meta = $("#songMeta");
  if (meta) meta.innerHTML = items.length ? items.map((item) => `<span class="filter-btn">${escapeHTML(item)}</span>`).join("") : "<span class='filter-btn'>Sin metadatos</span>";
}

function renderLinks(relations) {
  const container = $("#songLinks");
  if (!container) return;
  const links = relations.links || [];
  let heading = $("#songResourcesHeading");
  if (links.length && !heading) {
    heading = document.createElement("h3");
    heading.id = "songResourcesHeading";
    heading.className = "song-resource-heading";
    heading.textContent = "Recursos";
    container.before(heading);
  } else if (!links.length) {
    heading?.remove();
  }
  container.hidden = links.length === 0;
  container.innerHTML = links.length ? links.map((link) => `<a class="quick-card" href="${escapeHTML(link.url || "#")}" target="_blank" rel="noopener"><h3>${escapeHTML(link.title || link.link_type || "Recurso")}</h3><p>${escapeHTML([link.platform, link.link_type].filter(Boolean).join(" · ") || "Abrir recurso")}</p></a>`).join("") : "";
}

async function renderRelatedSongs(song, relations) {
  const section = $("#relatedSongsSection");
  const grid = $("#relatedSongsGrid");
  if (!section || !grid) return;
  const suggestions = await window.ShalomRelatedSongs.find(client, song, relations, () => {
    grid.innerHTML = "<article class='song-card shimmer-card'><h3>Buscando cantos relacionados…</h3><p>Un momento por favor.</p></article>";
    section.hidden = false;
  });
  if (!suggestions.length) {
    section.hidden = true;
    return;
  }
  grid.innerHTML = suggestions.map((item) => {
    const href = item.slug ? `cancion.html?slug=${encodeURIComponent(item.slug)}` : `cancion.html?id=${encodeURIComponent(item.id)}`;
    const meta = [item.song_type || "Canción", item.tone ? `Tono ${item.tone}` : ""].filter(Boolean).join(" · ");
    return `<a class="song-card song-link-card" href="${href}"><p class="artists-line">${escapeHTML(meta)}</p><h3>${escapeHTML(item.title || "Canción")}</h3><p>Ver letra y acordes</p></a>`;
  }).join("");
}

function renderReaderOverview(type, title, subtitle) {
  const toolbar = $("#songReaderToolbar");
  const lyrics = $("#songLyrics");
  if (!toolbar || !lyrics) return;
  type = String(type || "").trim() || "Canción";
  title = String(title || "").trim();
  subtitle = String(subtitle || "").trim();

  if (!document.getElementById("songReaderOverview")) {
    const overview = document.createElement("section");
    overview.id = "songReaderOverview";
    overview.className = "song-reader-overview";

    const copy = document.createElement("div");
    copy.className = "song-reader-overview-copy";
    const kicker = document.createElement("p");
    kicker.className = "hero-kicker";
    kicker.textContent = type;
    const heading = document.createElement("h2");
    heading.textContent = "Letra y acordes";
    const description = document.createElement("p");
    description.textContent = subtitle || (title ? `Consulta ${title} y prepara tu interpretación.` : "Prepara tu interpretación con letra, acordes y ajustes de tono.");
    copy.append(kicker, heading, description);

    const actions = document.createElement("div");
    actions.className = "song-reader-overview-actions";
    actions.innerHTML = '<a class="song-btn secondary" href="#songLyrics">Ir a la letra</a><a class="song-btn secondary" href="#relatedSongsSection">Relacionadas</a>';
    overview.append(copy, actions);
    toolbar.before(overview);
  }

  if (!document.getElementById("songLyricsHeading")) {
    const heading = document.createElement("div");
    heading.id = "songLyricsHeading";
    heading.className = "song-lyrics-heading";
    heading.innerHTML = "<div><p class='hero-kicker'>Cancionero</p><h2>Letra y acordes</h2><p>Ajusta el tono, capo y tamaño de letra desde los controles.</p></div>";
    lyrics.before(heading);
  }
  const overview = $("#songReaderOverview");
  const kicker = overview?.querySelector(".hero-kicker");
  const description = overview?.querySelector(".song-reader-overview-copy > p:last-child");
  if (kicker) kicker.textContent = type;
  if (description) description.textContent = subtitle || (title ? `Consulta ${title} y prepara tu interpretación.` : "Prepara tu interpretación con letra, acordes y ajustes de tono.");
}

function renderSongFeedback(title, subtitle) {
  const lyrics = $("#songLyrics");
  const shell = lyrics?.closest(".song-reader-shell");
  if (!shell || !title) return;
  const artist = String(subtitle || "").trim().replace(/^Por\s+/i, "");
  const query = new URLSearchParams({ tipo: "correccion", cancion: String(title).trim(), enlace: location.href });
  if (artist && artist !== "Canción del cancionero.") query.set("artista", artist);
  let feedback = $("#songFeedback");
  if (!feedback) {
    feedback = document.createElement("aside");
    feedback.id = "songFeedback";
    feedback.className = "song-feedback";
    feedback.innerHTML = '<p><strong>¿Letra, acorde o tono incorrecto?</strong>Reporta el detalle y se revisará para mejorar el cancionero.</p><a class="text-link">Reportar detalle</a>';
    const links = $("#songLinks");
    if (links?.parentElement === shell) links.after(feedback);
    else lyrics.after(feedback);
  }
  feedback.querySelector("a").href = "contacto.html?" + query.toString();
}

function renderSong(song, relations) {
  if (!currentSong || currentSong.id !== song.id) transpose = window.ShalomSongPreferences?.readTranspose() ?? 0;
  currentSong = song;
  const title = song.title || song.name || "Canción sin título";
  const type = song.song_type || song.type || "Canción";
  const artistText = names(relations.artists) || song.artist || song.artist_name || "";
  document.title = `${title} | SHALOM`;
  $("#songType").textContent = type;
  $("#songTitle").textContent = title;
  $("#songSubtitle").textContent = artistText ? `Por ${artistText}` : "Canción del cancionero.";
  renderReaderNavigation(song, relations);
  renderMeta(song, relations);
  window.JHDSEO?.setSong({
    title,
    artist: artistText,
    tone: song.tone || song.key || "",
    type,
    categories: (relations.categories || []).map(item => item.name).filter(Boolean).slice(0, 4)
  });
  renderControls(relations);
  renderReaderOverview(type, title, artistText ? `Por ${artistText}` : "Canción del cancionero.");
  renderChordLyrics();
  window.ShalomSongPreferences?.mount();
  window.ShalomSongReadingMode?.mount();
  renderLinks(relations);
  renderSongFeedback(title, artistText ? `Por ${artistText}` : "Canción del cancionero.");
  renderRelatedSongs(song, relations);
  // Only expose Studio for an available, current publication; never load audio here.
  if (window.ShalomStudioEntry && song.updated_at) {
    window.ShalomStudioEntry.available(client, song).then(available => {
      if (!available || currentSong?.id !== song.id || document.getElementById("songStudioAction")) return;
      const actions = document.getElementById("songReaderActions") || prepareReaderToolbar();
      if (!actions) return;
      const b = document.createElement("button");
      b.id = "songStudioAction";
      b.type = "button";
      b.className = "song-btn small-btn secondary";
      b.textContent = "Practicar con guitarra";
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          const capo = Number(document.querySelector("#capoControls [data-position].active")?.dataset.position || 0);
          await window.ShalomStudioEntry.open({client, song, shift:transpose+capoShift, capo});
        } catch (e) {
          const status = document.getElementById("songActionStatus");
          if (status) status.textContent = e.message;
          else window.alert(e.message);
        } finally { b.disabled = false; }
      });
      actions.append(b);
    }).catch(() => {});
  }

}

async function loadSong() {
  if (!idParam && !slugParam) {
    setSongError("No se encontró el identificador de la canción.");
    return;
  }
  if (!client) {
    setSongError("No se pudo iniciar la conexión con Supabase.");
    return;
  }
  let query = client.from("songs").select("*");
  query = idParam ? query.eq("id", idParam) : query.eq("slug", slugParam);
  const { data, error } = await query.single();
  if (error || !data) {
    setSongError("La canción no existe o no pudo cargarse desde Supabase.");
    return;
  }
  const relations = await loadRelations(data.id);
  renderSong(data, relations);
}

window.ShalomWebMenu.mount();
loadSong();