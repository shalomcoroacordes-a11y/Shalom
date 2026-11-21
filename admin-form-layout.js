// Componente del editor del administrador: punto de extensión explícito del render.
// No sobrescribe funciones globales ni inyecta CSS a destiempo.
(() => {
  "use strict";
  const searchIds = new Set(["artistFilter", "categoryFilter", "albumFilter", "songFilter", "collaboratorSearch"]);
  const forms = {
    artists: { selector: "#artistAdminForm", text: "Agregar artista o ministerio", edit: "artist" },
    categories: { selector: "#categoryAdminForm", text: "Agregar categoría o carpeta", edit: "category" },
    albums: { selector: "#albumAdminForm", text: "Agregar álbum o carpeta", edit: "album" },
    songs: { selector: "#songAdminForm", text: "Agregar canto, acordes, capo y enlaces", edit: "song" },
    donations: { selector: "#donationAdminForm", text: "Actualizar datos de apoyo", edit: "donation" }
  };
  const expandedByTab = new Map();

  function captureFocus() {
    const active = document.activeElement;
    const id = active?.id || "";
    if (!searchIds.has(id)) return null;
    return {
      id,
      start: typeof active.selectionStart === "number" ? active.selectionStart : null,
      end: typeof active.selectionEnd === "number" ? active.selectionEnd : null
    };
  }

  function restoreFocus(saved) {
    if (!saved) return;
    const field = document.getElementById(saved.id);
    if (!field) return;
    field.focus({ preventScroll: true });
    if (saved.start !== null && saved.end !== null &&
        typeof field.setSelectionRange === "function") {
      field.setSelectionRange(saved.start, saved.end);
    }
  }

  function enhanceForm(state) {
    if (!state) return;
    const tab = state.tab;
    const config = forms[tab];
    if (!config) return;
    const form = document.querySelector(config.selector);
    const card = form?.closest(".admin-card");
    if (!card || card.dataset.visualPolished === "yes") return;
    card.dataset.visualPolished = "yes";

    const head = card.querySelector(".admin-editor-head");
    const heading = head?.querySelector("h3")?.textContent?.trim() ||
      (tab === "donations" ? "Editar donaciones" : "Nuevo registro");
    const editing = tab === "donations" ?
      Boolean(state.donation?.id) : Boolean(state.edits?.[config.edit]);
    const details = document.createElement("details");
    details.className = "admin-form-collapsible";
    details.open = editing || Boolean(expandedByTab.get(tab));

    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.textContent = heading;
    summary.append(title);

    const cancel = head?.querySelector("button");
    if (cancel) {
      cancel.addEventListener("click", event => event.stopPropagation());
      summary.append(cancel);
    }
    head?.remove();

    const toolbar = document.createElement("div");
    toolbar.className = "admin-form-toggle";
    const help = document.createElement("span");
    help.textContent = editing ? "Edición en curso" : config.text;
    const button = document.createElement("button");
    button.className = "song-btn small-btn";
    button.type = "button";
    button.textContent = editing ? "Editar" : "+ Nuevo";
    toolbar.append(help, button);

    button.addEventListener("click", () => {
      details.open = !details.open;
      expandedByTab.set(tab, details.open);
      if (details.open) {
        requestAnimationFrame(() => form.querySelector("input,select,textarea")
          ?.focus({ preventScroll: true }));
      }
    });
    details.addEventListener("toggle", () => expandedByTab.set(tab, details.open));

    card.prepend(toolbar, details);
    details.append(summary, form);
  }

  window.ShalomAdminFormLayout = Object.freeze({
    captureFocus,
    enhanceForm,
    restoreFocus
  });
})();
