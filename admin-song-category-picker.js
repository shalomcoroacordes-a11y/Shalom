(() => {
  // Navegador de carpetas para asignar muchas categorías a una misma canción.
  if (window.__shalomSongMultiCategoryFoldersV2) return;
  window.__shalomSongMultiCategoryFoldersV2 = true;

  const TYPES = [
    ["catolico", "Católico"],
    ["cristiano", "Cristiano"],
    ["mixto", "Mixto"],
    ["general", "General"]
  ];
  const names = Object.fromEntries(TYPES);
  const state = { type: "", folderId: "" };
  const idOf = (value) => String(value || "");
  const unique = (items) => [...new Set((Array.isArray(items) ? items : []).map(idOf).filter(Boolean))];
  const category = (key) => (AP.categories || []).find((row) => idOf(row.id) === idOf(key));
  const categoryType = (row) => {
    const type = apNorm(row?.song_type || "");
    return names[type] ? type : "general";
  };
  const sorted = (rows) => [...rows].sort((a, b) =>
    Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
    String(a.name || "").localeCompare(String(b.name || ""), "es")
  );
  const children = (parentId) =>
    sorted((AP.categories || []).filter((row) => idOf(row.parent_id) === idOf(parentId)));
  const roots = (type) =>
    sorted((AP.categories || []).filter((row) => !row.parent_id && categoryType(row) === type));

  function ancestors(row) {
    const path = [];
    const seen = new Set();
    let current = row;
    while (current && !seen.has(idOf(current.id))) {
      seen.add(idOf(current.id));
      path.unshift(current);
      current = category(current.parent_id);
    }
    return path;
  }
  const fullPath = (row) => {
    const path = ancestors(row);
    const root = path[0] || row;
    return [names[categoryType(root)] || "General", ...path.map((part) => part.name || "Categoría")].join(" › ");
  };
  const locationOf = (row) => {
    const path = ancestors(row);
    return [names[categoryType(path[0] || row)] || "General",
      ...path.slice(0, -1).map((part) => part.name || "Categoría")].join(" › ");
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function control(label, onClick, className) {
    const button = node("button", className || "song-btn small-btn secondary", label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  const css = document.createElement("style");
  css.id = "shalomSongCategoryFoldersV2Style";
  css.textContent = [
    ".jhd-song-category-field{display:flex;min-width:0;flex-direction:column;gap:7px}",
    ".jhd-song-category-field>label{font-weight:750}",
    ".jhd-song-category-field>label small{color:var(--muted);font-weight:400}",
    ".jhd-multi-category-picker{padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--card-soft);display:grid;gap:11px;min-width:0}",
    ".shalom-cat-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}",
    ".shalom-cat-caption{margin:0;color:var(--muted);font-size:.85rem;line-height:1.5}",
    ".shalom-cat-breadcrumb{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:.84rem;border-radius:10px;padding:8px;background:rgba(47,199,131,.06);border:1px solid var(--border)}",
    ".shalom-cat-breadcrumb button{background:transparent;color:var(--gold);border:0;font:inherit;font-weight:750;cursor:pointer;padding:4px}",
    ".shalom-cat-breadcrumb span{color:var(--muted)}",
    ".shalom-cat-types{display:grid;gap:7px;grid-template-columns:repeat(2,minmax(0,1fr))}",
    ".shalom-cat-type{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;background:var(--card-soft);border:1px solid var(--border);border-radius:12px;padding:11px;color:inherit;cursor:pointer;font:inherit;min-width:0}",
    ".shalom-cat-type strong{font-size:.9rem}",
    ".shalom-cat-type small{color:var(--muted);font-size:.77rem}",
    ".shalom-cat-list{display:grid;gap:7px;max-height:340px;overflow-y:auto;overscroll-behavior:contain}",
    ".shalom-cat-item{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:9px;border:1px solid var(--border);border-radius:12px;background:var(--card-soft);min-width:0}",
    ".shalom-cat-item>label{display:flex;min-width:0;flex:1;gap:8px;align-items:center;font-size:.87rem;line-height:1.35;cursor:pointer}",
    ".shalom-cat-item>label>input,.shalom-cat-current input{accent-color:var(--gold);width:17px;height:17px;flex-shrink:0}",
    ".shalom-cat-item>label>span{overflow-wrap:anywhere}",
    ".shalom-cat-item button{white-space:nowrap;padding:7px 9px;font-size:.8rem}",
    ".shalom-cat-item[hidden]{display:none}",
    ".shalom-cat-current{padding:10px;border-radius:12px;border:1px solid rgba(47,199,131,.4);background:rgba(47,199,131,.08);display:grid;gap:8px}",
    ".shalom-cat-current strong{overflow-wrap:anywhere}",
    ".shalom-cat-current label{display:flex;gap:8px;align-items:center;font-size:.86rem;cursor:pointer}",
    ".shalom-cat-search{width:100%;box-sizing:border-box}",
    ".shalom-cat-table-wrap{min-width:0;overflow-x:auto;border-radius:10px;border:1px solid var(--border)}",
    ".shalom-cat-table{width:100%;border-collapse:collapse;font-size:.82rem}",
    ".shalom-cat-table th,.shalom-cat-table td{padding:8px;text-align:left;border-bottom:1px solid var(--border);vertical-align:middle;overflow-wrap:anywhere}",
    ".shalom-cat-table th{color:var(--muted);font-weight:700}",
    ".shalom-cat-table tbody tr:last-child td{border-bottom:0}",
    ".shalom-cat-table button{padding:5px 8px;font-size:.79rem;white-space:nowrap}",
    ".shalom-cat-selected{font-weight:750;font-size:.86rem;margin:1px 0}",
    ".shalom-cat-empty{padding:12px;color:var(--muted);font-size:.85rem;border:1px dashed var(--border);border-radius:10px}",
    "@media(max-width:540px){.shalom-cat-types{grid-template-columns:1fr}.shalom-cat-item{align-items:flex-start}.shalom-cat-table{font-size:.77rem}.shalom-cat-table th,.shalom-cat-table td{padding:7px 5px}}"
  ].join("");
  if (!document.getElementById(css.id)) document.head.append(css);

  function attach() {
    const host = document.getElementById("songMultiCategories");
    if (!host || host.dataset.foldersReady === "yes" || !AP.draft) return;
    host.dataset.foldersReady = "yes";
    AP.draft.category_ids = unique(
      Array.isArray(AP.draft.category_ids) ? AP.draft.category_ids : [AP.draft.category_id]
    );

    const top = node("div", "shalom-cat-top");
    const count = node("strong");
    const tip = node("p", "shalom-cat-caption",
      "Abre las carpetas y marca las categorías que correspondan al canto.");
    top.append(count);
    const browser = node("div");
    const selectedTitle = node("p", "shalom-cat-selected", "Categorías seleccionadas y ubicación");
    const selectedTable = node("div");
    host.append(top, tip, browser, selectedTitle, selectedTable);

    const selectedIds = () => unique(AP.draft?.category_ids || []);
    function assign(ids) {
      if (!AP.draft) return;
      AP.draft.category_ids = unique(ids);
      AP.draft.category_id = AP.draft.category_ids[0] || "";
      const hidden = document.querySelector("#songAdminForm input[name='category_id']");
      if (hidden) hidden.value = AP.draft.category_id;
      updateSelected();
    }
    function choose(id, yes) {
      const set = selectedIds();
      assign(yes ? [...set, id] : set.filter((value) => value !== id));
    }
    function categoryCheckbox(row, text) {
      const label = node("label");
      const checkbox = node("input");
      checkbox.type = "checkbox";
      checkbox.dataset.shalomCategoryId = idOf(row.id);
      checkbox.checked = selectedIds().includes(idOf(row.id));
      checkbox.addEventListener("change", () => choose(idOf(row.id), checkbox.checked));
      label.append(checkbox, node("span", "", text || row.name || "Categoría"));
      return label;
    }

    function updateSelected() {
      const selected = selectedIds();
      count.textContent = selected.length + (selected.length === 1 ? " categoría elegida" : " categorías elegidas");
      selectedTable.replaceChildren();
      if (!selected.length) {
        selectedTable.append(node("div", "shalom-cat-empty",
          "Todavía no has seleccionado ninguna categoría."));
      } else {
        const wrapper = node("div", "shalom-cat-table-wrap");
        const table = node("table", "shalom-cat-table");
        const head = node("thead");
        const header = node("tr");
        for (const title of ["Categoría", "Ubicación", ""]) header.append(node("th", "", title));
        head.append(header);
        const body = node("tbody");
        for (const categoryId of selected) {
          const row = category(categoryId);
          const tr = node("tr");
          const title = node("td", "", row?.name || "Categoría no disponible");
          const place = node("td", "", row ? locationOf(row) : "Sin ubicación");
          const actions = node("td");
          const remove = control("Quitar", () => {
            choose(categoryId, false);
          });
          remove.setAttribute("aria-label", "Quitar " + (row ? fullPath(row) : categoryId));
          actions.append(remove);
          tr.append(title, place, actions);
          body.append(tr);
        }
        table.append(head, body);
        wrapper.append(table);
        selectedTable.append(wrapper);
      }
      browser.querySelectorAll("input[data-shalom-category-id]").forEach((checkbox) => {
        checkbox.checked = selected.includes(checkbox.dataset.shalomCategoryId);
      });
    }

    function navigate(type, folderId) {
      state.type = type || "";
      state.folderId = folderId || "";
      renderBrowser();
    }
    function renderBrowser() {
      browser.replaceChildren();

      const crumbs = node("nav", "shalom-cat-breadcrumb");
      crumbs.setAttribute("aria-label", "Ubicación dentro de categorías");
      crumbs.append(control("Inicio", () => navigate("", ""), ""));
      if (state.type) {
        crumbs.append(node("span", "", "›"));
        crumbs.append(control(names[state.type] || "General", () => navigate(state.type, ""), ""));
      }
      if (state.folderId) {
        const folder = category(state.folderId);
        if (!folder) state.folderId = "";
        else for (const item of ancestors(folder)) {
          crumbs.append(node("span", "", "›"));
          crumbs.append(control(item.name || "Carpeta", () => navigate(state.type, idOf(item.id)), ""));
        }
      }
      browser.append(crumbs);

      if (!state.type) {
        const groups = node("div", "shalom-cat-types");
        for (const [type, title] of TYPES) {
          const size = roots(type).length;
          const open = control("", () => navigate(type, ""), "shalom-cat-type");
          open.append(node("strong", "", "📁 " + title));
          open.append(node("small", "", size + (size === 1 ? " carpeta principal" : " carpetas principales")));
          groups.append(open);
        }
        browser.append(groups);
        return;
      }

      let items = [];
      if (state.folderId) {
        const current = category(state.folderId);
        if (current) {
          const box = node("div", "shalom-cat-current");
          box.append(node("strong", "", "📁 " + current.name));
          box.append(categoryCheckbox(current, "Incluir esta carpeta como categoría del canto"));
          browser.append(box);
          items = children(current.id);
        }
      } else {
        items = roots(state.type);
      }

      const title = node("p", "shalom-cat-caption",
        state.folderId ? "Subcarpetas: puedes marcarlas o abrirlas." : "Carpetas de " + (names[state.type] || "General") + ":");
      browser.append(title);

      if (!items.length) {
        browser.append(node("div", "shalom-cat-empty", "No hay subcarpetas aquí."));
        return;
      }

      const search = node("input", "admin-filter-input shalom-cat-search");
      search.type = "search";
      search.placeholder = "Buscar en esta carpeta...";
      search.setAttribute("aria-label", "Buscar en la carpeta actual");
      browser.append(search);

      const list = node("div", "shalom-cat-list");
      for (const row of items) {
        const item = node("div", "shalom-cat-item");
        item.dataset.catName = apNorm(row.name || "");
        const subfolderCount = children(row.id).length;
        item.append(categoryCheckbox(row,
          (row.name || "Categoría") + (subfolderCount ? " · " + subfolderCount + " subcarpeta(s)" : "")
        ));
        if (subfolderCount) {
          item.append(control("Abrir ›", () => navigate(state.type, idOf(row.id))));
        }
        list.append(item);
      }
      browser.append(list);
      const empty = node("p", "shalom-cat-empty", "No hay categorías con ese nombre.");
      empty.hidden = true;
      browser.append(empty);
      search.addEventListener("input", () => {
        const q = apNorm(search.value.trim());
        let visible = 0;
        for (const item of list.children) {
          item.hidden = Boolean(q && !item.dataset.catName.includes(q));
          if (!item.hidden) visible += 1;
        }
        empty.hidden = visible > 0;
      });
    }

    renderBrowser();
    updateSelected();
  }

  const priorRender = apRenderView;
  apRenderView = function (...args) {
    priorRender.apply(this, args);
    attach();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attach);
  else attach();
})();