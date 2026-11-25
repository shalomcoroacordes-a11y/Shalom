/* Shared lifecycle for the two public-content editors. Views own their HTML. */
(() => {
  const missingTable = error => error?.code === "PGRST205" || /site_content|relation .*site_content/i.test(String(error?.message || ""));
  const waitFor = (promise, ms, message) => Promise.race([promise, new Promise((_, reject) => { setTimeout(() => reject(new Error(message)), ms); })]);
  const missingSave = "Falta ejecutar supabase-public-pages.sql en Supabase.";
  function create(options) {
    const { db, defaults, key, sectionId, tabId, formId, statusId, resetId, render, messages } = options;
    const $ = id => document.querySelector("#" + id);
    let mounted = null, current = { ...defaults };
    const isCurrent = section => Boolean(section && mounted === section && $(sectionId) === section && $(tabId)?.classList.contains("active"));
    const setStatus = (message, bad = false) => {
      const status = $(statusId);
      if (!status) return;
      status.textContent = message || "";
      status.style.color = bad ? "#ffb4b4" : "";
    };
    async function loadPage() {
      if (!db) throw new Error("No se pudo iniciar la conexión con Supabase.");
      const { data, error } = await waitFor(db.from("site_content").select("content").eq("content_key", key).maybeSingle(), 6500, messages.loadTimeout);
      if (error) throw error;
      return data?.content && typeof data.content === "object" ? { ...defaults, ...data.content } : { ...defaults };
    }
    function bind() {
      const section = mounted, form = $(formId);
      form?.addEventListener("submit", async event => {
        event.preventDefault();
        if (!isCurrent(section) || $(formId) !== form) return;
        const raw = Object.fromEntries(new FormData(form).entries());
        const content = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value || "").trim()]));
        setStatus("Guardando página…");
        try {
          const { error } = await waitFor(db.from("site_content").upsert({ content_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "content_key" }), 9000, messages.saveTimeout);
          if (!isCurrent(section) || $(formId) !== form) return;
          if (error) { setStatus(missingTable(error) ? missingSave : `No se pudo guardar: ${error.message}`, true); return; }
          current = { ...defaults, ...content };
          setStatus(messages.saved);
        } catch (error) {
          if (isCurrent(section) && $(formId) === form) setStatus(error.message || messages.saveError, true);
        }
      });
      $(resetId)?.addEventListener("click", () => {
        if (!isCurrent(section) || $(formId) !== form) return;
        current = { ...defaults };
        section.innerHTML = render(current);
        bind();
        setStatus("Texto inicial restaurado. Presiona Guardar página para publicarlo.");
      });
    }
    async function mount(view) {
      if (!view) return;
      current = { ...defaults };
      view.innerHTML = '<section class="admin-section" id="' + sectionId + '"></section>';
      const section = view.querySelector("#" + sectionId);
      mounted = section;
      section.innerHTML = render(current);
      bind();
      const initialForm = $(formId);
      let dirty = false;
      initialForm?.addEventListener("input", () => { dirty = true; });
      initialForm?.addEventListener("submit", () => { dirty = true; });
      setStatus("Cargando contenido guardado…");
      const canApply = () => isCurrent(section) && !dirty && $(formId) === initialForm;
      try {
        const stored = await loadPage();
        if (!canApply()) return;
        current = stored;
        section.innerHTML = render(current);
        bind();
        setStatus("Contenido guardado cargado.");
      } catch (error) {
        if (canApply()) setStatus(missingTable(error) ? messages.missingLoad : (error.message || messages.loadError), true);
      }
    }
    return { mount };
  }
  window.ShalomAdminContentEditor = Object.freeze({ create });
})();
