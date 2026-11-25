(() => {
  if (window.__jhdMainArtistSearch) return;
  window.__jhdMainArtistSearch = true;

  const clean = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function loadVersionsHelper() {
    if (window.__jhdSongVersionsLoader) return;
    window.__jhdSongVersionsLoader = true;
    const script = document.createElement("script");
    script.src = "admin-song-versions.js?v=3";
    script.defer = true;
    document.head.append(script);
  }

  function selectedLabel(select) {
    const option = select.options[select.selectedIndex];
    return option && option.value ? option.textContent.trim() : "";
  }

  function options(select) {
    return Array.from(select.options).filter((option) => option.value);
  }

  function setArtist(select, input, list, value) {
    select.value = value;
    input.value = selectedLabel(select);
    list.hidden = true;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function makeButton(select, input, list, option) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.textContent.trim();
    if (option.value === select.value) button.className = "active";
    button.addEventListener("click", () => setArtist(select, input, list, option.value));
    return button;
  }

  function enhance(select) {
    if (!select || select.dataset.mainArtistSearch === "1") return;
    select.dataset.mainArtistSearch = "1";
    const box = document.createElement("div");
    box.className = "main-artist-search";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Buscar artista principal...";
    input.autocomplete = "off";
    input.value = selectedLabel(select);
    const list = document.createElement("div");
    list.className = "main-artist-results";
    list.hidden = true;
    box.append(input, list);
    select.parentNode.insertBefore(box, select);

    const render = () => {
      const q = clean(input.value);
      list.replaceChildren();
      const found = options(select).filter((option) => !q || clean(option.textContent).includes(q)).slice(0, 12);
      if (!found.length) {
        const empty = document.createElement("div");
        empty.className = "main-artist-empty";
        empty.textContent = "No se encontraron artistas.";
        list.append(empty);
      } else {
        found.forEach((option) => list.append(makeButton(select, input, list, option)));
      }
      list.hidden = false;
    };

    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const first = list.querySelector("button");
      if (!first) return;
      event.preventDefault();
      first.click();
    });
    select.addEventListener("change", () => { input.value = selectedLabel(select); });
  }

  function run() {
    loadVersionsHelper();
    enhance(document.getElementById("songMainArtist"));
  }

  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
})();