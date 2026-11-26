/* Shared presentation for public artist and album lists. No database or routing. */
(() => {
  const esc = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const countLabel = (count) => `${count} ${count === 1 ? "canto" : "cantos"}`;
  function card({kind,href,ariaLabel,iconClass,icon,kicker,title,description,count,action}) {
    return `<a class="artist-card catalog-${esc(kind)}-card" href="${esc(href)}" aria-label="${esc(ariaLabel)}"><div class="catalog-card-heading"><span class="${esc(iconClass)}" aria-hidden="true">${esc(icon)}</span><div><p class="catalog-card-kicker">${esc(kicker)}</p><h3>${esc(title)}</h3></div><span class="catalog-card-arrow" aria-hidden="true">→</span></div><p class="catalog-card-description">${esc(description)}</p><div class="catalog-card-footer"><span class="catalog-card-count"><span aria-hidden="true">♫</span> ${esc(countLabel(count))}</span><strong>${esc(action)}</strong></div></a>`;
  }
  function createLoadMore({grid,id,label,onLoad}) {
    let bound = null;
    function ensure() {
      if (!grid) return null;
      let button = document.getElementById(id);
      if (!button) {
        const wrap = document.createElement("div");
        wrap.className = "catalog-load-more";
        button = document.createElement("button");
        button.className = "song-btn secondary";
        button.id = id;
        button.type = "button";
        button.hidden = true;
        button.textContent = label;
        wrap.append(button);
        grid.after(wrap);
      }
      if (bound !== button) {
        if (bound) bound.removeEventListener("click", onLoad);
        button.addEventListener("click", onLoad);
        bound = button;
      }
      return button;
    }
    function update(state) {
      const button = ensure();
      if (!button) return;
      button.hidden = state.rows.length >= state.total;
      button.disabled = state.loading;
      button.textContent = state.loading ? "Cargando…" : label;
    }
    function reset() {
      const button = ensure();
      if (!button) return;
      button.hidden = true;
      button.disabled = true;
      button.textContent = label;
    }
    function hide() {
      const button = ensure();
      if (button) button.hidden = true;
    }
    return Object.freeze({ensure,update,reset,hide});
  }
  window.ShalomCatalogListView = Object.freeze({esc,countLabel,card,createLoadMore});
})();
