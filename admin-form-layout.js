(() => {
  const formInfo = {
    artists: { form: "#artistAdminForm", copy: "Agregar artista o ministerio" },
    categories: { form: "#categoryAdminForm", copy: "Agregar categoría o carpeta" },
    albums: { form: "#albumAdminForm", copy: "Agregar álbum o carpeta" },
    songs: { form: "#songAdminForm", copy: "Agregar canto, acordes, capo y enlaces" },
    donations: { form: "#donationAdminForm", copy: "Actualizar datos de apoyo" }
  };
  const editKey = { artists: "artist", categories: "category", albums: "album", songs: "song", donations: "donation" };

  function enhanceForm() {
    const tab = AP.tab;
    const info = formInfo[tab];
    if (!info) return;
    const form = document.querySelector(info.form);
    const card = form?.closest(".admin-card");
    if (!form || !card || card.dataset.visualPolished === "yes") return;

    card.dataset.visualPolished = "yes";
    const head = card.querySelector(".admin-editor-head");
    const title = head?.querySelector("h3")?.textContent?.trim() || (tab === "donations" ? "Editar donaciones" : "Nuevo registro");
    const editing = tab === "donations" ? Boolean(AP.donation?.id) : Boolean(AP.edits?.[editKey[tab]]);
    const details = document.createElement("details");
    details.className = "admin-form-collapsible";
    details.open = editing || Boolean(AP.visualForms[tab]);
    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.textContent = title;
    summary.append(label);

    const cancel = head?.querySelector("button");
    if (cancel) {
      cancel.addEventListener("click", (event) => event.stopPropagation());
      summary.append(cancel);
    }
    head?.remove();

    const toolbar = document.createElement("div");
    toolbar.className = "admin-form-toggle";
    toolbar.innerHTML = `<span>${editing ? "Edición en curso" : info.copy}</span><button class="song-btn small-btn" type="button">${editing ? "Editar" : "+ Nuevo"}</button>`;
    const trigger = toolbar.querySelector("button");
    trigger.addEventListener("click", () => {
      details.open = !details.open;
      AP.visualForms[tab] = details.open;
      if (details.open) requestAnimationFrame(() => form.querySelector("input,select,textarea")?.focus({ preventScroll: true }));
    });
    details.addEventListener("toggle", () => { AP.visualForms[tab] = details.open; });

    card.prepend(toolbar, details);
    details.append(summary, form);
  }

  window.ShalomAdminFormLayout = { enhance: enhanceForm };

  const boot = () => enhanceForm();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
