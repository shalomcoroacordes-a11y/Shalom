(() => {
  if (window.__jhdAdminRequestPage) return;
  window.__jhdAdminRequestPage = true;
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const field = (name, label, value, multiline = false) => `<label>${esc(label)}${multiline ? `<textarea name="${esc(name)}" rows="3">${esc(value)}</textarea>` : `<input name="${esc(name)}" value="${esc(value)}">`}</label>`;

  function formHTML(current) {
    return `<div class="admin-section-heading"><div><p class="hero-kicker">Contenido público</p><h2>Página Solicitar canto</h2></div><a class="song-btn small-btn secondary" href="solicitar-canto.html" target="_blank" rel="noopener">Ver página ↗</a></div><div class="admin-card"><p class="admin-note">Edita los textos de la página donde los usuarios piden nuevos cantos. Las solicitudes aparecerán en la pestaña <strong>Mensajes</strong>.</p><form class="admin-form" id="requestPageForm"><div class="admin-form-grid">${field("eyebrow", "Etiqueta superior", current.eyebrow)}${field("title", "Título principal", current.title)}</div>${field("highlight", "Palabras destacadas", current.highlight)}${field("intro", "Introducción", current.intro, true)}<h3 class="admin-subsection-title">Tarjeta lateral</h3>${field("side_title", "Título lateral", current.side_title)}${field("side_text", "Texto lateral", current.side_text, true)}<h3 class="admin-subsection-title">Consejos</h3><div class="admin-form-grid">${field("tip1_title", "Consejo 1 · Título", current.tip1_title)}${field("tip2_title", "Consejo 2 · Título", current.tip2_title)}${field("tip3_title", "Consejo 3 · Título", current.tip3_title)}</div><div class="admin-form-grid">${field("tip1_text", "Consejo 1 · Texto", current.tip1_text, true)}${field("tip2_text", "Consejo 2 · Texto", current.tip2_text, true)}${field("tip3_text", "Consejo 3 · Texto", current.tip3_text, true)}</div><div class="admin-actions"><button class="song-btn" type="submit">Guardar página</button><button class="song-btn small-btn secondary" id="restoreRequestDefaults" type="button">Restaurar texto inicial</button></div><p class="admin-message" id="requestPageStatus" aria-live="polite"></p></form></div>`;
  }

  window.ShalomAdminRequestPage = window.ShalomAdminContentEditor.create({
    db: window.supabaseClient,
    defaults: window.ShalomRequestDefaults,
    render: formHTML,
  
    "key": "request_song",
    "sectionId": "adminRequestPageContent",
    "tabId": "adminRequestPageTab",
    "formId": "requestPageForm",
    "statusId": "requestPageStatus",
    "resetId": "restoreRequestDefaults",
    "messages": {
      "loadTimeout": "La conexión tardó demasiado.",
      "saveTimeout": "La conexión tardó demasiado al guardar.",
      "missingLoad": "Falta ejecutar supabase-public-pages.sql en Supabase.",
      "loadError": "No se pudo cargar.",
      "saveError": "No se pudo guardar.",
      "saved": "Página guardada. Actualiza Solicitar canto para ver los cambios."
    }
  });
})();
