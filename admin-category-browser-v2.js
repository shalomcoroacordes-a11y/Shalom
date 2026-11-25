(() => {
  const originalDelete = apDeleteCategory;
  const idOf = (value) => apId(value);
  const normType = (value) => {
    const type = apNorm(value || "");
    return type === "catolico" || type === "cristiano" ? type : "general";
  };
  const typeName = (type) => ({ all: "Todas", catolico: "Católico", cristiano: "Cristiano", general: "General" }[type] || "General");

  AP.categoryBrowser = AP.categoryBrowser || {};
  if (!["all", "catolico", "cristiano", "general"].includes(AP.categoryBrowser.type)) AP.categoryBrowser.type = "all";
  AP.categoryBrowser.parentId = AP.categoryBrowser.parentId || null;
  AP.categoryBrowser.limit = AP.categoryBrowser.limit || 8;
  AP.categoryBrowser.orderDirty = Boolean(AP.categoryBrowser.orderDirty);

  const state = () => AP.categoryBrowser;
  const byId = (id) => AP.categories.find((row) => idOf(row.id) === idOf(id));
  const isRoot = (row) => !row?.parent_id;
  const sorted = (rows) => [...rows].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name || "").localeCompare(String(b.name || ""), "es"));
  const directChildren = (parentId) => sorted(AP.categories.filter((row) => idOf(row.parent_id) === idOf(parentId)));
  const descendantsCount = (id) => AP.categories.filter((row) => idOf(row.parent_id) === idOf(id)).length;
  function pathTo(id) {
    const path = [];
    const seen = new Set();
    let current = byId(id);
    while (current && !seen.has(idOf(current.id))) {
      seen.add(idOf(current.id));
      path.unshift(current);
      current = byId(current.parent_id);
    }
    return path;
  }
  function rootsForActiveType() {
    const active = state().type;
    const roots = AP.categories.filter(isRoot);
    return sorted(active === "all" ? roots : roots.filter((row) => normType(row.song_type) === active));
  }
  function visibleRows() {
    return state().parentId ? directChildren(state().parentId) : rootsForActiveType();
  }
  function setView(type, parentId = null) {
    state().type = type || "all";
    state().parentId = parentId || null;
    state().limit = 8;
    state().orderDirty = false;
  }
  function placeName(parentId) {
    const path = pathTo(parentId);
    if (path.length) return path.map((row) => row.name || "Categoría").join(" › ");
    return typeName(state().type);
  }
  function parentType(parentId) {
    const parent = byId(parentId);
    return parent ? String(parent.song_type || "") : (state().type === "all" || state().type === "general" ? "" : state().type);
  }

  function formHTML() {
    const editing = AP.categories.find((row) => idOf(row.id) === idOf(AP.edits.category));
    const source = editing || {};
    const defaultParent = editing ? source.parent_id || "" : AP.categoryNewParent ?? state().parentId ?? "";
    const defaultType = editing ? String(source.song_type || "") : parentType(defaultParent);
    const siblingTotal = directChildren(defaultParent).length;
    const sort = editing ? Number(source.sort_order || 0) : (siblingTotal + 1) * 10;
    const blocked = new Set();
    if (editing) {
      blocked.add(idOf(editing.id));
      let changed = true;
      while (changed) {
        changed = false;
        AP.categories.forEach((row) => {
          if (blocked.has(idOf(row.parent_id)) && !blocked.has(idOf(row.id))) { blocked.add(idOf(row.id)); changed = true; }
        });
      }
    }
    const parents = apFlatCategories().filter((row) => !blocked.has(idOf(row.id)));
    const selectedParent = apOptions(parents, "id", (row) => apCategoryPath(row)).replace(`value=\"${apEsc(defaultParent)}\"`, `value=\"${apEsc(defaultParent)}\" selected`);
    const types = `<option value="" ${normType(defaultType) === "general" ? "selected" : ""}>General</option><option value="catolico" ${normType(defaultType) === "catolico" ? "selected" : ""}>Católico</option><option value="cristiano" ${normType(defaultType) === "cristiano" ? "selected" : ""}>Cristiano</option>`;
    const fixed = !editing;
    return `<div class="admin-card"><div class="admin-editor-head"><h3>${editing ? "Editar categoría" : "Agregar categoría"}</h3>${editing ? `<button class="song-btn small-btn secondary" type="button" data-cat2-cancel>Cancelar</button>` : ""}</div><form class="admin-form" id="categoryAdminForm"><label>Nombre<input name="name" required value="${apEsc(source.name || "")}" placeholder="Ejemplo: Adviento, María, Alabanza"></label>${fixed ? `<input type="hidden" name="parent_id" value="${apEsc(defaultParent)}"><input type="hidden" name="song_type" value="${apEsc(defaultType)}"><div class="admin-category-form-location">Se agregará dentro de: <strong>${apEsc(placeName(defaultParent))}</strong></div>` : `<div class="admin-form-grid"><label>Tipo<select name="song_type">${types}</select></label><label>Dentro de<select name="parent_id"><option value="">Categoría principal</option>${selectedParent}</select></label></div>`}<label>Orden<input name="sort_order" type="number" min="0" value="${apEsc(sort)}"></label><label>Descripción<textarea name="description" rows="4" placeholder="Breve descripción">${apEsc(source.description || "")}</textarea></label><button class="song-btn" type="submit">${editing ? "Guardar cambios" : "Guardar categoría"}</button></form></div>`;
  }

  function browserHTML() {
    const active = state().type;
    const current = byId(state().parentId);
    const path = pathTo(state().parentId);
    const allRows = visibleRows();
    const rows = allRows.slice(0, state().limit);
    const tabs = [["all", "Todas"], ["catolico", "Católico"], ["cristiano", "Cristiano"], ["general", "General"]];
    const crumbs = path.length ? `<button type="button" data-cat2-home>Inicio</button>${path.map((row) => `<span>›</span><button type="button" data-cat2-crumb="${apEsc(row.id)}">${apEsc(row.name || "Categoría")}</button>`).join("")}` : `<span>Ruta: <strong>${apEsc(typeName(active))}</strong></span>`;
    return `<div class="admin-category-browser"><div class="admin-category-browser-top"><div class="admin-category-type-tabs">${tabs.map(([key, label]) => `<button type="button" class="admin-category-type-tab ${active === key ? "active" : ""}" data-cat2-type="${key}">${label}</button>`).join("")}</div><button class="song-btn small-btn" type="button" data-cat2-add>+ Agregar aquí</button></div><input class="admin-filter-input" id="categoryFolderSearch" type="search" placeholder="Buscar en esta carpeta"><div class="admin-category-path">${crumbs}</div>${current ? `<div class="admin-category-current"><h3>📁 ${apEsc(current.name || "Categoría")}</h3><p>${apEsc(typeName(normType(current.song_type)))} · Orden ${apEsc(current.sort_order || 0)}${current.description ? ` · ${apEsc(current.description)}` : ""}</p><div class="admin-category-folder-actions"><button class="song-btn small-btn" type="button" data-cat2-edit="${apEsc(current.id)}">Editar esta categoría</button><button class="song-btn small-btn secondary" type="button" data-cat2-delete="${apEsc(current.id)}">Eliminar esta categoría</button></div></div>` : ""}${rows.length ? `<div class="admin-category-folder-grid">${rows.map((row, index) => `<article class="admin-category-folder-card" data-category-folder><h4>📁 ${apEsc(row.name || "Categoría")}</h4><p>${apEsc(typeName(normType(row.song_type)))} · Orden ${apEsc(row.sort_order || 0)}</p>${row.description ? `<p>${apEsc(row.description)}</p>` : ""}<p>${descendantsCount(row.id)} subcategoría(s)</p><div class="admin-category-folder-actions"><button class="song-btn small-btn" type="button" data-cat2-move="${apEsc(row.id)}" data-dir="-1" ${index === 0 ? "disabled" : ""}>↑ Subir</button><button class="song-btn small-btn" type="button" data-cat2-move="${apEsc(row.id)}" data-dir="1" ${index === allRows.length - 1 ? "disabled" : ""}>↓ Bajar</button><button class="song-btn small-btn" type="button" data-cat2-open="${apEsc(row.id)}">Abrir</button><button class="song-btn small-btn" type="button" data-cat2-edit="${apEsc(row.id)}">Editar</button><button class="song-btn small-btn secondary" type="button" data-cat2-delete="${apEsc(row.id)}">Eliminar</button></div></article>`).join("")}</div><div id="categoryFolderSearchEmpty" class="admin-empty" hidden>No hay carpetas que coincidan.</div>${allRows.length > state().limit ? `<button class="song-btn secondary" type="button" data-cat2-more>Ver más categorías</button>` : ""}<div class="admin-actions"><button class="song-btn small-btn" type="button" data-cat2-save-order>Guardar orden</button>${state().orderDirty ? `<p class="admin-category-order-note">Orden cambiado. Toca Guardar orden.</p>` : ""}</div>` : `<div class="admin-empty"><p>No hay carpetas en esta vista.</p><button class="song-btn small-btn" type="button" data-cat2-add>+ Agregar primera carpeta aquí</button></div>`}</div>`;
  }

  function filterVisible() {
    const q = apNorm(document.getElementById("categoryFolderSearch")?.value || "");
    const cards = [...document.querySelectorAll("[data-category-folder]")];
    let count = 0;
    cards.forEach((card) => { const show = !q || apNorm(card.textContent || "").includes(q); card.hidden = !show; if (show) count += 1; });
    const empty = document.getElementById("categoryFolderSearchEmpty");
    if (empty) empty.hidden = count > 0;
  }
  function showNew() {
    AP.edits.category = null;
    AP.categoryNewParent = state().parentId || "";
    AP.visualForms = AP.visualForms || {};
    AP.visualForms.categories = true;
    apRenderView();
    requestAnimationFrame(() => document.querySelector("#categoryAdminForm input[name='name']")?.focus({ preventScroll: true }));
  }
  function openFolder(id) {
    const row = byId(id);
    if (!row) return;
    setView(state().type, row.id);
    AP.edits.category = null;
    apRenderView();
  }
  function editFolder(id) {
    const row = byId(id);
    if (!row) return;
    AP.edits.category = id;
    setView(state().type, row.parent_id || null);
    AP.visualForms = AP.visualForms || {};
    AP.visualForms.categories = true;
    apRenderView();
    requestAnimationFrame(() => document.querySelector("#categoryAdminForm input[name='name']")?.focus({ preventScroll: true }));
  }
  function moveFolder(id, direction) {
    const rows = visibleRows();
    const index = rows.findIndex((row) => idOf(row.id) === idOf(id));
    const next = index + Number(direction || 0);
    if (index < 0 || next < 0 || next >= rows.length) return;
    const a = rows[index], b = rows[next], tmp = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tmp;
    state().orderDirty = true;
    apRenderView();
  }
  async function saveOrder() {
    const rows = visibleRows();
    if (!rows.length) return;
    apNote("Guardando orden...");
    for (let index = 0; index < rows.length; index += 1) {
      const newOrder = (index + 1) * 10;
      const { error } = await AdminPro.from("categories").update({ sort_order: newOrder }).eq("id", rows[index].id);
      if (error) { apNote(`Error guardando orden: ${error.message}`, true); return; }
      rows[index].sort_order = newOrder;
    }
    state().orderDirty = false;
    await apRefresh("Orden guardado correctamente.");
  }

  apCategoriesHTML = function () {
    return `<section class="admin-section">${apSectionHead("Categorías", "Categorías y carpetas", `${AP.categories.length} registradas`)}<div class="admin-layout">${formHTML()}<div>${browserHTML()}</div></div></section>`;
  };
  apBindCategories = function () {
    document.querySelector("[data-cat2-cancel]")?.addEventListener("click", () => { AP.edits.category = null; AP.categoryNewParent = null; apRenderView(); });
    document.querySelectorAll("[data-cat2-type]").forEach((button) => button.addEventListener("click", () => { setView(button.dataset.cat2Type || "all", null); AP.edits.category = null; apRenderView(); }));
    document.querySelectorAll("[data-cat2-add]").forEach((button) => button.addEventListener("click", showNew));
    document.querySelector("[data-cat2-home]")?.addEventListener("click", () => { setView(state().type, null); apRenderView(); });
    document.querySelectorAll("[data-cat2-crumb]").forEach((button) => button.addEventListener("click", () => { setView(state().type, button.dataset.cat2Crumb); apRenderView(); }));
    document.querySelectorAll("[data-cat2-open]").forEach((button) => button.addEventListener("click", () => openFolder(button.dataset.cat2Open)));
    document.querySelectorAll("[data-cat2-edit]").forEach((button) => button.addEventListener("click", () => editFolder(button.dataset.cat2Edit)));
    document.querySelectorAll("[data-cat2-delete]").forEach((button) => button.addEventListener("click", async () => { const id = button.dataset.cat2Delete; const row = byId(id); await originalDelete(id); if (idOf(state().parentId) === idOf(id) && !(AP.categories || []).some((category) => idOf(category.id) === idOf(id))) { state().parentId = row?.parent_id || null; apRenderView(); } }));
    document.querySelectorAll("[data-cat2-move]").forEach((button) => button.addEventListener("click", () => moveFolder(button.dataset.cat2Move, button.dataset.dir)));
    document.querySelector("[data-cat2-save-order]")?.addEventListener("click", saveOrder);
    document.querySelector("[data-cat2-more]")?.addEventListener("click", () => { state().limit += 8; apRenderView(); });
    document.querySelector("#categoryFolderSearch")?.addEventListener("input", filterVisible);
  };
})();

