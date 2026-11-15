(() => {
  if (window.__shalomSongMultiCategoryPicker) return;
  window.__shalomSongMultiCategoryPicker = true;

  const id = (value) => String(value || "");
  const uniqueIds = (values) => [...new Set((Array.isArray(values) ? values : []).map(id).filter(Boolean))];
  const typeOf = (row) => {
    const type = apNorm(row?.song_type || "");
    return ["catolico", "cristiano", "mixto"].includes(type) ? type : "general";
  };
  const typeLabels = { catolico: "Católico", cristiano: "Cristiano", mixto: "Mixto", general: "General" };
  const byId = (value) => (AP.categories || []).find((row) => id(row.id) === id(value));

  const style = document.createElement("style");
  style.id = "shalomMultiCategoryStyles";
  style.textContent = [
    ".jhd-song-category-field{min-width:0;display:flex;flex-direction:column;gap:6px}",
    ".jhd-song-category-field>label{font-weight:750}",
    ".jhd-song-category-field>label small{font-weight:400;color:var(--muted)}",
    ".jhd-multi-category-picker{border:1px solid var(--border);border-radius:14px;padding:11px;display:grid;gap:10px;background:var(--card-soft)}",
    ".jhd-multi-cat-chips{display:flex;flex-wrap:wrap;gap:7px;align-items:center}",
    ".jhd-multi-cat-chip{border:1px solid var(--border);border-radius:999px;background:rgba(47,199,131,.12);color:var(--gold);font:inherit;font-size:.81rem;font-weight:750;padding:5px 9px;cursor:pointer}",
    ".jhd-multi-cat-chip:hover{border-color:var(--gold)}",
    ".jhd-multi-cat-help{margin:0;color:var(--muted);font-size:.83rem}",
    ".jhd-multi-cat-tools{display:flex;gap:8px;flex-wrap:wrap}",
    ".jhd-multi-cat-tools select{min-width:130px;max-width:190px;flex:1}",
    ".jhd-multi-cat-tools input{min-width:150px;flex:2}",
    ".jhd-multi-cat-list{max-height:240px;overflow-y:auto;display:grid;gap:4px;padding:3px}",
    ".jhd-multi-cat-choice{display:flex;gap:9px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:10px;cursor:pointer;min-width:0;font-size:.88rem;line-height:1.35}",
    ".jhd-multi-cat-choice:hover{border-color:var(--gold)}",
    ".jhd-multi-cat-choice input{accent-color:var(--gold);flex-shrink:0;width:17px;height:17px}",
    ".jhd-multi-cat-choice span{overflow-wrap:anywhere}",
    ".jhd-multi-cat-choice[hidden]{display:none!important}"
  ].join("");
  if (!document.getElementById(style.id)) document.head.append(style);

  function attach() {
    const host = document.getElementById("songMultiCategories");
    if (!host || host.dataset.multiReady === "yes" || !AP.draft) return;
    host.dataset.multiReady = "yes";
    AP.draft.category_ids = uniqueIds(
      Array.isArray(AP.draft.category_ids) ? AP.draft.category_ids : [AP.draft.category_id]
    );

    const summary = document.createElement("div");
    summary.className = "jhd-multi-cat-chips";
    const help = document.createElement("p");
    help.className = "jhd-multi-cat-help";
    help.textContent = "Selecciona todas las categorías donde quieres que aparezca este canto.";
    const tools = document.createElement("div");
    tools.className = "jhd-multi-cat-tools";
    const typeFilter = document.createElement("select");
    typeFilter.setAttribute("aria-label", "Filtrar por tipo de categoría");
    const all = document.createElement("option");
    all.value = ""; all.textContent = "Todos los tipos";
    typeFilter.append(all);
    for (const [value, title] of Object.entries(typeLabels)) {
      const option = document.createElement("option");
      option.value = value; option.textContent = title;
      typeFilter.append(option);
    }
    const search = document.createElement("input");
    search.type = "search";
    search.className = "admin-filter-input";
    search.placeholder = "Buscar carpeta o categoría...";
    search.setAttribute("aria-label", "Buscar categoría para agregar");
    tools.append(typeFilter, search);
    const list = document.createElement("div");
    list.className = "jhd-multi-cat-list";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Categorías disponibles");
    host.append(summary, help, tools, list);

    const getSelected = () => uniqueIds(AP.draft?.category_ids || []);
    function setSelected(ids) {
      if (!AP.draft) return;
      AP.draft.category_ids = uniqueIds(ids);
      AP.draft.category_id = AP.draft.category_ids[0] || "";
      const hidden = document.querySelector("#songAdminForm input[name='category_id']");
      if (hidden) hidden.value = AP.draft.category_id;
      updateSelection();
    }

    function updateSelection() {
      const current = new Set(getSelected());
      summary.replaceChildren();
      const counter = document.createElement("strong");
      counter.textContent = String(current.size) + (current.size === 1 ? " categoría" : " categorías");
      summary.append(counter);
      for (const selectedId of current) {
        const row = byId(selectedId);
        if (!row) continue;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "jhd-multi-cat-chip";
        chip.textContent = (typeof apCategoryPath === "function" ? apCategoryPath(row) : row.name) + " ×";
        chip.setAttribute("aria-label", "Quitar categoría " + (row.name || ""));
        chip.addEventListener("click", () => {
          setSelected(getSelected().filter((v) => v !== selectedId));
          const checkbox = list.querySelector("input[data-category-id='" + selectedId + "']");
          if (checkbox) checkbox.checked = false;
        });
        summary.append(chip);
      }
      list.querySelectorAll("input[data-category-id]").forEach((input) => {
        input.checked = current.has(input.dataset.categoryId);
      });
    }

    const sortedCategories = [...(AP.categories || [])].sort((a, b) => {
      const typeComparison = typeOf(a).localeCompare(typeOf(b));
      return typeComparison || apCategoryPath(a).localeCompare(apCategoryPath(b), "es");
    });
    for (const row of sortedCategories) {
      const choice = document.createElement("label");
      choice.className = "jhd-multi-cat-choice";
      choice.dataset.categoryType = typeOf(row);
      choice.dataset.searchText = apNorm(apCategoryPath(row) + " " + (typeLabels[typeOf(row)] || ""));
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.categoryId = id(row.id);
      input.checked = getSelected().includes(id(row.id));
      const title = document.createElement("span");
      title.textContent = (typeLabels[typeOf(row)] || "General") + " › " + apCategoryPath(row);
      choice.append(input, title);
      input.addEventListener("change", () => {
        const currently = getSelected();
        setSelected(input.checked ? [...currently, id(row.id)] : currently.filter((v) => v !== id(row.id)));
      });
      list.append(choice);
    }

    function filterChoices() {
      const type = typeFilter.value;
      const term = apNorm(search.value.trim());
      for (const row of list.querySelectorAll(".jhd-multi-cat-choice")) {
        row.hidden = (type && row.dataset.categoryType !== type) ||
          (term && !row.dataset.searchText.includes(term));
      }
    }
    typeFilter.addEventListener("change", filterChoices);
    search.addEventListener("input", filterChoices);
    updateSelection();
  }

  const previousRender = apRenderView;
  apRenderView = function (...args) {
    previousRender.apply(this, args);
    attach();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
