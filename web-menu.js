/* Shared public menu interaction. The HTML remains responsible for its links. */
(() => {
  const boundButtons = new WeakSet();
  const boundLinks = new WeakSet();

  function mount() {
    const button = document.querySelector("#menuToggle");
    const menu = document.querySelector("#navMenu");
    if (button && !boundButtons.has(button)) {
      boundButtons.add(button);
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => {
        const open = Boolean(menu?.classList.toggle("open"));
        button.setAttribute("aria-expanded", String(open));
      });
    }
    document.querySelectorAll("#navMenu a").forEach(link => {
      if (boundLinks.has(link)) return;
      boundLinks.add(link);
      link.addEventListener("click", () => {
        menu?.classList.remove("open");
        button?.setAttribute("aria-expanded", "false");
      });
    });
  }

  window.ShalomWebMenu = Object.freeze({ mount });
})();
