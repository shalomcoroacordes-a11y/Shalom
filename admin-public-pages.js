(() => {
  if (window.__jhdAdminPublicPages) return;
  window.__jhdAdminPublicPages = true;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const field = (name, label, value, multiline = false, hint = "") => `<label>${esc(label)}${hint ? `<span class="muted-text">${esc(hint)}</span>` : ""}${multiline ? `<textarea name="${esc(name)}" rows="${name.endsWith("text") || name === "intro" ? 4 : 3}">${esc(value)}</textarea>` : `<input name="${esc(name)}" value="${esc(value)}">`}</label>`;

  const pageForm = (current) => `<div class="admin-section-heading"><div><p class="hero-kicker">Contenido público</p><h2>Página Acerca de</h2></div><a class="song-btn small-btn secondary" href="acerca.html" target="_blank" rel="noopener">Ver página ↗</a></div><div class="admin-card"><p class="admin-note">Edita estos textos y guarda. Los cambios aparecerán en la opción <strong>Acerca de</strong> del menú público.</p><form class="admin-form" id="publicPageForm"><div class="admin-form-grid">${field("eyebrow", "Etiqueta superior", current.eyebrow)}${field("title", "Título principal", current.title)}</div>${field("highlight", "Palabras destacadas del título", current.highlight)}${field("intro", "Texto de introducción", current.intro, true)}<h3 class="admin-subsection-title">Tarjetas informativas</h3><div class="admin-form-grid">${field("card1_title", "Tarjeta 1 · Título", current.card1_title)}${field("card2_title", "Tarjeta 2 · Título", current.card2_title)}${field("card3_title", "Tarjeta 3 · Título", current.card3_title)}</div><div class="admin-form-grid">${field("card1_text", "Tarjeta 1 · Texto", current.card1_text, true)}${field("card2_text", "Tarjeta 2 · Texto", current.card2_text, true)}${field("card3_text", "Tarjeta 3 · Texto", current.card3_text, true)}</div><h3 class="admin-subsection-title">Sección de uso</h3><div class="admin-form-grid">${field("use_eyebrow", "Etiqueta", current.use_eyebrow)}${field("use_title", "Título", current.use_title)}</div>${field("use_text", "Texto", current.use_text, true)}<h3 class="admin-subsection-title">Sección de colaboración</h3><div class="admin-form-grid">${field("community_eyebrow", "Etiqueta", current.community_eyebrow)}${field("community_title", "Título", current.community_title)}</div>${field("community_text", "Texto", current.community_text, true)}<div class="admin-actions"><button class="song-btn" type="submit">Guardar página</button><button class="song-btn small-btn secondary" id="restoreAboutDefaults" type="button">Restaurar texto inicial</button></div><p class="admin-message" id="publicPageStatus" aria-live="polite"></p></form></div>`;

  window.ShalomAdminPublicPages = window.ShalomAdminContentEditor.create({
    db: window.supabaseClient,
    defaults: window.ShalomAboutDefaults,
    render: pageForm,
  
    "key": "about",
    "sectionId": "adminPublicPagesContent",
    "tabId": "adminPublicPagesTab",
    "formId": "publicPageForm",
    "statusId": "publicPageStatus",
    "resetId": "restoreAboutDefaults",
    "messages": {
      "loadTimeout": "La conexión tardó demasiado. Puedes editar y guardar la página de todos modos.",
      "saveTimeout": "La conexión tardó demasiado al guardar. Revisa tu internet e inténtalo de nuevo.",
      "missingLoad": "Falta activar la edición de páginas. Ejecuta supabase-public-pages.sql en Supabase.",
      "loadError": "No se pudo cargar el contenido guardado.",
      "saveError": "No se pudo guardar la página.",
      "saved": "Página guardada. Actualiza Acerca de para ver los cambios."
    }
  });
})();