// Guardado y validación de categorías: un solo módulo, sin parche externo.
(() => {
  if (window.__jhdCategorySave) return;
  window.__jhdCategorySave = true;

  const normalizeType = (value) => {
    const type = String(value || "").trim().toLowerCase();
    return type === "catolico" || type === "cristiano" ? type : "";
  };

  const browserType = (value) => {
    const type = normalizeType(value);
    return type || "general";
  };

  const parentLabel = (parentId) => {
    if (!parentId) return "Todas";
    const row = (AP.categories || []).find((category) => String(category.id) === String(parentId));
    return row?.name || "esta carpeta";
  };

  const openDuplicate = (category) => {
    AP.edits.category = category.id;
    AP.filters.categories = category.name || "";
    AP.visualForms = AP.visualForms || {};
    AP.visualForms.categories = true;

    if (AP.categoryBrowser) {
      AP.categoryBrowser.type = browserType(category.song_type);
      AP.categoryBrowser.parentId = category.parent_id || null;
      AP.categoryBrowser.limit = 999999;
      AP.categoryBrowser.orderDirty = false;
    }

    if (typeof apRenderView === "function") apRenderView();
    requestAnimationFrame(() => {
      document.querySelector("#categoryAdminForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector('#categoryAdminForm input[name="name"]')?.focus({ preventScroll: true });
    });
  };

  const findDuplicateCategory = (payload, editingId) => (AP.categories || []).find((category) =>
    String(category.id) !== String(editingId || "") &&
    String(category.slug || "") === payload.slug &&
    String(category.parent_id || "") === String(payload.parent_id || "") &&
    normalizeType(category.song_type) === payload.song_type
  );

  let saveInProgress = false;
  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "categoryAdminForm") return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (saveInProgress) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const name = String(data.name || "").trim();
    if (!name) return apNote("Escribe el nombre de la categoría.", true);

    const payload = {
      name,
      slug: apSlug(name),
      song_type: normalizeType(data.song_type),
      parent_id: String(data.parent_id || "").trim() || null,
      sort_order: Number(data.sort_order || 0),
      description: String(data.description || "").trim() || null
    };

    const editingId = AP.edits?.category || null;
    // Validate hierarchy at submission time as well as in the editor options.
    // A stale form or manually modified parent_id must not create a cycle.
    if (payload.parent_id) {
      const categories = AP.categories || [];
      const byId = new Map(categories.map((category) => [String(category.id), category]));
      const seen = new Set();
      let cursor = payload.parent_id;
      while (cursor) {
        if (cursor === String(editingId || "")) {
          return apNote("Una categoría no puede estar dentro de sí misma ni de una subcategoría suya.", true);
        }
        if (seen.has(cursor)) {
          return apNote("La jerarquía de categorías contiene una referencia circular.", true);
        }
        seen.add(cursor);
        const parent = byId.get(cursor);
        if (!parent) return apNote("La carpeta de destino ya no existe. Actualiza el panel.", true);
        cursor = String(parent.parent_id || "");
      }
    }

    const duplicate = findDuplicateCategory(payload, editingId);

    if (duplicate) {
      openDuplicate(duplicate);
      return apNote(`“${duplicate.name}” ya existe dentro de ${parentLabel(payload.parent_id)}. Se abrió para editarla.`, true);
    }

    saveInProgress = true;
    const submitButton = form.querySelector?.('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    let savedToDatabase = false;
    try {
      const result = editingId
        ? await AdminPro.from("categories").update(payload).eq("id", editingId)
        : await AdminPro.from("categories").insert([payload]);

      if (result.error) {
        if (String(result.error.message || "").includes("categories_slug_parent_type_unique")) {
          const existing = findDuplicateCategory(payload, editingId);
          if (existing) {
            openDuplicate(existing);
            return apNote("Ya existe una categoría con ese nombre dentro de esta carpeta y tipo. Se abrió para editarla.", true);
          }
          return apNote("Ya existe una categoría con ese nombre dentro de esta carpeta y tipo. Actualiza el panel para localizarla.", true);
        }
        return apNote(`Error: ${result.error.message}`, true);
      }

      savedToDatabase = true;
      AP.edits.category = null;
      AP.categoryNewParent = null;
      await apRefresh(editingId ? "Categoría actualizada." : "Categoría guardada.");
    } catch (error) {
      if (savedToDatabase) {
        apNote("La categoría se guardó, pero no se pudo actualizar la lista. Recarga el administrador antes de volver a guardar.", true);
      } else {
        apNote(`No se pudo confirmar el guardado: ${error?.message || "Error de conexión."} Revisa la lista antes de reintentarlo.`, true);
      }
    } finally {
      saveInProgress = false;
      if (submitButton) submitButton.disabled = false;
    }
  }, true);
})();

